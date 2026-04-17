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
      },
      include: {
        building: true,
        readings: { orderBy: { time: "desc" }, take: 200 },
      },
    });

    const filters = buildMetricFilters(params);

    const mapped = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      building: room.building,
      metrics: extractMetrics(room.readings),
    }));

    const result = mapped.filter((room) => metricsMatchFilters(room.metrics, filters));
    return result;
  },
};