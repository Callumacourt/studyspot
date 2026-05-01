import { Router } from "express";
import { UserRoomController } from "../controllers/UserRoomController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/me/favourites", (req, res) => UserRoomController.getFavouriteRooms(req, res));
router.get("/me/bookings",   (req, res) => UserRoomController.getMyBookings(req, res));
router.delete("/bookings/:bookingId/cancel", (req, res) => UserRoomController.cancelBooking(req, res));

export default router;
