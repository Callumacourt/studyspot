import axios from "axios";

const TB_URL = (process.env.THINGSBOARD_URL || "").replace(/\/$/, "");
const TB_TOKEN = process.env.THINGSBOARD_TOKEN;
if (!TB_URL || !TB_TOKEN) throw new Error("Missing thingsboard .env data")

export type TbPoint = {ts: number; value: string};
export type TbTelemetry = Record<string, TbPoint[]>;

/**
 * TbTelemetry / TbPoint
 * Types representing the raw JSON returned by ThingsBoard timeseries endpoint.
 */

/**
 * getTelemetry
 * Fetch timeseries telemetry for a device from ThingsBoard.
 * @param deviceId - ThingsBoard device id
 * @param keys - telemetry keys to fetch
 * @param limit - number of points per key (default 1, latest first)
 * @returns mapping of telemetry key -> array of { ts, value }
 * @throws if TB_URL/TOKEN missing or request fails
 */
export default async function getTelemetry(deviceId: string, keys: readonly string[], limit = 1): Promise<TbTelemetry> {
  if (!TB_URL) throw new Error("THINGSBOARD_URL not configured");
  if (!TB_TOKEN) throw new Error("THINGSBOARD_TOKEN not configured");

  const url = `${TB_URL}/api/plugins/telemetry/DEVICE/${encodeURIComponent(
    deviceId
  )}/values/timeseries?keys=${keys.join(",")}&limit=${limit}&orderBy=DESC`;

  const headers = { Authorization: `Bearer ${TB_TOKEN}` };
  try {
    const resp = await axios.get<TbTelemetry>(url, { headers, timeout: 10000 });
    return resp.data ?? {};
  } catch (err) {
    throw new Error(`Failed to fetch telemetry for device ${deviceId}: ${(err as Error).message}`)
  }
}