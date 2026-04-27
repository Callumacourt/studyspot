import { prisma } from "../prisma";
import type { MetricType, Sensor } from "../generated/prisma/client";
import getTelemetry from "../utils/thingsboard";
import {
  DB_METRIC_KEY_MAP,
  METRIC_TYPE_MAP,
  normaliseTelemetry,
  THINGSBOARD_TELEMETRY_KEYS,
  type NormalisedPoint,
  type SensorData,
} from "../utils/sensorNormaliser";

function resolveDeviceId(sensor: Sensor): string | null {
  const realRoomSensorId = Number(process.env.REAL_ROOM_SENSOR_ID ?? 9);
  const realRoomId = Number(process.env.REAL_ROOM_ID ?? 9);
  const realRoomDeviceId = process.env.REAL_ROOM_DEVICE_ID;

  if (sensor.sensorId === realRoomSensorId && realRoomDeviceId) {
    return realRoomDeviceId;
  }

  // Fallback for seeded data where sensor ids can shift but the real room id is stable.
  if (sensor.roomId === realRoomId && realRoomDeviceId) {
    return realRoomDeviceId;
  }

  return sensor.deviceId;
}

function toNumericValue(value: number | boolean | string | null): number | null {
  if (typeof value === "number") return value;
  // Treat booleans and boolean-like strings as non-numeric telemetry
  if (typeof value === "boolean") return null;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "false") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function isPlaceholderDevice(deviceId: string | null): boolean {
  return !deviceId || /^TB_DEVICE_UUID_/i.test(deviceId);
}

async function getLatestDBReadings(roomId: number, sensorId: number, deviceId: string): Promise<SensorData> {
  const metricTypes = Object.keys(DB_METRIC_KEY_MAP) as MetricType[];
  const now = new Date();

  const rows = await Promise.all(
    metricTypes.map((metricType) =>
      prisma.sensorReading.findFirst({
        where: {
          roomId,
          metricType,
          time: { lte: now },
        },
        orderBy: { time: "desc" },
      })
    )
  );

  const readings = rows.flatMap((row, i) => {
    if (!row) return [];
    const metricKey = DB_METRIC_KEY_MAP[metricTypes[i]];
    if (!metricKey) return [];
    const point: NormalisedPoint = { ts: row.time.getTime(), value: row.value };
    return [{ metricKey, timeseries: [point] }];
  });

  const occupancyValue = rows.find((row) => row?.metricType === "OCCUPANCY")?.value ?? null;
  const hour = now.getHours();
  const isDaytime = hour >= 8 && hour <= 18;
  const baseLux = isDaytime ? 3200 : 450;
  const occupancyBoost = Math.max(0, occupancyValue ?? 0) * 45;
  const variation = ((roomId * 97 + sensorId * 53 + hour * 29) % 900) - 450;
  const lightPoint: NormalisedPoint = {
    ts: now.getTime(),
    value: Math.max(150, Math.round(baseLux + occupancyBoost + variation)),
  };

  readings.push({
    metricKey: "light",
    timeseries: [lightPoint],
  });

  return { sensorId, deviceId, readings };
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

      const settled = await Promise.allSettled(
        sensors.map(async (s: Sensor) => {
          const deviceId = resolveDeviceId(s);

          if (!deviceId || isPlaceholderDevice(deviceId)) {
            return getLatestDBReadings(roomId, s.sensorId, deviceId ?? "");
          }

          const data = await getTelemetry(deviceId, THINGSBOARD_TELEMETRY_KEYS, 1);
          return { sensorId: s.sensorId, deviceId, readings: normaliseTelemetry(data) };
        })
      );

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

        if (isPlaceholderDevice(deviceId)) {
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
    console.log(result);
    return result;
  },
};


