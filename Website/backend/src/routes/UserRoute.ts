import { Router } from "express";
import { UserRoomController } from "../controllers/UserRoomController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/me/favourites", (req, res) => UserRoomController.getFavouriteRooms(req, res));

export default router;
