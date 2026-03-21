import { SensorController } from "../controllers/SensorController";
import { Request, Response, Router } from "express";

const router = Router();

router.get('/sensordata/:roomId', (req: Request, res: Response) => {
    const roomId = parseInt(req.params.roomId as string, 10);
    SensorController.getSensorData(roomId, req, res)
});

export default router;