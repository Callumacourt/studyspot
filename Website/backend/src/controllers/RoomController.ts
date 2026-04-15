import { Request, Response } from "express";
import { RoomService } from "../services/RoomService";

export const RoomController = {
    async getAllRooms(req: Request, res: Response) {
        try {
            const rooms = await RoomService.getAllRooms();
            return res.status(200).json({ success: true, rooms });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        }
    }
};