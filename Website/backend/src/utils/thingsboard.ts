import axios from "axios";

const TB_URL = (process.env.THINGSBOARD_URL || "").replace(/\/$/, "");
const TB_TOKEN_RAW = process.env.THINGSBOARD_TOKEN || "";
const TB_REFRESH_TOKEN = process.env.THINGSBOARD_REFRESH_TOKEN || "";
// disbaled briefly for dev --  if (!TB_URL || !TB_TOKEN) throw new Error("Missing thingsboard .env data")

export type TbPoint = {ts: number; value: string};
export type TbTelemetry = Record<string, TbPoint[]>;

let cachedAccessToken: string | null = extractAccessToken(TB_TOKEN_RAW);
let cachedRefreshToken: string | null = TB_REFRESH_TOKEN || extractRefreshToken(TB_TOKEN_RAW);

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function tokenExpiresSoon(token: string, withinSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return Number(payload.exp) <= now + withinSeconds;
}

function extractAccessToken(raw: string): string | null {
  if (!raw) return null;

  if (raw.includes('","refreshToken":"')) {
    return raw.split('","refreshToken":"')[0] ?? null;
  }

  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      return parsed?.token ?? null;
    } catch {
      return null;
    }
  }

  return raw;
}

function extractRefreshToken(raw: string): string | null {
  if (!raw) return null;

  if (raw.includes('","refreshToken":"')) {
    const tokenPart = raw.split('","refreshToken":"')[1];
    return tokenPart ? tokenPart.replace(/"$/, "") : null;
  }

  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      return parsed?.refreshToken ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

async function refreshAccessToken(): Promise<string> {
  if (!TB_URL) throw new Error("THINGSBOARD_URL not configured");
  if (!cachedRefreshToken) throw new Error("THINGSBOARD_REFRESH_TOKEN not configured");

  const url = `${TB_URL}/api/auth/token`;
  const resp = await axios.post<{ token: string; refreshToken?: string }>(
    url,
    { refreshToken: cachedRefreshToken },
    { timeout: 10000 }
  );

  cachedAccessToken = resp.data?.token;
  if (resp.data?.refreshToken) cachedRefreshToken = resp.data.refreshToken;

  if (!cachedAccessToken) throw new Error("ThingsBoard token refresh returned no access token");
  return cachedAccessToken;
}

async function getValidAccessToken(forceRefresh = false): Promise<string> {
  if (forceRefresh || !cachedAccessToken || tokenExpiresSoon(cachedAccessToken)) {
    return refreshAccessToken();
  }
  return cachedAccessToken;
}

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
  if (!cachedAccessToken && !cachedRefreshToken) {
    throw new Error("THINGSBOARD_TOKEN/THINGSBOARD_REFRESH_TOKEN not configured");
  }

  const url = `${TB_URL}/api/plugins/telemetry/DEVICE/${encodeURIComponent(
    deviceId
  )}/values/timeseries?keys=${keys.join(",")}&limit=${limit}&orderBy=DESC`;

  try {
    const accessToken = await getValidAccessToken();
    const headers = { Authorization: `Bearer ${accessToken}` };
    const resp = await axios.get<TbTelemetry>(url, { headers, timeout: 10000 });
    return resp.data ?? {};
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401 && cachedRefreshToken) {
      const refreshed = await getValidAccessToken(true);
      const retry = await axios.get<TbTelemetry>(url, {
        headers: { Authorization: `Bearer ${refreshed}` },
        timeout: 10000,
      });
      return retry.data ?? {};
    }

    throw new Error(`Failed to fetch telemetry for device ${deviceId}: ${(err as Error).message}`)
  }
}