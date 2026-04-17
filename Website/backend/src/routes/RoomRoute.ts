import { Router } from "express";
import { RoomController } from "../controllers/RoomController";

const router = Router();

router.get("/", (req, res) => {
  RoomController.getAllRooms(req, res);
});

router.get("/filter", (req, res) => {
  RoomController.getRoomsByFilter(req, res);
});

export default router;