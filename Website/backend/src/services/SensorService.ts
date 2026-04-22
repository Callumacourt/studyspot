import { prisma } from "../prisma";
import type { Sensor } from "../generated/prisma/client";
import getTelemetry from "../utils/thingsboard";
import {
  METRIC_KEYS,
  METRIC_TYPE_MAP,
  normaliseTelemetry,
  THINGSBOARD_TELEMETRY_KEYS,
  type SensorData,
} from "../utils/sensorNormaliser";

function resolveDeviceId(sensor: Sensor): string | null {
  const realRoomSensorId = Number(process.env.REAL_ROOM_SENSOR_ID ?? 9);
  const realRoomDeviceId = process.env.REAL_ROOM_DEVICE_ID;

  if (sensor.sensorId === realRoomSensorId && realRoomDeviceId) {
    return realRoomDeviceId;
  }

  return sensor.deviceId;
}

function toNumericValue(value: number | boolean | string | null): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true") return 1;
    if (lower === "false") return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export const SensorService = {

  // Get data for a single sensor 
  async getSensorData(sensorId: number): Promise<SensorData> {
    // find sensor in database from id
    const sensor = await prisma.sensor.findUnique({ where: { sensorId } });
    if (!sensor) throw new Error("Sensor not found");
    const deviceId = resolveDeviceId(sensor);
    if (!deviceId) throw new Error("No ThingsBoard deviceId linked to sensor");

    // query thingsboard for telemetry belonging to that sensor id (for metric in metric keys)
    const data = await getTelemetry(deviceId, THINGSBOARD_TELEMETRY_KEYS, 1);
    return { sensorId: sensor.sensorId, deviceId, readings: normaliseTelemetry(data) };
  },

  // Get all sensor data for a room
  async getSensorDataByRoom(roomId: number): Promise<SensorData[]> {
    try {
      const sensors = await prisma.sensor.findMany({ where: { roomId } });
      if (sensors.length === 0) return [];

      const sensorsToQuery = sensors.filter((s: Sensor) => !!resolveDeviceId(s));
      if (sensorsToQuery.length === 0) return [];

      const settled = await Promise.allSettled(
        sensorsToQuery.map(async (s: Sensor) => {
          const deviceId = resolveDeviceId(s) as string;
          const data = await getTelemetry(deviceId, THINGSBOARD_TELEMETRY_KEYS, 1);
          return { sensorId: s.sensorId, deviceId, readings: normaliseTelemetry(data) };
        })
      );

      settled.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[SensorService] sensor ${sensorsToQuery[i].sensorId} failed:`, r.reason);
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
        const deviceId = resolveDeviceId(sensor);

        if (!deviceId) {
          console.warn(`[SensorService] Sensor ${sensor.sensorId} has no deviceId`);
          continue;
        }

        const readings = normaliseTelemetry(await getTelemetry(deviceId, THINGSBOARD_TELEMETRY_KEYS, 1));

        for (const reading of readings) {
          if (reading.timeseries.length === 0) continue; // no data
          const metricType = METRIC_TYPE_MAP[reading.metricKey];
          if (!metricType) continue;
          const { ts, value } = reading.timeseries[0];
          const numericValue = toNumericValue(value);
          if (numericValue === null) continue; // invalid format

          // add new entry to db 
          await prisma.sensorReading.create({
            data: {
              roomId,
              metricType,
              value: numericValue,
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


