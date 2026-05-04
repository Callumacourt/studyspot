/**
 * RoomService
 *
 * Business-layer operations for room discovery and booking.
 *
 * Key responsibilities:
 * - Fetch room entities with building context and latest telemetry-derived metrics.
 * - Apply combined static filters (DB-side) and metric filters (in-memory).
 * - Validate and create bookings with overlap and duration checks.
 */
import { prisma } from "../prisma";
import { buildMetricFilters, metricsMatchFilters, type RoomMetrics } from "../utils/RoomFilters";
import {  mapRoomWithMetrics } from "./roomMappers";

// Supported room filter inputs (all optional) passed from controller/query params.
type RoomFilterParams = {
  universityId?: number;
  buildingId?: number;
  wheelchairAccessible?: boolean;
  hasAdjustableDesks?: boolean;
  groundFloor?: boolean;
  hearingAssistance?: boolean;
  noise?: string;
  occupancy?: string;
  tempMin?: number;
  tempMax?: number;
  humidityMin?: number;
  humidityMax?: number;
  name?: string;
};

export const RoomService = {

  /**
   * Return all rooms with building info and latest metrics.
   *
   * Implementation detail:
   * - Fetches up to 200 latest readings per room to keep payloads bounded while
   *   still producing stable metric snapshots.
   */
  async getAllRooms() {
    const rooms = await prisma.room.findMany({
      include: {
        building: true,
        readings: { orderBy: { time: "desc" }, take: 200 }, // last 200 sensor readings sorted by latest
      },
    });

    return rooms.map((room) => mapRoomWithMetrics(room));
  },

  /**
   * Search rooms by provided filters.
   *
   * Filter pipeline:
   * 1) DB-side filtering for static fields (building, accessibility, name).
   * 2) Mapping to derived `metrics` shape.
   * 3) In-memory metric filtering (noise/occupancy/temp/humidity ranges).
   */
  async getRoomsByFilter(params: RoomFilterParams) {
    const rooms = await prisma.room.findMany({
      where: {
        ...(params.universityId && { building: { universityId: params.universityId } }),
        ...(params.buildingId && { buildingId: params.buildingId }),
        ...(params.wheelchairAccessible !== undefined && { wheelchairAccessible: params.wheelchairAccessible }),
        ...(params.hasAdjustableDesks !== undefined && { hasAdjustableDesks: params.hasAdjustableDesks }),
        ...(params.groundFloor !== undefined && { groundFloor: params.groundFloor }),
        ...(params.hearingAssistance !== undefined && { hearingAssistance: params.hearingAssistance }),
        ...(params.name && { name: { contains: params.name, mode: "insensitive" } }),
      },
      include: {
        building: true,
        readings: { orderBy: { time: "desc" }, take: 200 },
      },
    });

    const metricFilters = buildMetricFilters({
      noise: params.noise,
      occupancy: params.occupancy,
      tempMin: params.tempMin,
      tempMax: params.tempMax,
      humidityMin: params.humidityMin,
      humidityMax: params.humidityMax,
    });

    return rooms
      .map((room) => mapRoomWithMetrics(room))
      .filter((r) => metricsMatchFilters(r.metrics, metricFilters));
  },

  /** Find a room by case-insensitive name or return `null`. */
  async getRoomByName(roomName: string) {
    const room = await prisma.room.findFirst({
      where: { name: { equals: roomName, mode: "insensitive" } },
      include: {
        building: true,
        readings: { orderBy: { time: "desc" }, take: 200 },
      },
    });

    if (!room) return null;

    return mapRoomWithMetrics(room);
  },

  /** Fetch one room by numeric id, return `null` when not found. */
  async getRoomById(id: number) {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        building: true,
        readings: { orderBy: { time: "desc" }, take: 200 },
      },
    });

    if (!room) return null;

    return mapRoomWithMetrics(room);
  },

  /**
   * Check whether a desired booking range is available.
   *
   * Rules:
   * - start must be before end.
   * - room must exist and be marked `bookable`.
   * - overlapping non-cancelled bookings block availability.
   */
  async checkRoomAvailability(roomId: number, desiredStartHour: Date, desiredEndHour: Date) {
    if (desiredStartHour >= desiredEndHour) throw new Error("Invalid time range");

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { bookings: true },
    });

    if (!room) throw new Error("Invalid roomId");

    if (!room.bookable) return false;

    const overlapping = (room.bookings || []).some((b) => {
      if (!b.startTime || !b.endTime) return false;
      if (b.status === "CANCELLED") return false;

      return b.startTime < desiredEndHour && b.endTime > desiredStartHour;
    });
    return !overlapping;
  },

  /**
   * Return active bookings intersecting a given calendar date (UTC day window).
   * Used by frontend slot grids and busy-time overlays.
   */
  async getBookingsForDate(roomId: number, dateStr: string) {
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`);

    return prisma.roomBooking.findMany({
      where: {
        roomId,
        status: { not: "CANCELLED" },
        startTime: { lte: dayEnd },
        endTime:   { gte: dayStart },
      },
      select: { id: true, startTime: true, endTime: true, status: true },
      orderBy: { startTime: "asc" },
    });
  },

  /**
   * Create a confirmed booking after validating range, room flags, max duration,
   * and overlap conflicts.
   */
  async bookRoom(roomId: number, startTime: Date, endTime: Date, bookedByUserId?: number) {
    if (startTime >= endTime) throw new Error("Invalid time range");

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new Error("Invalid roomId");
    if (!room.bookable) throw new Error("Room is not bookable");

    if (room.maxBookingDurationMinutes) {
      const durationMins = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      if (durationMins > room.maxBookingDurationMinutes) {
        throw new Error("Requested booking exceeds maximum booking duration");
      }
    }

    const available = await this.checkRoomAvailability(roomId, startTime, endTime);
    if (!available) throw new Error("Requested booking conflicts with an existing booking");

    const data: any = {
      roomId,
      startTime,
      endTime,
      status: "CONFIRMED",
    };
    if (typeof bookedByUserId === "number") data.bookedByUserId = bookedByUserId;

    const created = await prisma.roomBooking.create({
      data,
    });

    return created;
  },
};