// Tests for the ThingsBoard telemetry helper
import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

const prismaMock = {
  sensor: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  sensorReading: {
    create: vi.fn(),
  },
  room: {
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
};

/* Stub for the telemetry helper to allow module reloading in tests. */
const getTelemetryMock = vi.fn();

/* Replace real prisma and the thingsboard helper with mocks so tests control I/O. */
vi.mock("../prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("../utils/thingsboard", () => ({
  default: getTelemetryMock,
}));

/* Mock axios to intercept http calls made by the telemetry helper. */
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("getTelemetry", () => {
  afterEach(() => {
    // clear module cache and env to keep tests isolated.
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.THINGSBOARD_URL;
    delete process.env.THINGSBOARD_TOKEN;
  });

  it("throws when THINGSBOARD_URL is missing", async () => {
    // Ensure helper validates required env; missing URL should reject early.
    process.env.THINGSBOARD_TOKEN = "token";

    const { default: getTelemetry } = await import("../utils/thingsboard");

    await expect(getTelemetry("device-1", ["temperature"])).rejects.toThrow(
      "THINGSBOARD_URL not configured"
    );
  });

  it("throws when THINGSBOARD_TOKEN is missing", async () => {
    // Missing token should be rejected even if URL is present.
    process.env.THINGSBOARD_URL = "http://tb.local:8080";

    const { default: getTelemetry } = await import("../utils/thingsboard");

    await expect(getTelemetry("device-1", ["temperature"])).rejects.toThrow(
      "THINGSBOARD_TOKEN not configured"
    );
  });

  it("calls ThingsBoard with expected url and auth header", async () => {
    // Validate URL encoding, query params, headers, timeout and returned payload shape.
    process.env.THINGSBOARD_URL = "http://tb.local:8080/";
    process.env.THINGSBOARD_TOKEN = "secret-token";
    vi.mocked(axios.get).mockResolvedValue({
      data: { temperature: [{ ts: 1710000000000, value: "21.4" }] },
    } as never);

    const { default: getTelemetry } = await import("../utils/thingsboard");
    const result = await getTelemetry("device 1", ["temperature", "humidity"], 2);

    expect(axios.get).toHaveBeenCalledWith(
      "http://tb.local:8080/api/plugins/telemetry/DEVICE/device%201/values/timeseries?keys=temperature,humidity&limit=2&orderBy=DESC",
      {
        headers: { Authorization: "Bearer secret-token" },
        timeout: 10000,
      }
    );
    expect(result).toEqual({ temperature: [{ ts: 1710000000000, value: "21.4" }] });
  });
});

describe("getTelemetry non-functional", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.THINGSBOARD_URL;
    delete process.env.THINGSBOARD_TOKEN;
    delete process.env.THINGSBOARD_REFRESH_TOKEN;
  });

  it("completes a single request quickly", async () => {
    // Simulate small network latency and assert helper returns promptly.
    process.env.THINGSBOARD_URL = "http://tb.local:8080/";
    process.env.THINGSBOARD_TOKEN = "secret-token";
    vi.mocked(axios.get).mockImplementation(() =>
      new Promise((res) =>
        setTimeout(() => res({ data: { temperature: [{ ts: 1710000000000, value: "21.4" }] } }), 20)
      )
    );

    const { default: getTelemetry } = await import("../utils/thingsboard");

    const t0 = Date.now();
    const result = await getTelemetry("device 1", ["temperature"], 1);
    const dur = Date.now() - t0;

    expect(result).toEqual({ temperature: [{ ts: 1710000000000, value: "21.4" }] });
    expect(vi.mocked(axios.get)).toHaveBeenCalled();
    expect(dur).toBeLessThan(200); // coarse latency bound for local CI
  });

  it("handles many concurrent requests without serial bottleneck", async () => {
    // Ensure parallel calls complete and axios.get is invoked per call.
    process.env.THINGSBOARD_URL = "http://tb.local:8080/";
    process.env.THINGSBOARD_TOKEN = "secret-token";

    vi.mocked(axios.get).mockResolvedValue({ data: { humidity: [{ ts: 1710000000000, value: "55" }] } } as never);

    const { default: getTelemetry } = await import("../utils/thingsboard");

    const calls = 50;
    const t0 = Date.now();
    const promises = Array.from({ length: calls }, (_, i) =>
      getTelemetry(`device-${i}`, ["humidity"], 1)
    );
    const results = await Promise.all(promises);
    const dur = Date.now() - t0;

    expect(results.every((r) => r.humidity?.length === 1)).toBe(true);
    expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(calls);
    expect(dur).toBeLessThan(1000);
  });

  it("performs a token refresh on 401 and retries without excessive delay", async () => {
    // Simulate expired token: first GET returns 401, token refresh POST provides new token, then GET succeeds.
    process.env.THINGSBOARD_URL = "http://tb.local:8080/";
    process.env.THINGSBOARD_TOKEN = '{"token":"expired","refreshToken":"r1"}';
    vi.mocked(axios.get)
      .mockImplementationOnce(() => Promise.reject({ response: { status: 401 }, message: "unauthorized" }))
      .mockResolvedValue({ data: { pressure: [{ ts: 1710000000000, value: "101" }] } } as never);

    // Mock token refresh endpoint used by the helper.
    (axios as any).post = vi.fn().mockResolvedValue({ data: { token: "new-token", refreshToken: "r2" } });

    const { default: getTelemetry } = await import("../utils/thingsboard");

    const t0 = Date.now();
    const result = await getTelemetry("device-x", ["pressure"], 1);
    const dur = Date.now() - t0;

    expect(result).toEqual({ pressure: [{ ts: 1710000000000, value: "101" }] });
    expect((axios as any).post).toHaveBeenCalled(); // refresh attempted
    expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2); // initial + retry
    expect(dur).toBeLessThan(1000);
  });
});
