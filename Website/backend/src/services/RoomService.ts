import { Sensor } from "../generated/prisma/client";
import { prisma } from "../prisma";

export const RoomService = {
    async getAllRooms() {
        const rooms = await prisma.room.findMany({
            include: {
                building: true,
                sensors: {
                    include: {
                        sensorReadings: {
                            orderBy: { createdAt: "desc" },
                            take: 1,
                        },
                    },
                },
            },
        });

        return rooms.map((room: typeof rooms[number]) => {
            const latestReading = room.sensors
                .flatMap((sensor : Sensor) => sensor.sensorReadings())
                .sort(
                    (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];

            return {
                id: room.id,
                name: room.name,
                building: room.buildingId,
                metrics: latestReading
                    ? {
                          temperature: latestReading.temperature,
                          humidity: latestReading.humidity,
                          occupancy: latestReading.occupancy,
                      }
                    : null,
            };
        });
    },
};