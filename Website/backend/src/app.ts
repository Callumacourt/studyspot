import "dotenv/config";
import sensorRoute from "./routes/sensorRoute";
import loginRoute from "./routes/LoginRoute";
import registerRoute from "./routes/RegisterRoute";
import roomRoute from "./routes/RoomRoute";
import universityRoute from "./routes/UniversityRoute";
import adminRoute from "./routes/AdminRoute";
import userRoute from "./routes/UserRoute";
import { SensorService } from "./services/SensorService";
import cors from "cors";

const express = require('express');
const app = express();
const port = 3000;

/* Basic middleware
   - parse JSON bodies
   - enable CORS for browser clients
   - remove X Powered-By header to avoid leaking framework info */
app.use(express.json());
app.use(cors());
app.disable("x-powered-by");

/* Lightweight healthcheck used by probes and tests. */
app.get("/healthz", (_req: any, res: any) => {
  return res.status(200).json({ success: true, status: "ok", ts: Date.now() });
});

console.log("DATABASE_URL:", process.env.DATABASE_URL);

/* Mount API routes
   - /api          : sensor-related endpoints
   - /users        : registration + login
   - /api/rooms    : room listing and filters
   - /api/universities : university metadata */
app.use("/api", sensorRoute);
app.use("/users", registerRoute);
app.use("/users", loginRoute);
app.use("/api/rooms", roomRoute);
app.use("/api/universities", universityRoute);
app.use("/api/admin", adminRoute);
app.use("/api/user", userRoute);

/* Periodic background sync of sensors (disabled during tests)
   - guarded by NODE_ENV !== "test" to keep unit tests deterministic
   - uses a simple mutex (syncInProgress) to avoid overlapping runs
   - runs once on startup then at SENSOR_SYNC_INTERVAL_MS (default 60s) */
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

  // perform an immediate sync at startup, then schedule repeating syncs
  void runSync();
  setInterval(runSync, syncIntervalMs);

  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

export default app;
