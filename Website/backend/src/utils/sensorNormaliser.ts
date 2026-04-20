import { MetricType } from "../generated/prisma/client";
import type { TbTelemetry } from "./thingsboard";

export const METRIC_KEYS = ["temperature", "humidity", "noise", "occupancy"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export type NormalisedPoint = { ts: number; value: number | boolean | string | null };
export type SensorReading = { metricKey: MetricKey; timeseries: NormalisedPoint[] };
export type SensorData = { sensorId: number; deviceId: string; readings: SensorReading[] };

export const KEY_MAP: Record<string, MetricKey> = {
  temperature: "temperature",
  temp: "temperature",
  humidity: "humidity",
  noise: "noise",
  occupancy: "occupancy",
};

export const METRIC_TYPE_MAP: Record<MetricKey, MetricType> = {
  temperature: "TEMP",
  humidity: "HUMIDITY",
  noise: "NOISE",
  occupancy: "OCCUPANCY",
};


// convert telemetry string into typed value
export function normaliseValue(v: string): number | boolean | string | null {
  if (v === null) return null;
  const t = String(v).trim().toLowerCase();
  if (t === "true") return true;
  if (t === "false") return false;
  const n = Number(v);
  if (!Number.isNaN(n)) return n;
  return v;
}

// convert thingsboard telemetry into expected format
export function normaliseTelemetry(data: TbTelemetry): SensorReading[] {
  const out: SensorReading[] = [];

  for (const [rawKey, rawSeries] of Object.entries(data)) {
    const metricKey = KEY_MAP[rawKey.toLowerCase()];
    if (!metricKey) continue; // ignore unknown keys

    const timeseries = (Array.isArray(rawSeries) ? rawSeries : []).map((p) => ({
      ts: Number(p.ts),
      value: normaliseValue(p.value),
    }));
    out.push({ metricKey, timeseries });
  }
  return out;
}