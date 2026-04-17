import { Request, Response } from "express";
import { prisma } from "../prisma";
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
    },


    // needs to be called on each sensor before used in db
    async linkSensorToRoom(req: Request, res: Response) {
        try {
            const { sensorId, roomId } = req.body;
            
            if (!sensorId || !roomId) {
                return res.status(400).json({ success: false, error: "sensorId and roomId required" });
            }

            const sensor = await prisma.sensor.findUnique({ where: { sensorId } });
            if (!sensor) {
                return res.status(404).json({ success: false, error: "Sensor not found" });
            }

            const room = await prisma.room.findUnique({ where: { id: roomId } });
            if (!room) {
                return res.status(404).json({ success: false, error: "Room not found" });
            }

            const updated = await prisma.sensor.update({
                where: { sensorId },
                data: { roomId },
            });

            return res.status(200).json({ success: true, sensor: updated });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },
};

