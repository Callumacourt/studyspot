import sensorRoute from "./routes/sensorRoute";

const express = require('express');
const app = express();
const port = 3000;
const axios = require('axios');
const router = express.Router();

app.use(express.json());

// Mount all sensor related API routes at /api
app.use("/api", sensorRoute);

app.listen(port, () => {
    console.log(`Server listening at ht\tp://localhost:${port}`);
});
