export const NOISE_RANGES = {
  "Silent": { min: 0, max: 50 },
  "Quiet": { min: 50, max: 70 },
  "Normal": { min: 70, max: 120 },
} as const;

export const OCCUPANCY_RANGES = {
  "Empty": { min: 0, max: 0 },
  "Sparse": { min: 1, max: 33 },
  "Moderate+": { min: 66, max: 100 },
} as const;

export function noiseToRange(label: string): { min: number; max: number } | null {
  return NOISE_RANGES[label as keyof typeof NOISE_RANGES] ?? null;
}

export function occupancyToRange(label: string): { min: number; max: number } | null {
  return OCCUPANCY_RANGES[label as keyof typeof OCCUPANCY_RANGES] ?? null;
}