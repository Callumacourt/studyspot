# StudySpot

An IoT enabled study space searching solution. 
Combines:
- edge sensing (temperature, humidity, light, noise, occupancy),
- camera based occupancy validation via AI object detection,
- cloud telemetry publishing,
- a fullstack web app for discovery, filtering, booking, and administration of study rooms.

## Architecture Reference
<img width="1800" height="2160" alt="system_architecture(2)" src="https://github.com/user-attachments/assets/0ad1ee41-4fbf-4601-a192-b577148294ae" />


The production university deployment consumed telemetry from real IoT sensors via ThingsBoard behind the Cardiff University network. The public demo version uses simulated telemetry for accessibility and reliability.

- *The production university deployment consumed telemetry from real IoT sensors via ThingsBoard behind the Cardiff University network. The public demo version uses simulated telemetry for demonstration.*

## Snapshots

<img width="1863" height="898" alt="Screenshot from 2026-05-10 22-13-12" src="https://github.com/user-attachments/assets/a56ebfc5-8190-47e6-99cf-becad533ad6e" />
<img width="1863" height="898" alt="Screenshot from 2026-05-10 22-13-06" src="https://github.com/user-attachments/assets/426d3151-312d-4b8d-ba2a-1e580012db33" />

This README is the root setup and replication guide.

---

## 1) Folder and File Structure

### 1.1 Root layout
```text
studyspot_group2/
├── README.md
├── RoomSide_Code
│   ├── camera.py
│   ├── obj_detector.py
│   ├── room_manager.py
│   ├── runner.py
│   ├── studyspot_arduino.ino
│   ├── room_info.json
│   ├── detect.tflite
│   └── pi_requirements.txt
├── Testing
│   ├── studyspot_monitor.py
│   ├── cloud.py
│   ├── updated_cloud.py
│   ├── test.py
│   ├── buzzer.py
│   ├── buzzerRanger.py
│   ├── dht.py
│   ├── pir.py
│   ├── light.py
│   ├── sound.py
│   └── lcd.py
└── Website
    ├── backend
    │   ├── package.json
    │   ├── prisma
    │   │   ├── schema.prisma
    │   │   ├── seed.ts
    │   │   └── migrations
    │   └── src
    │       ├── app.ts
    │       ├── prisma.ts
    │       ├── controllers
    │       ├── services
    │       ├── routes
    │       ├── middleware
    │       ├── utils
    │       ├── tests
    │       └── generated/prisma
    └── frontend
        ├── package.json
        ├── vite.config.js
        ├── index.html
        ├── public
        └── src
            ├── App.jsx
            ├── main.jsx
            ├── routes.jsx
            ├── pages
            ├── components
            ├── hooks
            ├── utils
            └── types
```

### 1.2 Purpose of key folders/files

#### IoT and hardware testing scripts (`Testing/`)
- `studyspot_monitor.py`: standalone continuous sensor reader that emits JSON to stdout.
- `cloud.py`: integrated edge script (sensor ingestion + occupancy + LCD + MQTT publish + optional camera counting).
- `updated_cloud.py`: variant of `cloud.py` with adjusted runtime logic.
- `test.py`: hardware smoke test for buzzer, ultrasonic, DHT, PIR, light, sound, LCD.
- `buzzer.py`, `buzzerRanger.py`, `dht.py`, `pir.py`, `light.py`, `sound.py`, `lcd.py`: single sensor diagnostics.

#### IoT Platform Code (`RoomSide_Code/`)
- `runner.py`: launches `RoomManager` orchestration.
- `room_manager.py`: main orchestration class (occupancy, bluetooth ingestion, LCD updates, telemetry publish).
- `camera.py`: PiCamera wrapper for capture flows.
- `obj_detector.py`: TensorFlow Lite inference wrapper and person counting (`obj_class=0`).
- `detect.tflite`: detection model used by `obj_detector.py`.
- `room_info.json`: runtime configuration (ThingsBoard, LCD, occupancy timing, ports).
- `studyspot_arduino.ino` : Arduino sketch that performs environmental monitoring and formats it for bluetooth transmission
- `pi_requirements.txt`: dependencies in order to run this code on the pi

