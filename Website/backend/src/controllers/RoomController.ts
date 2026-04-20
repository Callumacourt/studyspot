import { Request, Response } from "express";
import { RoomService } from "../services/RoomService";

export const RoomController = {
  async getAllRooms(req: Request, res: Response) {
    try {
      const rooms = await RoomService.getAllRooms();
      return res.status(200).json({ success: true, rooms });
    } catch {
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  },

  async getRoomsByFilter(req: Request, res: Response) {
    try {
      const q = req.query;
      const params = {
        buildingId: q.buildingId ? Number(q.buildingId) : undefined,
        noise: q.noise ? String(q.noise) : undefined,
        occupancy: q.occupancy ? String(q.occupancy) : undefined,
        tempMin: q.tempMin ? Number(q.tempMin) : undefined,
        tempMax: q.tempMax ? Number(q.tempMax) : undefined,
        humidityMin: q.humidityMin ? Number(q.humidityMin) : undefined,
        humidityMax: q.humidityMax ? Number(q.humidityMax) : undefined,
        wheelchairAccessible: q.wheelchairAccessible === "true" ? true : undefined,
        hasAdjustableDesks: q.hasAdjustableDesks === "true" ? true : undefined,
        groundFloor: q.groundFloor === "true" ? true : undefined,
        hearingAssistance: q.hearingAssistance === "true" ? true : undefined,
        name: q.name ? String(q.name).trim() || undefined : undefined,
      };

      const rooms = await RoomService.getRoomsByFilter(params);
      return res.status(200).json({ success: true, rooms });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  async getRoomById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ success: false, error: "Invalid room id" });

      const room = await RoomService.getRoomById(id);
      if (!room) return res.status(404).json({ success: false, error: "Room not found" });

      return res.status(200).json({ success: true, room });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};