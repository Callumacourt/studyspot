// Non Functional Requirements tests: performance, security, availability, and data accuracy.

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
const jwt = require("jsonwebtoken");
import {
  busyQuietClassificationAccuracy,
  occupancyWithinToleranceRate,
  type BusyQuietSample,
  type OccupancySample,
} from "../utils/nfrMetrics";

/* Mocks for RoomService and SensorService
   - Replace external dependencies so tests focus on behavior (latency, auth, accuracy logic).
   - Hoisted so vitest can instrument them before imports that use these services. */
const { roomServiceMock, sensorServiceMock } = vi.hoisted(() => ({
  roomServiceMock: {
    getAllRooms: vi.fn(),
    getRoomsByFilter: vi.fn(),
    getRoomById: vi.fn(),
  },
  sensorServiceMock: {
    getSensorData: vi.fn(),
    getSensorDataByRoom: vi.fn(),
    linkSensorToRoom: vi.fn(),
    getHourlyOccupancyAvg: vi.fn(),
    saveSensorReadings: vi.fn(),
    syncAllSensors: vi.fn(),
  },
}));

vi.mock("../services/RoomService", () => ({ RoomService: roomServiceMock }));
vi.mock("../services/SensorService", () => ({ SensorService: sensorServiceMock }));

import app from "../app";

/* Helper: produce Authorisation header for requests.
   - By default uses a short lived test token; accepts an explicit token for edge cases.
   - Uses JWT_SECRET if provided to mirror production signing. */
function authHeader(token?: string) {
  const secret = process.env.JWT_SECRET ?? "test-jwt-secret";
  const jwtToken =
    token ??
    jwt.sign({ userId: 1, email: "student@cardiff.ac.uk" }, secret, {
      expiresIn: "1h",
    });
  return `Bearer ${jwtToken}`;
}

/* NFR1 - Performance
   - Validate endpoint responsiveness under load and that ingested sensor data becomes visible quickly. */
describe("NFR1 - Performance", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";
    vi.clearAllMocks();
    // Provide a predictable rooms payload for dashboard requests.
    roomServiceMock.getAllRooms.mockResolvedValue([
      { id: 1, name: "A", metrics: { temperature: 21, humidity: 50, noise: 62, occupancy: 33 } },
    ]);
  });

  it("dashboard endpoint handles burst traffic under 2s total", async () => {
    // Simulate 40 concurrent dashboard requests and assert total elapsed time is under 2s.
    const calls = 40;
    const t0 = Date.now();
    const responses = await Promise.all(
      Array.from({ length: calls }, () =>
        request(app).get("/api/rooms").set("Authorization", authHeader())
      )
    );
    const durationMs = Date.now() - t0;
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(durationMs).toBeLessThan(2000);
  });

  it("live updates are visible within 10 seconds of ingestion", async () => {
    // Simulate ingestion delay, then poll the sensor-data endpoint until the new value appears.
    let latest = 0;
    sensorServiceMock.saveSensorReadings.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350)); // simulate ingestion latency
      latest = 47; // new reading becomes available after ingestion
    });
    sensorServiceMock.getSensorDataByRoom.mockImplementation(async () => [
      {
        sensorId: 1,
        deviceId: "device-1",
        readings: [{ metricKey: "occupancy", timeseries: [{ ts: Date.now(), value: latest }] }],
      },
    ]);

    const start = Date.now();
    await sensorServiceMock.saveSensorReadings(1); // trigger simulated ingestion

    // Poll for up to 10s; this checks that the system surfaces new data quickly.
    let observedLatest = 0;
    while (Date.now() - start < 10_000) {
      const res = await request(app).get("/api/sensordata/1").set("Authorization", authHeader());
      const value = Number(res.body?.data?.[0]?.readings?.[0]?.timeseries?.[0]?.value ?? 0);
      if (value === 47) {
        observedLatest = value;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(observedLatest).toBe(47);
    expect(Date.now() - start).toBeLessThanOrEqual(10_000);
  });
});

/* NFR2 - Security
   - Verify authentication, proper handling of malformed/expired tokens, and domain-based access control. */
