import { prisma } from "../prisma";

export const RoomService = {
  async getAllRooms() {
    const rooms = await prisma.room.findMany({
      include: {
        building: true,
        readings: {
          orderBy: { time: "desc" },
          take: 50, 
        },
      },
    });

    return rooms.map((room) => {
      const latestByMetric = new Map<string, number>();

      for (const r of room.readings) {
        if (!latestByMetric.has(r.metricType)) {
          latestByMetric.set(r.metricType, r.value);
        }
      }

      return {
        id: room.id,
        name: room.name,
        building: room.buildingId,
        metrics: {
          temperature: latestByMetric.get("TEMP") ?? null,
          humidity: latestByMetric.get("HUMIDITY") ?? null,
          occupancy: latestByMetric.get("OCCUPANCY") ?? null,
          noise: latestByMetric.get("NOISE") ?? null,
        },
      };
    });
  },
};