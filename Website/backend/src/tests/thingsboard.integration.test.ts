import dotenv from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import getTelemetry from "../utils/thingsboard";
import { METRIC_KEYS } from "../utils/sensorNormaliser";
import { SensorService } from "../services/SensorService";

dotenv.config({ path: ".env", override: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  expect(value, `Missing ${name} in backend/.env`).toBeTruthy();
  return value as string;
}

describe("ThingsBoard live integration", () => {
  beforeAll(() => {
    console.info("[integration] Using backend/.env for live ThingsBoard checks");
    console.info("[integration] Fill THINGSBOARD_URL, THINGSBOARD_TOKEN and REAL_ROOM_DEVICE_ID before running npm run test:integration");
  });

  it("has required live integration env configured", () => {
    requireEnv("THINGSBOARD_URL");
    requireEnv("THINGSBOARD_TOKEN");
    requireEnv("REAL_ROOM_DEVICE_ID");
  });

  it("fetches live telemetry from ThingsBoard for REAL_ROOM_DEVICE_ID", async () => {
    const deviceId = requireEnv("REAL_ROOM_DEVICE_ID");

    const telemetry = await getTelemetry(deviceId, METRIC_KEYS, 1);
    console.info("[integration] Live ThingsBoard response:", JSON.stringify(telemetry, null, 2));

    expect(typeof telemetry).toBe("object");
  }, 20_000);

  it("has a Real Room in the database", async () => {
    const room = await prisma.room.findFirst({
      where: { name: "Real Room" },
      include: { sensors: true, building: true },
    });

    console.info("[integration] Real Room DB row:", JSON.stringify(room, null, 2));

    expect(room).toBeTruthy();
    expect(room?.sensors.length).toBeGreaterThan(0);
  });

  it("lets SensorService fetch live data for Real Room", async () => {
    const room = await prisma.room.findFirst({
      where: { name: "Real Room" },
    });

    expect(room, "Seed Real Room first with npx prisma db seed").toBeTruthy();

    const data = await SensorService.getSensorDataByRoom(room!.id);
    console.info("[integration] SensorService live result:", JSON.stringify(data, null, 2));

    expect(Array.isArray(data)).toBe(true);
  }, 20_000);
});