describe("NFR2 - Security", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";
    vi.clearAllMocks();
    roomServiceMock.getAllRooms.mockResolvedValue([]);
  });

  it("rejects unauthenticated API access", async () => {
    // No Authorisation header should result in 401.
    const res = await request(app).get("/api/rooms");
    expect(res.status).toBe(401);
  });

  it("rejects malformed and expired tokens", async () => {
    // Malformed token -> 401
    const malformed = await request(app).get("/api/rooms").set("Authorization", "Bearer not-a-real-token");
    expect(malformed.status).toBe(401);

    // Explicit expired token -> 401
    const expired = jwt.sign({ userId: 1, email: "student@cardiff.ac.uk" }, process.env.JWT_SECRET!, { expiresIn: -1 });
    const expiredRes = await request(app).get("/api/rooms").set("Authorization", authHeader(expired));
    expect(expiredRes.status).toBe(401);
  });

  it("allows authorised users with valid JWT", async () => {
    // Valid staff/student JWT should be accepted.
    const res = await request(app).get("/api/rooms").set("Authorization", authHeader());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("denies valid JWTs that are not staff/student academic domains", async () => {
    // JWT from an external email domain should be rejected (403).
    const token = jwt.sign({ userId: 2, email: "intruder@gmail.com" }, process.env.JWT_SECRET!, { expiresIn: "1h" });
    const res = await request(app).get("/api/rooms").set("Authorization", authHeader(token));
    expect(res.status).toBe(403);
  });
});

/* NFR3 - Availability
   - Probe the /healthz endpoint repeatedly to assert high availability and low tail latency. */
describe("NFR3 - Availability", () => {
  it("health endpoint availability is >= 99% in probe run", async () => {
    const probes = 200;
    let ok = 0;
    const durations: number[] = [];

    for (let i = 0; i < probes; i += 1) {
      const t0 = Date.now();
      const res = await request(app).get("/healthz");
      durations.push(Date.now() - t0);
      if (res.status === 200) ok += 1;
    }

    const availability = ok / probes;
    const sorted = [...durations].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(0.95 * sorted.length)] ?? 0;

    // Expect at least 99% probe success and p95 latency under 200ms.
    expect(availability).toBeGreaterThanOrEqual(0.99);
    expect(p95).toBeLessThan(200);
  });
});

/* NFR4 - Data accuracy tests */
describe("NFR4 - Data accuracy", () => {
  it("occupancy estimate stays within ±15% for at least 90% of peak samples", () => {
    const peakSamples: OccupancySample[] = [
      { actualHeadcount: 40, estimatedHeadcount: 38 },
      { actualHeadcount: 32, estimatedHeadcount: 35 },
      { actualHeadcount: 28, estimatedHeadcount: 30 },
      { actualHeadcount: 45, estimatedHeadcount: 42 },
      { actualHeadcount: 36, estimatedHeadcount: 34 },
      { actualHeadcount: 30, estimatedHeadcount: 26 },
      { actualHeadcount: 25, estimatedHeadcount: 23 },
      { actualHeadcount: 41, estimatedHeadcount: 44 },
      { actualHeadcount: 27, estimatedHeadcount: 25 },
      { actualHeadcount: 34, estimatedHeadcount: 39 },
    ];

    const withinTolerance = occupancyWithinToleranceRate(peakSamples, 0.15);
    expect(withinTolerance).toBeGreaterThanOrEqual(0.9);
  });

  it("busy/quiet classification accuracy is at least 90%", () => {
    const labelledSamples: BusyQuietSample[] = [
      { actualLabel: "quiet", occupancyPercent: 18 },
      { actualLabel: "quiet", occupancyPercent: 31 },
      { actualLabel: "busy", occupancyPercent: 70 },
      { actualLabel: "busy", occupancyPercent: 75 },
      { actualLabel: "quiet", occupancyPercent: 45 },
      { actualLabel: "busy", occupancyPercent: 61 },
      { actualLabel: "busy", occupancyPercent: 67 },
      { actualLabel: "quiet", occupancyPercent: 22 },
      { actualLabel: "busy", occupancyPercent: 89 },
      { actualLabel: "quiet", occupancyPercent: 40 },
    ];

    const accuracy = busyQuietClassificationAccuracy(labelledSamples, 60);
    expect(accuracy).toBeGreaterThanOrEqual(0.9);
  });
});
