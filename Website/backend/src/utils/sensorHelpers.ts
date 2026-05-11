import type { MetricType } from "../generated/prisma/enums";
import { DB_METRIC_KEY_MAP, SensorData} from "./sensorNormaliser";
import type { NormalisedPoint } from "./sensorNormaliser";
import type { Sensor } from "@prisma/client";
import { prisma } from "../prisma";

export function resolveDeviceId(sensor: Sensor): string | null {
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

/**
 * Helper to convert telemetry values to either numeric or null
 * Parses strings to Number where possible
 */
export function toNumericValue(value: number | boolean | string | null): number | null {
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

/** Detect ThingsBoard placeholder device ids used in seeded/test data. */
export function isPlaceholderDevice(deviceId: string | null): boolean {
  return !deviceId || /^TB_DEVICE_/i.test(deviceId);
}

/**
 * Build a SensorData object from latest DB readings for a room.
 * - Queries latest value per metric from SensorReading table.
 */
export async function getLatestDBReadings(roomId: number, sensorId: number, deviceId: string): Promise<SensorData> {
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
  
  return { sensorId, deviceId, readings };
}