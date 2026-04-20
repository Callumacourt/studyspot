import { Router } from "express";
import { RoomController } from "../controllers/RoomController";

const router = Router();

router.get("/", (req, res) => RoomController.getAllRooms(req, res));
router.get("/filter", (req, res) => RoomController.getRoomsByFilter(req, res));
router.get("/:id", (req, res) => RoomController.getRoomById(req, res)); // add this

export default router;