#### Web platform (`Website/`)

Backend (`Website/backend`)
- `src/app.ts`: Express app bootstrap, middleware, health endpoint, route mounting, periodic sensor sync trigger.
- `src/routes/`: endpoint grouping (`/api`, `/users`, admin, room, university, user).
- `src/controllers/`: HTTP request level validation/flow control.
- `src/services/`: business logic and DB operations.
- `src/middleware/auth.ts`: JWT verification and role checks.
- `src/utils/`: mapping, validation, telemetry helpers, ThingsBoard helper functions.
- `src/tests/`: unit/integration/NFR tests.
- `prisma/schema.prisma`: DB schema and relations.
- `prisma/seed.ts`: seeding for demo data and historical occupancy.
- `prisma/migrations/`: schema migration history.

Frontend (`Website/frontend`)
- `src/routes.jsx`: client route table.
- `src/pages/`: page-level views (home/search/room/auth/admin/favourites/bookings etc.).
- `src/components/`: reusable UI blocks.
- `src/hooks/`: reusable state/data hooks.
- `vite.config.js`: dev server config and backend proxy for `/api` and `/users`.

---

## 2) Setup Instructions

## 2.1 Prerequisites

### Core web stack
- Node.js 20+
- npm
- PostgreSQL 12+ (local or hosted)

### IoT edge stack (Raspberry Pi path)
- Raspberry Pi OS (or compatible Linux)
- GrovePi compatible board/sensors (as used in scripts)
- Python 3
- Camera module (if using object detection)
- Network access to ThingsBoard MQTT broker

## 2.2 Installation

### A) Clone and install web dependencies

```bash
git clone https://git.cardiff.ac.uk/c24069300/studyspot_group2
cd studyspot_group2/Website/backend
npm install
cd ../frontend
npm install
```

### B) Install Pi Python dependencies (Pi/device)

From `studyspot_group2/RoomSide_Code`, install packages listed in `pi_requirements.txt` and ensure correct Python version.

> Note: `pi_requirements.txt` contains both pip and apt installs. Install according to your OS package manager and Python environment.

## 2.3 Configuration

### A) Backend environment (`Website/backend/.env`)

Minimum required:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/studyspot"
JWT_SECRET="replace-with-a-strong-random-secret"
```

Optional (used by current code paths):

```env
THINGSBOARD_URL="https://thingsboard.example.com"
THINGSBOARD_TOKEN=""
THINGSBOARD_REFRESH_TOKEN=""
THINGSBOARD_EMAIL=""
THINGSBOARD_PASSWORD=""
SENSOR_SYNC_INTERVAL_MS=60000
REAL_ROOM_ID=9 
REAL_ROOM_SENSOR_ID=9
REAL_ROOM_DEVICE_ID=""
SUPER_ADMIN_EMAILS="admin1@cardiff.ac.uk,admin2@cardiff.ac.uk" // register with this email to create an admin account
```

### B) Room manager runtime config (`RoomSide_Code/room_info.json`)

Update these for your deployment:
- bluetooth serial port/baud,
- ThingsBoard host/token/topic,
- occupancy timing thresholds,
- ultrasonic sensor GPIO pin mapping,
- LCD I2C addresses/cycle period.

## 3) Running the Project

## 3.1 Web platform

### 1) Database migration + seed

```bash
cd studyspot_group2/Website/backend
npx prisma migrate dev
npx tsx prisma/seed.ts
```

Seeded test account:
- email: `testuser@gmail.com`
- password: `password`

### 2) Start backend

```bash
cd studyspot_group2/Website/backend
npx tsx src/app.ts
```

Expected startup behavior:
- API listens on port `3000`
- health endpoint available at `GET /healthz`
- periodic sensor sync runs (unless `NODE_ENV=test`)

### 3) Start frontend

```bash
cd studyspot_group2/Website/frontend
npm run dev
```

Expected behavior:
- Vite serves frontend on `http://localhost:5173`
- API requests to `/api` and `/users` proxy to backend on `http://localhost:3000`

