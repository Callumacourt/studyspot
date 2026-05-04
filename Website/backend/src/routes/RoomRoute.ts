/**
 * Room Routes Module
 * 
 * Handles all HTTP endpoints related to study room discovery, booking, and management.
 * Mounted at `/api/rooms` in main Express app.
 * 
 * Route categories:
 * 1. **Listing/Discovery**: GET /, GET /filter, GET /:id — browse and filter available rooms
 * 2. **Favourites**: GET/POST/DELETE /:id/favourite — user-personalized room lists (auth required)
 * 3. **Bookings**: GET /:id/bookings, POST /:id/book — reserve time slots (booking required auth)
 * 4. **Reports**: POST /:id/reports — submit issues about rooms (auth required)
 * 
 * All routes delegate business logic to controllers/services; this module handles:
 * - Route definition and method binding
 * - Request/response HTTP semantics
 * - Auth middleware application
 */

import { Router } from "express";
import { RoomController } from "../controllers/RoomController";
import { UserRoomController } from "../controllers/UserRoomController";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * Router: /api/rooms
 * 
 * Endpoint summary:
 * - GET /                : get all rooms with latest sensor metrics
 * - GET /filter          : search/filter rooms by accessibility, environment, building, etc.
 * - GET /:id             : get single room detail (404 if not found)
 * - GET /:id/favourite   : check if room is in user's favourites (auth required)
 * - POST /:id/favourite  : add room to favourites (auth required)
 * - DELETE /:id/favourite: remove room from favourites (auth required)
 * - POST /:id/reports    : submit accessibility/safety report (auth required)
 * - GET /:id/bookings    : get existing reservations for a date (YYYY-MM-DD query param)
 * - POST /:id/book       : create new reservation (auth required, time range validation)
 * 
 * All controllers delegate to service layer for business logic.
 * Auth middleware (`requireAuth`) enforces JWT validation on protected routes.
 */
router.get("/", (req, res) => RoomController.getAllRooms(req, res));
router.get("/filter", (req, res) => RoomController.getRoomsByFilter(req, res));
router.get("/:id/favourite", requireAuth, (req, res) => UserRoomController.getFavouriteStatus(req, res));
router.post("/:id/favourite", requireAuth, (req, res) => UserRoomController.addFavourite(req, res));
router.delete("/:id/favourite", requireAuth, (req, res) => UserRoomController.removeFavourite(req, res));
router.post("/:id/reports", requireAuth, (req, res) => UserRoomController.reportRoom(req, res));
router.get("/:id/bookings", (req, res) => RoomController.getBookings(req, res));
router.post("/:id/book", requireAuth, (req, res) => RoomController.bookRoom(req, res));
router.get("/:id", (req, res) => RoomController.getRoomById(req, res));

export default router;