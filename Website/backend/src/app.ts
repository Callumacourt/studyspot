import sensorRoute from "./routes/sensorRoute";

const express = require('express');
const app = express();
const port = 3000;
const axios = require('axios');
const router = express.Router();

app.use(express.json());

// Thingsboard API call routes
app.use("/api", sensorRoute);

app.listen(port, () => {
    console.log(`Server listening at ht\tp://localhost:${port}`);
});
