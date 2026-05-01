import { prisma } from "../prisma";
import type { Sensor } from "../generated/prisma/client";
import getTelemetry from "../utils/thingsboard";

import { 
  resolveDeviceId,
  isPlaceholderDevice, 
  getLatestDBReadings, 
  toNumericValue 
} from "../utils/sensorHelpers";

import {
  METRIC_TYPE_MAP,
  normaliseTelemetry,
  THINGSBOARD_TELEMETRY_KEYS,
  type SensorData,
} from "../utils/sensorNormaliser";

/**
 * SensorService
 * Handles fetching, normalising, and persisting sensor telemetry.
 * - Real devices: read from ThingsBoard
 * - Placeholder/fake devices: read latest persisted DB values
 */
export const SensorService = {

  /** Get latest telemetry for a single sensor by sensorId. */
  async getSensorData(sensorId: number): Promise<SensorData> {
    // Resolve sensor + linked device
    const sensor = await prisma.sensor.findUnique({ where: { sensorId } });
    if (!sensor) throw new Error("Sensor not found");

    const deviceId = resolveDeviceId(sensor);
    if (!deviceId) throw new Error("No ThingsBoard deviceId linked to sensor");

    // Fetch telemetry and convert to frontend-safe shape
    const data = await getTelemetry(deviceId, THINGSBOARD_TELEMETRY_KEYS, 1);
    return { sensorId: sensor.sensorId, deviceId, readings: normaliseTelemetry(data) };
  },

  /**
   * Get latest telemetry for all sensors in a room.
   * - Returns [] if room has no sensors.
   * - Uses DB fallback for placeholder/missing device IDs.
   * - Continues when individual sensors fail (allSettled).
   */
  async getSensorDataByRoom(roomId: number): Promise<SensorData[]> {
    try {
      const sensors = await prisma.sensor.findMany({ where: { roomId } });
      if (sensors.length === 0) return [];

      const settled = await Promise.allSettled(
        sensors.map(async (s: Sensor) => {
          const deviceId = resolveDeviceId(s);

          // Fake/placeholder sensor -> use latest persisted DB readings
          if (!deviceId || isPlaceholderDevice(deviceId)) {
            return getLatestDBReadings(roomId, s.sensorId, deviceId ?? "");
          }

          // Real sensor -> pull from ThingsBoard
          const data = await getTelemetry(deviceId, THINGSBOARD_TELEMETRY_KEYS, 1);
          return { sensorId: s.sensorId, deviceId, readings: normaliseTelemetry(data) };
        })
      );

      // Log failed sensors but still return successful ones
      settled.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[SensorService] sensor ${sensors[i].sensorId} failed:`, r.reason);
        }
      });

      return settled
        .filter((r): r is PromiseFulfilledResult<SensorData> => r.status === "fulfilled")
        .map((r) => r.value);

    } catch (error) {
      console.error("[SensorService] getSensorDataByRoom failed:", error);
      return [];
    }
  },

  /**
   * Persist latest telemetry for each real sensor in a room.
   * Skips placeholder devices and non-numeric values.
   */
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

        // Placeholder sensors are seeded, not pulled from ThingsBoard
        if (isPlaceholderDevice(deviceId)) continue;

        const readings = normaliseTelemetry(await getTelemetry(deviceId, THINGSBOARD_TELEMETRY_KEYS, 1));

        for (const reading of readings) {
          if (reading.timeseries.length === 0) continue;

          const metricType = METRIC_TYPE_MAP[reading.metricKey];
          if (!metricType) continue;

          const { ts, value } = reading.timeseries[0];
          const numericValue = toNumericValue(value);
          if (numericValue === null) continue;

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

  /** Run reading persistence across all rooms (scheduled sync job). */
  async syncAllSensors(): Promise<void> {
    const rooms = await prisma.room.findMany();
    console.log(`[SensorService] Syncing ${rooms.length} rooms...`);

    for (const room of rooms) {
      await this.saveSensorReadings(room.id);
    }

    console.log("[SensorService] Sync complete");
  },

  /**
   * Return hourly average occupancy for the last `days` days.
   * Output is always 24 items (index = hour 0..23).
   */
  async getHourlyOccupancyAvg(roomId: number, days = 14): Promise<number[]> {
    const rows: { hour: number; avg: number }[] = await prisma.$queryRaw`
      SELECT (EXTRACT(HOUR FROM time AT TIME ZONE 'UTC'))::int AS hour,
             AVG(value) AS avg
      FROM "SensorReading"
      WHERE "roomId" = ${roomId}
        AND "metricType" = 'OCCUPANCY'
        AND time >= NOW() - (${days} * INTERVAL '1 day')
      GROUP BY hour
      ORDER BY hour;
    `;

    const result = new Array(24).fill(0);
    for (const r of rows) result[r.hour] = Number(r.avg ?? 0);
    return result;
  },
};


