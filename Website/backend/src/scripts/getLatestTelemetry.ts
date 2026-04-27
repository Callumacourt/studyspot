import "dotenv/config";
import getTelemetry from "../utils/thingsboard";

async function main() {
  const [,, deviceId, key] = process.argv;
  if (!deviceId) {
    console.error("Usage: npx tsx src/scripts/getLatestTelemetry.ts <deviceId> [key1,key2]");
    process.exit(2);
  }

  const keys = key ? key.split(",").map((k) => k.trim()) : ["temperature"];

  try {
    const res = await getTelemetry(deviceId, keys as readonly string[], 1);
    console.log("Latest telemetry for device", deviceId);
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err: any) {
    console.error("Failed to fetch telemetry:", err?.message ?? err);
    process.exit(1);
  }
}

void main();
