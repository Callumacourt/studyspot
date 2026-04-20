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

// Sync sensor data every 60 seconds
setInterval(async () => {
  try {
    console.log("[App] Starting sensor sync...");
    await SensorService.syncAllSensors();
  } catch (error) {
    console.error("[App] Sensor sync failed:", error);
  }
}, 60_000); // 1 minute

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
