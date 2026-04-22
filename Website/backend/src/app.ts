import "dotenv/config";
import sensorRoute from "./routes/sensorRoute";
import loginRoute from "./routes/LoginRoute";
import registerRoute from "./routes/RegisterRoute";
import roomRoute from "./routes/RoomRoute";
import { SensorService } from "./services/SensorService";
import cors from "cors";

const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Mount all sensor related API routes at /api
app.use("/api", sensorRoute);
app.use("/users", registerRoute);
app.use("/users", loginRoute);
app.use("/api/rooms", roomRoute);

if (process.env.NODE_ENV !== "test") {
  const syncIntervalMs = Number(process.env.SENSOR_SYNC_INTERVAL_MS ?? 60_000);
  let syncInProgress = false;

  const runSync = async () => {
    if (syncInProgress) {
      console.warn("[App] Sensor sync skipped (previous run still in progress)");
      return;
    }

    syncInProgress = true;
    try {
      console.log("[App] Starting sensor sync...");
      await SensorService.syncAllSensors();
    } catch (error) {
      console.error("[App] Sensor sync failed:", error);
    } finally {
      syncInProgress = false;
    }
  };

  // Do one sync at startup, then repeat
  void runSync();
  setInterval(runSync, syncIntervalMs);

  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

export default app;
