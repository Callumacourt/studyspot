import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export const RoomService = {
    async getAllRooms() {
        return prisma.room.findMany({
            include: {
                building: {
                    include: {
                        university: true,
                    },
                },
            },
            orderBy: [
                { building: { name: "asc" } },
                { roomName: "asc" },
            ],
        });
    },
};
