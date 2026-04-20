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
 * Build metric filters from label + numeric params.
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

const metricKeyMap: Record<string, keyof RoomMetrics> = {
  TEMP: "temperature",
  HUMIDITY: "humidity",
  NOISE: "noise",
  OCCUPANCY: "occupancy",
};

export function metricsMatchFilters(metrics: RoomMetrics, filters: MetricFilter[]): boolean {
  if (filters.length === 0) return true;
  return filters.every((filter) => {
    const key = metricKeyMap[filter.metricType];
    const value = metrics[key];
    if (value === null) return false; // no data for this metric — exclude when filtering
    if (filter.min !== undefined && value < filter.min) return false;
    if (filter.max !== undefined && value > filter.max) return false;
    return true;
  });
}

