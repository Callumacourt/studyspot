import axios from "axios";
import { prisma } from "../prisma";
import type { Sensor } from "../generated/prisma/client";

const TB_URL = (process.env.THINGSBOARD_URL || "").replace(/\/$/, "");
const TB_TOKEN = process.env.THINGSBOARD_TOKEN;

/** fetch timeseries from ThingsBoard api */
async function getTelemetry(deviceId: string, keys: string[]): Promise<any> {
  if (!TB_URL) throw new Error("THINGSBOARD_URL not configured");
  if (!TB_TOKEN) throw new Error("THINGSBOARD_TOKEN not configured");

  const url = `${TB_URL}/api/plugins/telemetry/DEVICE/${encodeURIComponent(
    deviceId
  )}/values/timeseries?keys=${keys.join(",")}`;

  const headers = { Authorization: `Bearer ${TB_TOKEN}` };
  const resp = await axios.get(url, { headers, timeout: 10000 });
  return resp.data;
}

export const SensorService = {
  async getSensorData(sensorId: number) {
    const sensor = await prisma.sensor.findUnique({
      where: { sensorId },
    });

    if (!sensor) throw new Error("Sensor not found");
    if (!sensor.deviceId) throw new Error("No ThingsBoard deviceId linked to sensor");

    const keys = ["temperature", "humidity", "noise", "occupancy"];
    const data = await getTelemetry(sensor.deviceId, keys);

    return Object.entries(data).map(([k, arr]) => ({
      sensorId: sensor.sensorId,
      deviceId: sensor.deviceId,
      metricKey: k,
      timeseries: arr,
    }));
  },

  async getSensorDataByRoom(roomId: number) {
    const sensors = await prisma.sensor.findMany({
      where: { roomId },
    });

    if (sensors.length === 0) throw new Error("No sensors found for room");

    const keys = ["temperature", "humidity", "noise", "occupancy"];
    const sensorsWithDevice = sensors.filter((s: Sensor) => !!s.deviceId);

    if (sensorsWithDevice.length === 0) {
      throw new Error("No ThingsBoard device linked for sensors in this room");
    }

    return Promise.all(
      sensorsWithDevice.map(async (s: Sensor) => {
        const data = await getTelemetry(s.deviceId as string, keys);
        return {
          sensorId: s.sensorId,
          deviceId: s.deviceId,
          readings: Object.entries(data).map(([k, arr]) => ({
            metricKey: k,
            timeseries: arr,
          })),
        };
      })
    );
  },
};


