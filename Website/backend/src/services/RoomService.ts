import { prisma } from "../prisma";

export const RoomService = {
    async getAllRooms() {
        return await prisma.room.findMany({
            include: {
                building: {
                    include: {university : true}
                },
                sensors: true,
            }
        })
    }
}