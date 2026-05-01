import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { RoomService } from "../services/RoomService";

// Controller for room related http requests
// Delegates business logic to RoomService
export const RoomController = {

  /**
   * GET /rooms/:id/bookings?date=YYYY-MM-DD
   * Returns existing bookings for a room on a given date so the frontend
   * can grey out unavailable slots.
   */
  async getBookings(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ success: false, error: "Invalid room id" });

      const dateStr = String(req.query.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
        return res.status(400).json({ success: false, error: "date query param required (YYYY-MM-DD)" });

      const bookings = await RoomService.getBookingsForDate(id, dateStr);
      return res.status(200).json({ success: true, bookings });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /rooms/:id/book
   * body: { startTime: ISO string, endTime: ISO string }
   * Requires authentication — links booking to the requesting user.
   */
  async bookRoom(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ success: false, error: "Invalid room id" });

      const { startTime, endTime } = req.body;
      if (!startTime || !endTime)
        return res.status(400).json({ success: false, error: "startTime and endTime are required" });

      const start = new Date(startTime);
      const end   = new Date(endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime()))
        return res.status(400).json({ success: false, error: "Invalid startTime or endTime" });

      const userId = (req as AuthenticatedRequest).auth?.userId;
      const booking = await RoomService.bookRoom(id, start, end, userId);
      return res.status(201).json({ success: true, booking });
    } catch (error: any) {
      const status = error.message?.includes("not bookable") || error.message?.includes("conflicts") ? 409 : 500;
      return res.status(status).json({ success: false, error: error.message });
    }
  },

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