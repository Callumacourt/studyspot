import { AdminError } from "./adminErrors";

export function ensureName(name: unknown, label: string): string {
  const value = String(name ?? "").trim();
  if (!value) throw new AdminError(`${label} is required`);
  return value;
}

export function ensureBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

export function ensurePositiveInt(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AdminError(`${label} must be a positive integer`);
  }
  return parsed;
}
