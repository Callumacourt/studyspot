import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireAdmin());

router.get("/summary", (req, res) => AdminController.getSummary(req, res));

router.get("/universities", (req, res) => AdminController.getUniversities(req, res));
router.post("/universities", (req, res) => AdminController.createUniversity(req, res));
router.patch("/universities/:id", (req, res) => AdminController.updateUniversity(req, res));
router.delete("/universities/:id", (req, res) => AdminController.deleteUniversity(req, res));

router.get("/buildings", (req, res) => AdminController.getBuildings(req, res));
router.post("/buildings", (req, res) => AdminController.createBuilding(req, res));
router.patch("/buildings/:id", (req, res) => AdminController.updateBuilding(req, res));
router.delete("/buildings/:id", (req, res) => AdminController.deleteBuilding(req, res));

router.get("/rooms", (req, res) => AdminController.getRooms(req, res));
router.post("/rooms", (req, res) => AdminController.createRoom(req, res));
router.patch("/rooms/:id", (req, res) => AdminController.updateRoom(req, res));
router.delete("/rooms/:id", (req, res) => AdminController.deleteRoom(req, res));

router.get("/users", (req, res) => AdminController.getUsers(req, res));
router.patch("/users/:id/role", (req, res) => AdminController.updateUserRole(req, res));

export default router;
