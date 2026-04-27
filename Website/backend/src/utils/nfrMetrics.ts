export type OccupancySample = {
  actualHeadcount: number;
  estimatedHeadcount: number;
};

export type BusyQuietSample = {
  actualLabel: "busy" | "quiet";
  occupancyPercent: number;
};

export function absolutePercentageError(actual: number, estimate: number): number {
  if (actual === 0) return estimate === 0 ? 0 : 1;
  return Math.abs(estimate - actual) / actual;
}

export function occupancyWithinToleranceRate(samples: OccupancySample[], tolerance = 0.15): number {
  if (samples.length === 0) return 0;
  const ok = samples.filter((s) => absolutePercentageError(s.actualHeadcount, s.estimatedHeadcount) <= tolerance).length;
  return ok / samples.length;
}

export function classifyBusyQuiet(occupancyPercent: number, busyThreshold = 60): "busy" | "quiet" {
  return occupancyPercent >= busyThreshold ? "busy" : "quiet";
}

export function busyQuietClassificationAccuracy(samples: BusyQuietSample[], busyThreshold = 60): number {
  if (samples.length === 0) return 0;

  const correct = samples.filter(
    (s) => classifyBusyQuiet(s.occupancyPercent, busyThreshold) === s.actualLabel
  ).length;

  return correct / samples.length;
}
