import { Router } from "express";
import { RoomController } from "../controllers/RoomController";

const router = Router();

router.get("/rooms", (req, res) => {
    RoomController.getRooms(req, res);
});

export default router;
