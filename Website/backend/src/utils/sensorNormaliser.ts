import { MetricType } from "../generated/prisma/client";
import type { TbTelemetry } from "./thingsboard";

export const METRIC_KEYS = ["temperature", "humidity", "noise", "occupancy", "light"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
export const THINGSBOARD_TELEMETRY_KEYS = [
  "temperature",
  "temp",
  "humidity",
  "noise",
  "sound",
  "sound_level",
  "occupied",
  "occupancy",
  "light",
  "light_level",
] as const;

export type NormalisedPoint = { ts: number; value: number | boolean | string | null };
export type SensorReading = { metricKey: MetricKey; timeseries: NormalisedPoint[] };
export type SensorData = { sensorId: number; deviceId: string; readings: SensorReading[] };

// single source of truth: map DB MetricType -> app MetricKey
export const METRIC_TYPE_TO_KEY: Partial<Record<MetricType, MetricKey>> = {
  TEMP: "temperature",
  HUMIDITY: "humidity",
  NOISE: "noise",
  OCCUPANCY: "occupancy",
};

// derived maps
export const DB_METRIC_KEY_MAP: Partial<Record<MetricType, MetricKey>> = METRIC_TYPE_TO_KEY;

export const METRIC_TYPE_MAP: Partial<Record<MetricKey, MetricType>> = Object.fromEntries(
  Object.entries(METRIC_TYPE_TO_KEY).map(([metricType, metricKey]) => [metricKey, metricType])
) as Partial<Record<MetricKey, MetricType>>;

export const KEY_MAP: Record<string, MetricKey> = {
  temperature: "temperature",
  temp: "temperature",
  humidity: "humidity",
  noise: "noise",
  sound: "noise",
  sound_level: "noise",
  occupied: "occupancy",
  occupancy: "occupancy",
  light: "light",
  light_level: "light",
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
  const grouped = new Map<MetricKey, NormalisedPoint[]>();

  for (const [rawKey, rawSeries] of Object.entries(data)) {
    const metricKey = KEY_MAP[rawKey.toLowerCase()];
    if (!metricKey) continue; // ignore unknown keys

    const timeseries = (Array.isArray(rawSeries) ? rawSeries : [])
      .map((p) => ({
        ts: Number(p.ts),
        value: normaliseValue(p.value),
      }))
      .filter((p) => p.value !== null);

    const existing = grouped.get(metricKey) ?? [];
    grouped.set(metricKey, [...existing, ...timeseries]);
  }

  return Array.from(grouped.entries()).map(([metricKey, timeseries]) => ({
    metricKey,
    timeseries: timeseries.sort((a, b) => b.ts - a.ts),
  }));
}