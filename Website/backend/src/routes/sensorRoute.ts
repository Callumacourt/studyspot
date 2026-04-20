import { SensorController } from "../controllers/SensorController";
import { Request, Response, Router } from "express";

const router = Router();

// Route for fetching sensor data by room ID 
router.get("/sensordata/:id", (req: Request, res: Response) => SensorController.getSensorData(req, res));

// Route for linking a sensor to a room
router.post('/link', (req: Request, res: Response) => {
    SensorController.linkSensorToRoom(req, res);
});

export default router;