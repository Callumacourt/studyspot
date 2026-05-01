import { SensorController } from "../controllers/SensorController";
import { Request, Response, Router } from "express";

const router = Router();
/**
 * Router: /sensors (mounted by app)
 * Exposes sensor-related endpoints used by the frontend:
 * - GET /sensordata/:id/occupancy-averages  -> hourly occupancy averages for charting
 * - GET /sensordata/:id                    -> recent sensor readings for a room
 * - POST /link                             -> associate an existing sensor with a room
 *
 * Each route delegates validation and business logic to SensorController.
 */

/** GET /sensordata/:id/occupancy-averages
 *  - req.params.id: room id (number)
 *  - returns 200 { success: true, data: [...] } or 400/500 on error
 */
router.get("/sensordata/:id/occupancy-averages", (req: Request, res: Response) => {
    SensorController.getOccupancyAvgs(req, res);
});

/** GET /sensordata/:id
 *  - Fetch sensor readings for a room by id.
 *  - Returns [] if room has no sensors (service returns null).
 */
router.get("/sensordata/:id", (req: Request, res: Response) => SensorController.getSensorData(req, res));

/** POST /link
 *  - Body: { sensorId, roomId }
 *  - Links an existing sensor to a room after validating presence/existence.
 */
router.post('/link', (req: Request, res: Response) => {
    SensorController.linkSensorToRoom(req, res);
});

export default router;