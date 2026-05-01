import { Router } from "express";
import { RoomController } from "../controllers/RoomController";

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
router.get("/:id", (req, res) => RoomController.getRoomById(req, res)); 

export default router;