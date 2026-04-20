import { prisma } from "../prisma";
import type { Sensor } from "../generated/prisma/client";
import getTelemetry from "../utils/thingsboard";
import {
  METRIC_KEYS,
  METRIC_TYPE_MAP,
  normaliseTelemetry,
  type SensorData,
} from "../utils/sensorNormaliser";

export const SensorService = {

  // Get data for a single sensor 
  async getSensorData(sensorId: number): Promise<SensorData> {
    // find sensor in database from id
    const sensor = await prisma.sensor.findUnique({ where: { sensorId } });
    if (!sensor) throw new Error("Sensor not found");
    if (!sensor.deviceId) throw new Error("No ThingsBoard deviceId linked to sensor");

    // query thingsboard for telemetry belonging to that sensor id (for metric in metric keys)
    const data = await getTelemetry(sensor.deviceId, METRIC_KEYS, 1);
    return { sensorId: sensor.sensorId, deviceId: sensor.deviceId, readings: normaliseTelemetry(data) };
  },

  // Get all sensor data for a room
  async getSensorDataByRoom(roomId: number): Promise<SensorData[]> {
    try {
      const sensors = await prisma.sensor.findMany({ where: { roomId } });
      if (sensors.length === 0) return [];

      const sensorsWithDevice = sensors.filter((s: Sensor) => !!s.deviceId);
      if (sensorsWithDevice.length === 0) return [];

      const settled = await Promise.allSettled(
        sensorsWithDevice.map(async (s: Sensor) => {
          const data = await getTelemetry(s.deviceId as string, METRIC_KEYS, 1);
          return { sensorId: s.sensorId, deviceId: s.deviceId, readings: normaliseTelemetry(data) };
        })
      );

      settled.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[SensorService] sensor ${sensorsWithDevice[i].sensorId} failed:`, r.reason);
        }
      });

      return settled
        .filter((r): r is PromiseFulfilledResult<SensorData> => r.status === "fulfilled")
        .map((r) => r.value);

    } catch (error) {
      console.error("[SensorService] getSensorDataByRoom failed:", error);
      return []; // no data
    }
  },

  // save sensor reading to the database (for dashboard)
  async saveSensorReadings(roomId: number): Promise<void> {
    const sensors = await prisma.sensor.findMany({ where: { roomId } });
    if (sensors.length === 0) {
      console.warn(`[SensorService] No sensors found for room ${roomId}`);
      return;
    }

    for (const sensor of sensors) {
      try {
        if (!sensor.deviceId) {
          console.warn(`[SensorService] Sensor ${sensor.sensorId} has no deviceId`);
          continue;
        }

        const readings = normaliseTelemetry(await getTelemetry(sensor.deviceId, METRIC_KEYS, 1));

        for (const reading of readings) {
          if (reading.timeseries.length === 0) continue; // no data
          const { ts, value } = reading.timeseries[0];
          if (typeof value !== "number") continue; // invalid format

          // add new entry to db
          await prisma.sensorReading.create({
            data: {
              roomId,
              metricType: METRIC_TYPE_MAP[reading.metricKey],
              value,
              time: new Date(ts),
            },
          });
        }

        console.log(`[SensorService] Saved readings for sensor ${sensor.sensorId} in room ${roomId}`);
      } catch (error) {
        console.error(`[SensorService] Failed for sensor ${sensor.sensorId}:`, error);
      }
    }
  },

  // sync sensor readings across all rooms
  async syncAllSensors(): Promise<void> {
    const rooms = await prisma.room.findMany();
    console.log(`[SensorService] Syncing ${rooms.length} rooms...`);
    for (const room of rooms) {
      await this.saveSensorReadings(room.id);
    }
    console.log("[SensorService] Sync complete");
  },
};


