import axios from "axios";
import { prisma } from "../prisma";
import type { Sensor } from "../generated/prisma/client";

// get thingsboard info from .env
const TB_URL = (process.env.THINGSBOARD_URL || "").replace(/\/$/, "");
const TB_TOKEN = process.env.THINGSBOARD_TOKEN;

// define data we are querying sensor for
const METRIC_KEYS = ["temperature", "humidity", "noise", "occupancy"];
type MetricKey = (typeof METRIC_KEYS)[number];

// split into timeries and value
type TbPoint = {ts: number; value: string};
type TbTelemetry = Record<string, TbPoint[]>;

type NormalisedPoint = { ts : number, value : number | boolean | string | null };
type SensorReading = { metricKey: MetricKey; timeseries: NormalisedPoint[] };

// Cannonical shape returned by service methods
type SensorData = {
  sensorId: number;
  deviceId: string;
  readings: SensorReading[];
}

// maps thingsboard keys to metric keys
const KEY_MAP: Record<string, MetricKey> = {
  temperature : "temperature",
  temp: "temperature",
  humidity: "humidity",
  noise: "noise",
  occupancy: "occupancy",
};

// normalise thingsboard reading (converts string from thingsboard into typed value)
function normaliseValue (v: string): number | boolean | string | null {
  if (v === null) return null;
  const t = String(v).trim().toLowerCase();
  if (t === "true") return true;
  if (t === "false") return false;
  const n = Number(v);
  if (!Number.isNaN(n)) return n;
  return v;
};


/** fetch timeseries from ThingsBoard api */
async function getTelemetry(deviceId: string, keys: readonly string[], limit = 1): Promise<TbTelemetry> {
  if (!TB_URL) throw new Error("THINGSBOARD_URL not configured");
  if (!TB_TOKEN) throw new Error("THINGSBOARD_TOKEN not configured");

  const url = `${TB_URL}/api/plugins/telemetry/DEVICE/${encodeURIComponent(
    deviceId
  )}/values/timeseries?keys=${keys.join(",")}&limit=${limit}&orderBy=DESC`;

  const headers = { Authorization: `Bearer ${TB_TOKEN}` };
  try {
    const resp = await axios.get<TbTelemetry>(url, { headers, timeout: 10000 });
    return resp.data ?? {};
  } catch (err) {
    throw new Error(`Failed to fetch telemetry for device ${deviceId}: ${(err as Error).message}`)
  }
}

// convert thingsboard telemetry into expected format
function normaliseTelemetry(data: TbTelemetry) : SensorReading[] {
  const out: SensorReading[] = [];

  for (const [rawKey, rawSeries] of Object.entries(data)) {
    const matchesKeys = KEY_MAP[rawKey.toLowerCase()];
    if (!matchesKeys) continue // ignore unknown keys

    const timeseries = (Array.isArray(rawSeries) ? rawSeries : []).map((p) => ({
      ts: Number(p.ts),
      value: normaliseValue(p.value)
    }));
    out.push({metricKey: matchesKeys, timeseries});
  }
  return out;
}

export const SensorService = {

  // get telemetry data for a single sensor 
  async getSensorData(sensorId: number) : Promise<SensorData> {
    const sensor = await prisma.sensor.findUnique({
      where: { sensorId },
    });

    if (!sensor) throw new Error("Sensor not found");
    if (!sensor.deviceId) throw new Error("No ThingsBoard deviceId linked to sensor");

    const data = await getTelemetry(sensor.deviceId, METRIC_KEYS, 1);

    return {
      sensorId: sensor.sensorId,
      deviceId: sensor.deviceId, 
      readings: normaliseTelemetry(data)
    };
  },

  // get all sensor data for a given room 
  async getSensorDataByRoom(roomId: number) : Promise<SensorData[]> {
    const sensors = await prisma.sensor.findMany({
      where: { roomId },
    });

    if (sensors.length === 0) throw new Error("No sensors found for room");
    const sensorsWithDevice = sensors.filter((s : Sensor) => !!s.deviceId);

    if (sensorsWithDevice.length === 0) {
      throw new Error("No Thingsboard device linked for sensors in this room");
    }

    const settled = await Promise.allSettled(
      sensorsWithDevice.map(async (s : Sensor) => {
        const data = await getTelemetry(s.deviceId as string, METRIC_KEYS, 1);
        return {
          sensorId: s.sensorId,
          deviceId: s.deviceId,
          readings: normaliseTelemetry(data),
        };
      })
    );

    const successful = settled
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value);

    if (successful.length === 0) {
      throw new Error("Failed to fetch telemetry for all sensors");
    }
    
    return successful;
  },
};


