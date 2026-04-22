import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
};

const getTelemetryMock = vi.fn();

vi.mock("../prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("../utils/thingsboard", () => ({
  default: getTelemetryMock,
}));

describe("SensorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty array when a room has no sensors", async () => {
    prismaMock.sensor.findMany.mockResolvedValue([]);
    const { SensorService } = await import("../services/SensorService");

    await expect(SensorService.getSensorDataByRoom(18)).resolves.toEqual([]);
    expect(getTelemetryMock).not.toHaveBeenCalled();
  });

  it("logs rejected telemetry calls and returns successful sensor data only", async () => {
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

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ sensorId: 1, deviceId: "device-a" });
    expect(errorSpy).toHaveBeenCalledWith(
      "[SensorService] sensor 2 failed:",
      expect.any(Error)
    );
  });

  it("only persists numeric readings and skips non-numeric values", async () => {
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
});