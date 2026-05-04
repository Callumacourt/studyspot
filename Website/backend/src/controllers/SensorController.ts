/**
 * SensorController
 *
 * HTTP layer for sensor telemetry endpoints.
 * - Validates request inputs.
 * - Delegates data retrieval/persistence logic to SensorService.
 * - Shapes consistent API responses for frontend consumers.
 */
import { Request, Response } from "express";
import { prisma } from "../prisma";
import { SensorService } from "../services/SensorService";

export const SensorController = {
  /**
  * GET /api/sensordata/:id
  * Validate room id and return latest telemetry per sensor for that room.
  * Returns empty data array when room has no linked sensors.
   */
  async getSensorData(req: Request, res: Response) {
    try {
      const roomId = Number(req.params.id);

      if (!roomId || !Number.isInteger(roomId))
        return res.status(400).json({ success: false, error: "Valid room ID is required" });

      const readings = await SensorService.getSensorDataByRoom(roomId);

      // null/empty means no sensors — return success with empty data set.
      if (!readings) return res.status(200).json({ success: true, data: [] });

      return res.status(200).json({ success: true, data: readings });
    } catch (error: any) {
      console.error("[SensorController] getSensorData error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },


  /**
  * POST /api/link
   * Link an existing sensor to a room.
   * - body: { sensorId, roomId }
   * - Validates presence and existence of sensor & room, updates sensor.roomId
   */
  async linkSensorToRoom(req: Request, res: Response) {
    try {
      const { sensorId, roomId } = req.body;
      
      if (!sensorId || !roomId) {
        return res.status(400).json({ success: false, error: "sensorId and roomId required" });
      }

      const sensor = await prisma.sensor.findUnique({ where: { sensorId } });
      if (!sensor) {
        return res.status(404).json({ success: false, error: "Sensor not found" });
      }

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) {
        return res.status(404).json({ success: false, error: "Room not found" });
      }

      const updated = await prisma.sensor.update({
        where: { sensorId },
        data: { roomId },
      });

      return res.status(200).json({ success: true, sensor: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
  * GET /api/sensordata/:id/occupancy-averages
  * Return 24-slot hourly occupancy averages used by busy-times chart.
   */
  async getOccupancyAvgs(req: Request, res: Response) {
    try {
      const roomId = Number(req.params.id);
      if (!roomId || !Number.isInteger(roomId)) {
        return res.status(400).json({ success: false, error: `Invalid roomId: ${roomId}`})
      }

      const averages = await SensorService.getHourlyOccupancyAvg(roomId);
      return res.status(200).json({success: true, data: averages});
    } catch (error: any) {
      console.error("[SensorController] getOccupancyAverages error:", error);
      return res.status(500).json({success: false, error: error.message});
    }
  }
};

