import { Request, Response } from "express";
import { SensorService } from "../services/SensorService";

export const SensorController = {
    async getSensorData(roomId: number, req: Request, res: Response) {
        try {
            if (!roomId) return res.status(400).json({ success: false, error: "Room ID is required" });
            if (!Number.isInteger(roomId)) return res.status(400).json({ success: false, error: "Room ID must be an integer" });

            const readings = await SensorService.getSensorDataByRoom(roomId);
            res.status(200).json({ success: true, data: readings });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

