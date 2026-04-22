import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("getTelemetry", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.THINGSBOARD_URL;
    delete process.env.THINGSBOARD_TOKEN;
  });

  it("throws when THINGSBOARD_URL is missing", async () => {
    process.env.THINGSBOARD_TOKEN = "token";

    const { default: getTelemetry } = await import("../utils/thingsboard");

    await expect(getTelemetry("device-1", ["temperature"])).rejects.toThrow(
      "THINGSBOARD_URL not configured"
    );
  });

  it("throws when THINGSBOARD_TOKEN is missing", async () => {
    process.env.THINGSBOARD_URL = "http://tb.local:8080";

    const { default: getTelemetry } = await import("../utils/thingsboard");

    await expect(getTelemetry("device-1", ["temperature"])).rejects.toThrow(
      "THINGSBOARD_TOKEN not configured"
    );
  });

  it("calls ThingsBoard with expected url and auth header", async () => {
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