## 3.2 IoT / hardware scripts

### Hardware quick test

```bash
cd studyspot_group2/Testing
python3 test.py
```

Expected behavior:
- sequential pass/fail output for each sensor,
- LCD status summary at end.

### Continuous sensor JSON stream

```bash
cd studyspot_group2/Testing
python3 studyspot_monitor.py
```

Expected behavior:
- periodic JSON payloads printed to stdout containing valid sensor keys.

### Integrated cloud telemetry (MQTT)

```bash
cd studyspot_group2/Testing
python3 cloud.py
```

Expected behavior:
- MQTT connection logs,
- periodic publish confirmation,
- occupancy and environment values pushed to ThingsBoard topic.

### Room Manager

```bash
cd studyspot_group2/Testing/ObjectDetection
python3 runner.py
```

Expected behavior:
- starts occupancy + bluetooth + LCD + periodic telemetry loop,
- uses TFLite model and camera snapshots for occupancy reconciliation.

---

## 4) Third-Party Software and Frameworks

## 4.1 Web app dependencies 

### Frontend (`Website/frontend/package.json`)
- `react` `^19.2.0` — component UI framework  
	Docs: https://react.dev/
- `react-dom` `^19.2.0` — browser renderer for React  
	Docs: https://react.dev/reference/react-dom
- `react-router-dom` `^7.13.1` — client routing/navigation  
	Docs: https://reactrouter.com/
- `axios` `^1.13.6` — HTTP client for API calls  
	Docs: https://axios-http.com/
- `react-select` `^5.10.2` — advanced select/dropdown UI controls  
	Docs: https://react-select.com/home
- `recharts` `^3.8.1` — charting/visualisation of room metrics  
	Docs: https://recharts.org/
- `vite` `^7.3.1` + `@vitejs/plugin-react` `^5.1.1` — dev server/build pipeline  
	Docs: https://vite.dev/ and https://github.com/vitejs/vite-plugin-react
- `eslint` `^9.39.1` (+ plugins) — static linting and code quality  
	Docs: https://eslint.org/

### Backend (`Website/backend/package.json`)
- `express` `^5.2.1` — REST API server and middleware pipeline  
	Docs: https://expressjs.com/
- `@prisma/client` `^7.5.0` + `prisma` `^7.5.0` + `@prisma/adapter-pg` `^7.5.0` — ORM, migrations, typed DB access  
	Docs: https://www.prisma.io/docs
- `pg` `^8.20.0` — PostgreSQL driver  
	Docs: https://node-postgres.com/
- `cors` `^2.8.6` — cross-origin request handling  
	Docs: https://www.npmjs.com/package/cors
- `jsonwebtoken` `^9.0.3` — JWT auth signing/verification  
	Docs: https://github.com/auth0/node-jsonwebtoken
- `bcrypt` `^6.0.0` — password hashing  
	Docs: https://github.com/kelektiv/node.bcrypt.js
- `zxcvbn` `^4.4.2` — password strength estimation  
	Docs: https://github.com/dropbox/zxcvbn
- `vitest` `^3.2.4` + `supertest` `^7.1.1` — backend test runner + HTTP integration tests  
	Docs: https://vitest.dev/ and https://github.com/ladjs/supertest

## 4.2 IoT / edge dependencies

### Object detection (`Testing/ObjectDetection/rqs.txt`)
- `numpy==1.21.2` — array/matrix operations for pre/post-processing  
	Docs: https://numpy.org/
