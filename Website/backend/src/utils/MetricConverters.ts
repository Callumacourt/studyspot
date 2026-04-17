export const NOISE_RANGES = {
  "Quiet": { min: 0, max: 50 },
  "Normal": { min: 50, max: 70 },
  "Loud": { min: 70, max: 120 },
} as const;

export const OCCUPANCY_RANGES = {
  "Sparse": { min: 0, max: 33 },
  "Moderate": { min: 33, max: 66 },
  "Busy": { min: 66, max: 100 },
} as const;

export function noiseToRange(label: string): { min: number; max: number } | null {
  return NOISE_RANGES[label as keyof typeof NOISE_RANGES] ?? null;
}

export function occupancyToRange(label: string): { min: number; max: number } | null {
  return OCCUPANCY_RANGES[label as keyof typeof OCCUPANCY_RANGES] ?? null;
}