import { prisma } from "../prisma";
import { buildMetricFilters, metricsMatchFilters, type RoomMetrics } from "../utils/RoomFilters";

type RoomFilterParams = {
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

// extract latest metric values from readings.
function extractMetrics(readings: any[]): RoomMetrics {
  const latest = new Map<string, number>();
  for (const r of readings) {
    if (!latest.has(r.metricType)) latest.set(r.metricType, r.value);
  }
  return {
    temperature: latest.get("TEMP") ?? null,
    humidity: latest.get("HUMIDITY") ?? null,
    occupancy: latest.get("OCCUPANCY") ?? null,
    noise: latest.get("NOISE") ?? null,
  };
}

export const RoomService = {
  async getAllRooms() {
    const rooms = await prisma.room.findMany({
      include: {
        building: true,
        readings: { orderBy: { time: "desc" }, take: 200 },
      },
    });

    return rooms.map((room) => ({
      id: room.id,
      name: room.name,
      building: room.building,
      metrics: extractMetrics(room.readings),
    }));
  },

  async getRoomsByFilter(params: RoomFilterParams) {
    const rooms = await prisma.room.findMany({
      where: {
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

    // build metric filters if provided (uses your existing utils)
    const metricFilters = buildMetricFilters({
      noise: params.noise,
      occupancy: params.occupancy,
      tempMin: params.tempMin,
      tempMax: params.tempMax,
      humidityMin: params.humidityMin,
      humidityMax: params.humidityMax,
    });

    return rooms
      .map((room) => ({
        id: room.id,
        name: room.name,
        building: room.building,
        metrics: extractMetrics(room.readings),
      }))
      .filter((r) => metricsMatchFilters(r.metrics, metricFilters));
  },

  async getRoomByName(roomName: string) {
    const room = await prisma.room.findFirst({
      where: { name: { equals: roomName, mode: "insensitive" } },
      include: {
        building: true,
        readings: { orderBy: { time: "desc" }, take: 200 },
      },
    });

    if (!room) return null;

    return {
      id: room.id,
      name: room.name,
      building: room.building,
      metrics: extractMetrics(room.readings),
    };
  },
};