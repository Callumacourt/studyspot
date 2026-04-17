import "dotenv/config";
import sensorRoute from "./routes/sensorRoute";
import loginRoute from "./routes/LoginRoute";
import registerRoute from "./routes/RegisterRoute";
import roomRoute from "./routes/RoomRoute";
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

app.listen(port, () => {
    console.log(`Server listening at ht\tp://localhost:${port}`);
});
