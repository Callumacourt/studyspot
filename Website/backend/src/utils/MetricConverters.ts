export const NOISE_RANGES = {
  "Silent": { min: 0,  max: 50  },
  "Quiet":  { min: 50, max: 70  },
  "Normal": { min: 70, max: 90  },
  "Loud":   { min: 90, max: 120 },
} as const;

export const LIGHT_RANGES = {
  "Dark":   { min: 0,   max: 50  },
  "Dim":    { min: 50,  max: 200 },
  "Normal": { min: 200, max: 500 },
  "Bright": { min: 500, max: Infinity },
} as const;

/** Human-readable noise label matching NOISE_RANGES. */
export function noiseLabel(db: number): string {
  if (db < 50)  return "Silent";
  if (db < 70)  return "Quiet";
  if (db < 90)  return "Normal";
  return "Loud";
}

/** Human-readable light label matching LIGHT_RANGES. */
export function lightLabel(lux: number): string {
  if (lux < 50)  return "Dark";
  if (lux < 200) return "Dim";
  if (lux < 500) return "Normal";
  return "Bright";
}

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