- `tflite-runtime==2.13.0` — TensorFlow Lite runtime for on device inference  
	Docs: https://www.tensorflow.org/lite/guide/python
- `python3-opencv=4.5.1` — image processing used by detector pipeline  
	Docs: https://opencv.org/
- `python3-picamera=1.13` — Raspberry Pi camera interface  
	Docs: https://picamera.readthedocs.io/

### Additional Python modules used by scripts
- `grovepi` — GrovePi hardware IO
- `grove_rgb_lcd` — Grove RGB LCD control
- `paho-mqtt` — MQTT publish/subscribe client  
	Docs: https://eclipse.dev/paho/
- `pyserial` (`serial`) — serial comms (bluetooth/attached modules)  
	Docs: https://pyserial.readthedocs.io/
- `smbus` — I2C comms for LCD and peripherals

### Object Detection Model
For this project we used a pre-trained tensorflow model made for mobile/microcontroller devices made by OpenVino.
It's github page can be found here:
https://github.com/openvinotoolkit/open_model_zoo/blob/master/models/public/ssd_mobilenet_v1_coco/ 
and a pretrained,prebuilt version of the model was obtained from:
https://storage.googleapis.com/download.tensorflow.org/models/tflite/coco_ssd_mobilenet_v1_1.0_quant_2018_06_29.zip

---

## 5) Code Documentation Approach

The codebase uses multiple documentation layers:
- inline comments for hardware timing thresholds, bus/pin mappings, and route intent,
- docstrings in Python monitoring scripts (for sensor read functions),
- clear separation by responsibility (`routes` → `controllers` → `services`),
- seeded data and migration history for reproducibility,
- test files as executable behavioural documentation.

Primary documentation-rich files:
- `RoomSide_Code/room_manager.py`
- `RoomSide_Code/camera.py`
- `RoomSide_Code/obj_detector.py`
- `Website/backend/src/app.ts`
- `Website/backend/prisma/seed.ts`

---

## 6) Troubleshooting

### Database connection fails
- Symptom: backend exits on startup/queries fail.
- Fix:
	- verify `DATABASE_URL`,
	- ensure PostgreSQL is running and reachable,
	- run migrations before seeding.

### JWT/auth endpoints fail
- Symptom: login/register/authenticated routes return auth errors.
- Fix:
	- set `JWT_SECRET`,
	- ensure frontend sends bearer token for protected endpoints.

### Frontend cannot reach backend
- Symptom: network/API errors in browser.
- Fix:
	- ensure backend is running on port `3000`,
	- ensure frontend is running via Vite (proxy config enabled),
	- check CORS and local firewall rules.

### Prisma seed errors
- Symptom: seed script fails due to schema mismatch.
- Fix:
	- run `npx prisma migrate dev` first,
	- then rerun `npx tsx prisma/seed.ts`.

### IoT scripts cannot publish telemetry
- Symptom: MQTT connect/publish failures.
- Fix:
	- verify ThingsBoard host/token,
	- verify network and broker port `1883`,
	- confirm telemetry topic path (`v1/devices/me/telemetry`).

### No camera detections
- Symptom: occupancy from camera always zero or runtime errors.
- Fix:
	- verify camera module availability and permissions,
	- verify `detect.tflite` path,
	- ensure OpenCV + TFLite runtime are installed.

### Grove sensor read errors
- Symptom: intermittent `None`/invalid readings.
- Fix:
	- verify sensor wiring and correct pin mapping,
	- verify GrovePi bus setup,
	- allow warm-up time for DHT and PIR sensors.

---

## 7) Verification Commands (quick reference)

```bash
# backend tests
cd Website/backend && npm test
cd Website/backend && npm run test:integration
cd Website/backend && npm run test:nfr

# frontend quality/build
cd Website/frontend && npm run lint
cd Website/frontend && npm run build

# edge hardware check
cd Testing && python3 test.py
```

---
