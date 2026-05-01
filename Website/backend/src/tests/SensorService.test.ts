import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* Minimal in memory prisma mock used to control DB responses per test.
   Only methods used by SensorService are stubbed. */
const prismaMock = {
  sensor: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  sensorReading: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  room: {
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
};

/* Mock of the ThingsBoard telemetry helper */
const getTelemetryMock = vi.fn();

/* Replace real prisma and thingsboard util with mocks. */
vi.mock("../prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("../utils/thingsboard", () => ({
  default: getTelemetryMock,
}));

describe("SensorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ensure env overrides in one test don't leak into others
    delete process.env.REAL_ROOM_SENSOR_ID;
    delete process.env.REAL_ROOM_DEVICE_ID;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty array when a room has no sensors", async () => {
    // DB returns no sensors -> service should not call external telemetry
    prismaMock.sensor.findMany.mockResolvedValue([]);
    const { SensorService } = await import("../services/SensorService");

    await expect(SensorService.getSensorDataByRoom(18)).resolves.toEqual([]);
    expect(getTelemetryMock).not.toHaveBeenCalled();
  });

  it("logs rejected telemetry calls and returns successful sensor data only", async () => {
    // Two sensors: first succeeds, second fails (ThingsBoard error).
    prismaMock.sensor.findMany.mockResolvedValue([
      { sensorId: 1, roomId: 10, deviceId: "device-a" },
      { sensorId: 2, roomId: 10, deviceId: "device-b" },
    ]);

    getTelemetryMock
      .mockResolvedValueOnce({ temperature: [{ ts: 1710000000000, value: "21.5" }] })
      .mockRejectedValueOnce(new Error("401 from ThingsBoard"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { SensorService } = await import("../services/SensorService");

    const result = await SensorService.getSensorDataByRoom(10);

    // Only the successful sensor should be returned; failure should be logged.
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ sensorId: 1, deviceId: "device-a" });
    expect(errorSpy).toHaveBeenCalledWith(
      "[SensorService] sensor 2 failed:",
      expect.any(Error)
    );
  });

  it("only persists numeric readings and skips non-numeric values", async () => {
    // Telemetry contains a non-numeric humidity reading ("true") which must be ignored.
    prismaMock.sensor.findMany.mockResolvedValue([
      { sensorId: 4, roomId: 7, deviceId: "device-4" },
    ]);

    getTelemetryMock.mockResolvedValue({
      temperature: [{ ts: 1710000000000, value: "22.1" }],
      humidity: [{ ts: 1710000001000, value: "true" }],
      noise: [{ ts: 1710000002000, value: "49.8" }],
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { SensorService } = await import("../services/SensorService");

    await SensorService.saveSensorReadings(7);

    // Only temperature and noise (numeric) get persisted.
    expect(prismaMock.sensorReading.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.sensorReading.create).toHaveBeenNthCalledWith(1, {
      data: {
        roomId: 7,
        metricType: "TEMP",
        value: 22.1,
        time: new Date(1710000000000),
      },
    });
    expect(prismaMock.sensorReading.create).toHaveBeenNthCalledWith(2, {
      data: {
        roomId: 7,
        metricType: "NOISE",
        value: 49.8,
        time: new Date(1710000002000),
      },
    });
    expect(logSpy).toHaveBeenCalledWith("[SensorService] Saved readings for sensor 4 in room 7");
  });

  // edge cases / non functional tests

  it("getSensorData throws when sensor not found", async () => {
    prismaMock.sensor.findUnique.mockResolvedValue(null);
    const { SensorService } = await import("../services/SensorService");
    await expect(SensorService.getSensorData(123)).rejects.toThrow("Sensor not found");
  });

  it("getSensorData throws when sensor has no deviceId", async () => {
    prismaMock.sensor.findUnique.mockResolvedValue({ sensorId: 5, deviceId: null });
    const { SensorService } = await import("../services/SensorService");
    await expect(SensorService.getSensorData(5)).rejects.toThrow("No ThingsBoard deviceId linked to sensor");
  });

  it("uses REAL_ROOM_DEVICE_ID when REAL_ROOM_SENSOR_ID matches", async () => {
    // If REAL_ROOM_SENSOR_ID env matches the sensor id, force the ThingsBoard device id to REAL_ROOM_DEVICE_ID.
    process.env.REAL_ROOM_SENSOR_ID = "42";
    process.env.REAL_ROOM_DEVICE_ID = "real-device-xyz";

    prismaMock.sensor.findUnique.mockResolvedValue({ sensorId: 42, deviceId: "ignored" });
    getTelemetryMock.mockResolvedValue({ temperature: [{ ts: 1, value: "0" }] });

    const { SensorService } = await import("../services/SensorService");
    await SensorService.getSensorData(42);

    expect(getTelemetryMock).toHaveBeenCalledWith("real-device-xyz", expect.any(Array), 1);
  });

  it("returns DB readings for placeholder sensors and never calls ThingsBoard", async () => {
    // Placeholder sensors use DB stored latest readings rather than ThingsBoard.
    prismaMock.sensor.findMany.mockResolvedValue([
      { sensorId: 3, roomId: 2, deviceId: "TB_DEVICE_UUID_2" },
    ]);

    const now = Date.now();
    prismaMock.sensorReading.findFirst
      .mockResolvedValueOnce({ metricType: "TEMP", value: 21.5, time: new Date(now - 1000) })
      .mockResolvedValueOnce({ metricType: "HUMIDITY", value: 55, time: new Date(now - 2000) })
      .mockResolvedValueOnce({ metricType: "NOISE", value: 42, time: new Date(now - 3000) })
      .mockResolvedValueOnce({ metricType: "OCCUPANCY", value: 12, time: new Date(now - 4000) });

    const { SensorService } = await import("../services/SensorService");
    const result = await SensorService.getSensorDataByRoom(2);

    // ThingsBoard must not be invoked and returned payload should include expected metric keys.
    expect(getTelemetryMock).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].readings.map((r) => r.metricKey).sort()).toEqual([
      "humidity",
      "light",
      "noise",
      "occupancy",
      "temperature",
    ]);
    expect(result[0].readings.find((r) => r.metricKey === "temperature")?.timeseries[0].value).toBe(21.5);
    // light is synthesised; ensure numeric value produced.
    expect(result[0].readings.find((r) => r.metricKey === "light")?.timeseries[0].value).toEqual(expect.any(Number));
  });

  it("uses only non-future DB readings for placeholder sensors", async () => {
    // Ensure queries include lte: Date to avoid returning future-dated readings.
    prismaMock.sensor.findMany.mockResolvedValue([
      { sensorId: 8, roomId: 4, deviceId: "TB_DEVICE_UUID_4" },
    ]);

    prismaMock.sensorReading.findFirst
      .mockResolvedValueOnce({ metricType: "TEMP", value: 22, time: new Date() })
      .mockResolvedValueOnce({ metricType: "HUMIDITY", value: 48, time: new Date() })
      .mockResolvedValueOnce({ metricType: "NOISE", value: 39, time: new Date() })
      .mockResolvedValueOnce({ metricType: "OCCUPANCY", value: 18, time: new Date() });

    const { SensorService } = await import("../services/SensorService");
    await SensorService.getSensorDataByRoom(4);

    expect(prismaMock.sensorReading.findFirst).toHaveBeenCalled();
    // verify the query uses time <= now and orders by most recent
    for (const call of prismaMock.sensorReading.findFirst.mock.calls) {
      expect(call[0]).toMatchObject({
        where: {
          roomId: 4,
          time: { lte: expect.any(Date) },
        },
        orderBy: { time: "desc" },
      });
    }
  });

  it("uses REAL_ROOM_DEVICE_ID when REAL_ROOM_ID matches sensor.roomId", async () => {
    // If REAL_ROOM_ID matches sensor.roomId, prefer REAL_ROOM_DEVICE_ID for telemetry.
    process.env.REAL_ROOM_SENSOR_ID = "999";
    process.env.REAL_ROOM_ID = "9";
    process.env.REAL_ROOM_DEVICE_ID = "real-device-by-room";

    prismaMock.sensor.findUnique.mockResolvedValue({
      sensorId: 10,
      roomId: 9,
      deviceId: "stale-device-id",
    });
    getTelemetryMock.mockResolvedValue({ temperature: [{ ts: 1, value: "24.0" }] });

    const { SensorService } = await import("../services/SensorService");
    await SensorService.getSensorData(10);

    expect(getTelemetryMock).toHaveBeenCalledWith("real-device-by-room", expect.any(Array), 1);
  });

  it("getSensorDataByRoom handles many concurrent telemetry calls promptly", async () => {
    // Stress: create many sensors and ensure parallel telemetry calls finish within a reasonable bound.
    const sensorCount = 60;
    prismaMock.sensor.findMany.mockResolvedValue(
      Array.from({ length: sensorCount }, (_, i) => ({ sensorId: i + 1, roomId: 99, deviceId: `device-${i}` }))
    );

    // Simulate immediate telemetry responses
    getTelemetryMock.mockResolvedValue({ temperature: [{ ts: 1, value: "1" }] });

    const { SensorService } = await import("../services/SensorService");
    const t0 = Date.now();
    const results = await SensorService.getSensorDataByRoom(99);
    const dur = Date.now() - t0;

    expect(results.length).toBe(sensorCount);
    expect(getTelemetryMock).toHaveBeenCalledTimes(sensorCount);
    expect(dur).toBeLessThan(2000); // local CI upper bound
  });

  it("saveSensorReadings continues when prisma.create fails for one reading", async () => {
    // One sensor's DB write fails; ensure other sensors still get saved and error is logged.
    prismaMock.sensor.findMany.mockResolvedValue([
      { sensorId: 10, roomId: 5, deviceId: "d-10" },
      { sensorId: 11, roomId: 5, deviceId: "d-11" },
    ]);

    getTelemetryMock
      .mockResolvedValueOnce({ temperature: [{ ts: 1000, value: "10" }] })
      .mockResolvedValueOnce({ temperature: [{ ts: 2000, value: "20" }] });

    let call = 0;
    prismaMock.sensorReading.create.mockImplementation(async (args: any) => {
      call += 1;
      if (call === 1) throw new Error("db write failed");
      return { id: call };
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { SensorService } = await import("../services/SensorService");

    await SensorService.saveSensorReadings(5);

    expect(prismaMock.sensorReading.create).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      `[SensorService] Failed for sensor 10:`,
      expect.any(Error)
    );
    // second sensor's create still called and counted
    expect(prismaMock.sensorReading.create).toHaveBeenCalledTimes(2);
  });

  it("getHourlyOccupancyAvg maps db rows into 24-length array", async () => {
    // $queryRaw returns sparse hourly rows; service must produce 24-length array with numeric values.
    (prismaMock as any).$queryRaw.mockResolvedValue([
      { hour: 0, avg: "1.5" },
      { hour: 12, avg: "3.25" },
      { hour: 23, avg: null },
    ]);

    const { SensorService } = await import("../services/SensorService");
    const result = await SensorService.getHourlyOccupancyAvg(7, 7);

    expect(result.length).toBe(24);
    expect(result[0]).toBe(1.5);
    expect(result[12]).toBe(3.25);
    // null averages should be treated as 0
    expect(result[23]).toBe(0);
  });
});