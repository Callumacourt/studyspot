import { prisma } from "../prisma";
import { buildMetricFilters, metricsMatchFilters, type RoomMetrics } from "../utils/RoomFilters";
import { extractMetrics, mapRoomWithMetrics } from "./roomMappers";

// All potential parameters a roomfilter query can recieve, all are optional
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

// Service for fetching rooms and their latest sensor metrics.
// - Queries prisma for rooms + recent readings, then extracts usable metrics.
// - Provides search/filter helper used by API routes
export const RoomService = {

 // Return all rooms with building info and latest metrics.
  // Limits readings fetched per room to recent 200 for performance.
  async getAllRooms() {
    const rooms = await prisma.room.findMany({
      include: {
        building: true,
        readings: { orderBy: { time: "desc" }, take: 200 }, // last 200 sensor readings sorted by latest
      },
    });

    return rooms.map((room) => mapRoomWithMetrics(room));
  },

  // Search rooms by provided filters (both static room fields and metric filters).
  // Metric filters are applied in memory after fetching recent readings.
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

  // Find a room by name (case insensitive) or null if not found
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

  // Fetch a single room by numeric id, return null if missing.
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
};