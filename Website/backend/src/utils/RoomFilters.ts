/**
 * Utilities to build and evaluate room metric filters.
 *
 * Responsibilities:
 * - buildMetricFilters: convert query-like inputs (labels, numeric bounds, or prebuilt filters)
 *   into a uniform array of MetricFilter objects used by RoomService.
 * - metricsMatchFilters: determine whether a RoomMetrics snapshot satisfies all provided filters.
 *
 * Notes:
 * - A metric with value `null` is treated as "no data" and fails any filter that references it.
 * - Filters are conjunctive (every filter must pass).
 */

import { noiseToRange, occupancyToRange } from "./MetricConverters";

type MetricFilter = {
  metricType: "TEMP" | "HUMIDITY" | "NOISE" | "OCCUPANCY";
  min?: number;
  max?: number;
};

export type RoomMetrics = {
  temperature: number | null;
  humidity: number | null;
  occupancy: number | null;
  noise: number | null;
};

/**
 * Convert user facing params into MetricFilter[]
 * - params.noise / params.occupancy: label strings mapped to numeric ranges via converters.
 * - tempMin/tempMax, humidityMin/humidityMax: direct numeric bounds for TEMP/HUMIDITY.
 * - params.metrics: allow callers to supply already constructed MetricFilter objects.
 *
 * Returns an array of MetricFilter suitable for filtering room metric snapshots.
 */
export function buildMetricFilters(params: {
  noise?: string;
  occupancy?: string;
  tempMin?: number;
  tempMax?: number;
  humidityMin?: number;
  humidityMax?: number;
  metrics?: MetricFilter[];
}): MetricFilter[] {
  const filters = params.metrics ? [...params.metrics] : [];

  if (params.noise) {
    const range = noiseToRange(params.noise);
    if (range) filters.push({ metricType: "NOISE", ...range });
  }
  if (params.occupancy) {
    const range = occupancyToRange(params.occupancy);
    if (range) filters.push({ metricType: "OCCUPANCY", ...range });
  }
  if (params.tempMin !== undefined || params.tempMax !== undefined) {
    filters.push({ metricType: "TEMP", min: params.tempMin, max: params.tempMax });
  }
  if (params.humidityMin !== undefined || params.humidityMax !== undefined) {
    filters.push({ metricType: "HUMIDITY", min: params.humidityMin, max: params.humidityMax });
  }

  return filters;
}

/**
 * Map internal metricType strings to RoomMetrics keys.
 * Used by metricsMatchFilters to look up the numeric value to compare.
 */
const metricKeyMap: Record<string, keyof RoomMetrics> = {
  TEMP: "temperature",
  HUMIDITY: "humidity",
  NOISE: "noise",
  OCCUPANCY: "occupancy",
};

/**
 * Evaluate whether a RoomMetrics object satisfies all MetricFilter conditions.
 * - Empty filters array => match (no constraints).
 * - Missing metric data (null) causes the filter to fail for that metric.
 * - Both min and max are optional; only the provided bounds are checked.
 */
export function metricsMatchFilters(metrics: RoomMetrics, filters: MetricFilter[]): boolean {
  if (filters.length === 0) return true;

  return filters.every((filter) => {
    const key = metricKeyMap[filter.metricType];
    const value = metrics[key];

    // No data for the requested metric => do not match.
    if (value === null) return false;

    if (filter.min !== undefined && value < filter.min) return false;
    if (filter.max !== undefined && value > filter.max) return false;
    return true;
  });
}

