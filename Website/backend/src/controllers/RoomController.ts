import { Request, Response } from "express";
import { RoomService } from "../services/RoomService";

// Controller for room related http requests
// Delegates business logic to RoomService
export const RoomController = {

  /** 
  // GET /rooms
  // Reutrn all rooms in the database
  */
  async getAllRooms(req: Request, res: Response) {
    try {
      const rooms = await RoomService.getAllRooms();
      return res.status(200).json({ success: true, rooms });
    } catch {
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  },
  
  /**
   * GET /rooms/filter
   * Parse query parameters into typed filter object, call service and return results
  */
  async getRoomsByFilter(req: Request, res: Response) {
    try {
      const q = req.query;
      const params = {
        universityId: q.universityId ? Number(q.universityId) : undefined,
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

  /** 
   * GET /rooms/:id
  // Valid route param and fetch single room with id from req
  */
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