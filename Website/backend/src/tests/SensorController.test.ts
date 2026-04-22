import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const getSensorDataByRoomMock = vi.fn();

vi.mock("../services/SensorService", () => ({
  SensorService: {
    getSensorDataByRoom: getSensorDataByRoomMock,
  },
}));

function createMockResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("SensorController.getSensorData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid room id", async () => {
    const { SensorController } = await import("../controllers/SensorController");
    const req = { params: { id: "abc" } } as unknown as Request;
    const res = createMockResponse();

    await SensorController.getSensorData(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "Valid room ID is required" });
  });

  it("returns empty data with 200 when no telemetry exists", async () => {
    getSensorDataByRoomMock.mockResolvedValue([]);
    const { SensorController } = await import("../controllers/SensorController");
    const req = { params: { id: "18" } } as unknown as Request;
    const res = createMockResponse();

    await SensorController.getSensorData(req, res);

    expect(getSensorDataByRoomMock).toHaveBeenCalledWith(18);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it("returns service data with 200", async () => {
    getSensorDataByRoomMock.mockResolvedValue([
      { sensorId: 1, deviceId: "device-1", readings: [] },
    ]);
    const { SensorController } = await import("../controllers/SensorController");
    const req = { params: { id: "18" } } as unknown as Request;
    const res = createMockResponse();

    await SensorController.getSensorData(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ sensorId: 1, deviceId: "device-1", readings: [] }],
    });
  });
});