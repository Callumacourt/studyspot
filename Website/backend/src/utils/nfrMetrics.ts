/*
  Utility helpers for NFR metrics used in tests.
  - OccupancySample: numeric actual vs estimated headcounts.
  - BusyQuietSample: labeled example for busy/quiet classifier.
  - Functions return simple numeric metrics (rates/accuracy) in [0,1].
*/

export type OccupancySample = {
  actualHeadcount: number;    // ground truth headcount
  estimatedHeadcount: number; // system estimate to evaluate
};

export type BusyQuietSample = {
  actualLabel: "busy" | "quiet"; 
  occupancyPercent: number;      // occupancy as percentage (0-100)
};

/*
  absolutePercentageError
  - Returns the absolute relative error between actual and estimate.
  - Special-case: if actual is 0, return 0 when estimate is also 0, otherwise treat as 100% error (1)..
*/
export function absolutePercentageError(actual: number, estimate: number): number {
  if (actual === 0) return estimate === 0 ? 0 : 1;
  return Math.abs(estimate - actual) / actual;
}

/*
  occupancyWithinToleranceRate
  - Given samples and a tolerance (fraction), returns fraction of samples whose
    estimates are within ±tolerance of the actual headcount.
  - Returns 0 for empty input.
*/
export function occupancyWithinToleranceRate(samples: OccupancySample[], tolerance = 0.15): number {
  if (samples.length === 0) return 0;
  const ok = samples.filter((s) => absolutePercentageError(s.actualHeadcount, s.estimatedHeadcount) <= tolerance).length;
  return ok / samples.length;
}

/*
  classifyBusyQuiet
  - Simple threshold classifier: occupancyPercent >= busyThreshold => "busy", else "quiet".
  - busyThreshold defaults to 60 (%).
*/
export function classifyBusyQuiet(occupancyPercent: number, busyThreshold = 60): "busy" | "quiet" {
  return occupancyPercent >= busyThreshold ? "busy" : "quiet";
}

/*
  busyQuietClassificationAccuracy
  - Computes classification accuracy over labeled samples using classifyBusyQuiet.
  - Returns 0 for empty input.
*/
export function busyQuietClassificationAccuracy(samples: BusyQuietSample[], busyThreshold = 60): number {
  if (samples.length === 0) return 0;

  const correct = samples.filter(
    (s) => classifyBusyQuiet(s.occupancyPercent, busyThreshold) === s.actualLabel
  ).length;

  return correct / samples.length;
}
