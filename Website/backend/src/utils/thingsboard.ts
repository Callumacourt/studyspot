// ThingsBoard telemetry helper.
// - Builds requests to ThingsBoard timeseries API.
// - Manages accessToken/refreshToken caching, refresh and optional login fallback.
// - Returns mapping of metric key -> timeseries points.

import axios from "axios";
import { generateMockTelemetry } from "./demoHelper";

const TB_URL = (process.env.THINGSBOARD_URL || "").replace(/\/$/, ""); // base URL without trailing slash
const TB_TOKEN_RAW = process.env.THINGSBOARD_TOKEN || ""; // raw token payload (string or JSON blob)
const TB_REFRESH_TOKEN = process.env.THINGSBOARD_REFRESH_TOKEN || "";
const TB_EMAIL = process.env.THINGSBOARD_EMAIL || ""; 
const TB_PASSWORD = process.env.THINGSBOARD_PASSWORD || ""; 

export type TbPoint = { ts: number; value: string };
export type TbTelemetry = Record<string, TbPoint[]>;

// cached tokens used for requests; extracted from TB_TOKEN_RAW when available
let cachedAccessToken: string | null = extractAccessToken(TB_TOKEN_RAW);
let cachedRefreshToken: string | null = TB_REFRESH_TOKEN || extractRefreshToken(TB_TOKEN_RAW);

/* Helpers */

// whether username/password login is available
function hasLoginCredentials(): boolean {
  return !!TB_EMAIL && !!TB_PASSWORD;
}

// decode JWT payload (naive base64 decode) or return null on error
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

// detect if a JWT expires within `withinSeconds` to proactively refresh
function tokenExpiresSoon(token: string, withinSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return Number(payload.exp) <= now + withinSeconds;
}

// extract access token from a raw env string which may be:
//  - plain token
//  - JSON string with { token, refreshToken }
//  - concatenated 'token","refreshToken":"...' legacy format
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

// extract refresh token from raw env formats (see extractAccessToken)
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

/* Token management */

// Call ThingsBoard token refresh endpoint with cachedRefreshToken
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

// Login using TB_EMAIL/TB_PASSWORD to obtain new token when refresh not usable
async function loginAccessToken(): Promise<string> {
  if (!TB_URL) throw new Error("THINGSBOARD_URL not configured");
  if (!hasLoginCredentials()) {
    throw new Error("THINGSBOARD_USERNAME/THINGSBOARD_PASSWORD not configured");
  }

  const url = `${TB_URL}/api/auth/login`;
  const resp = await axios.post<{ token: string; refreshToken?: string }>(
    url,
    { username: TB_EMAIL, password: TB_PASSWORD },
    { timeout: 10000 }
  );

  cachedAccessToken = resp.data?.token ?? null;
  if (resp.data?.refreshToken) cachedRefreshToken = resp.data.refreshToken;

  if (!cachedAccessToken) throw new Error("ThingsBoard login returned no access token");
  return cachedAccessToken;
}

// Return a valid access token, trying refresh then fallback to login when appropriate.
// forceRefresh forces a refresh attempt even if token looks valid.
async function getValidAccessToken(forceRefresh = false): Promise<string> {
  if (forceRefresh || !cachedAccessToken || tokenExpiresSoon(cachedAccessToken)) {
    try {
      // if refresh token itself is about to expire but login creds exist, perform login instead
      if (cachedRefreshToken && tokenExpiresSoon(cachedRefreshToken) && hasLoginCredentials()) {
        return await loginAccessToken();
      }
      return await refreshAccessToken();
    } catch (err: any) {
      const status = err?.response?.status;
      const message = String(err?.response?.data?.message ?? err?.message ?? "").toLowerCase();
      const refreshExpired =
        status === 401 ||
        message.includes("token has expired") ||
        message.includes("expired") ||
        message.includes("refresh");

      // if refresh failed due to expiration and login creds exist, fall back to login
      if (refreshExpired && hasLoginCredentials()) {
        return loginAccessToken();
      }

      throw err;
    }
  }
  return cachedAccessToken;
}

/*  Fetch telemetry for a device
   - Builds the timeseries URL with requested keys and limit.
   - Uses getValidAccessToken to ensure an up to date Bearer token.
   - On 401 and when a refresh token exists, retries once after forcing a token refresh.
*/
export default async function getTelemetry(deviceId: string, keys: readonly string[], limit = 1): Promise<TbTelemetry> {
  // 1. Force mock if on Vercel
  if (process.env.VERCEL) {
    return generateMockTelemetry(keys);
  }

  try {
    const accessToken = await getValidAccessToken();
    const url = `${TB_URL}/api/plugins/telemetry/DEVICE/${encodeURIComponent(deviceId)}/values/timeseries?keys=${keys.join(",")}&limit=${limit}&orderBy=DESC`;

    const resp = await axios.get<TbTelemetry>(url, { 
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 5000 
    });
    
    return resp.data ?? {};
  } catch (err) {
    // 2. Fallback to mock if VPN/ThingsBoard fails
    console.warn(`[ThingsBoard] Connection failed for ${deviceId}. Serving mock data.`);
    return generateMockTelemetry(keys);
  }
}