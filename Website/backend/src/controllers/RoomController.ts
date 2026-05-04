/**
 * RoomController
 * 
 * HTTP request handler for room-related endpoints.
 * Responsibilities:
 * - Parse and validate query/path parameters from HTTP requests.
 * - Transform raw request data into typed service method inputs.
 * - Handle HTTP response codes and error responses.
 * - Delegate business logic to RoomService layer.
 * 
 * All methods follow this pattern:
 * 1. Extract and validate parameters
 * 2. Call RoomService method
 * 3. Return 200/201 on success, 400/404/409 on client error, 500 on server error
 * 
 * @module RoomController
 */

import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { RoomService } from "../services/RoomService";

/**
 * RoomController object with request handlers.
 */
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
   * GET /rooms
   * 
   * Fetch all rooms with latest sensor metrics.
   * No filtering applied; returns entire database catalog.
   * 
   * Response:
   * - 200: {success: true, rooms: Room[]} with metrics included
   * - 500: Server error during fetch
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
   * 
   * Search rooms by combined static and metric-based filters.
   * 
   * Query parameters (all optional):
   * - universityId (int): filter by university
   * - buildingId (int): filter by building
   * - noise (string): "QUIET", "MODERATE", "LOUD" (metric filter)
   * - occupancy (string): "EMPTY", "LIGHT", "MODERATE+" (metric filter)
   * - tempMin/tempMax (float): temperature range in Celsius
   * - humidityMin/humidityMax (float): humidity range in %
   * - wheelchairAccessible (bool): "true"/"false"
   * - hasAdjustableDesks (bool): "true"/"false"
   * - groundFloor (bool): "true"/"false"
   * - hearingAssistance (bool): "true"/"false"
   * - name (string): partial room name match (case-insensitive)
   * 
   * Response:
   * - 200: {success: true, rooms: Room[]} matching filters
   * - 400: Invalid query parameters
   * - 500: Server error
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
   * 
   * Fetch a single room by numeric id.
   * Includes building info, latest sensor readings, and metrics.
   * 
   * Path parameters:
   * - id (int): room database id
   * 
   * Response:
   * - 200: {success: true, room: Room} with all room details and metrics
   * - 400: Invalid id parameter (non-numeric)
   * - 404: Room not found
   * - 500: Server error
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