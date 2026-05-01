import { Router } from "express";
import { RoomController } from "../controllers/RoomController";
import { UserRoomController } from "../controllers/UserRoomController";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * Router: /rooms
 * - GET /           : return all rooms (used for listings)
 * - GET /filter     : return rooms matching query filters (search/filter UI)
 * - GET /:id        : return a single room by numeric id (404 if not found)
 *
 * Each route delegates parsing/validation/logic to RoomController and
 * maps HTTP requests to service layer behaviour.
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