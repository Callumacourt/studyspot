import { Request, Response } from "express";
import { RoomService } from "../services/RoomService";

export const RoomController = {
    async getRooms(_req: Request, res: Response) {
        try {
            const rooms = await RoomService.getAllRooms();

            const data = rooms.map((room) => ({
                id: room.id,
                name: room.roomName,
                building: room.building.name,
                university: room.building.university.name,
                location: room.location,
                temp: room.temperature,
                occupied: room.occupied,
                free: room.free,
                occupancyPercent: room.occupancyPercent,
                noise: room.noise,
                humidity: room.humidity,
                accessibility: room.accessibility,
            }));

            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch rooms",
            });
        }
    },
};
