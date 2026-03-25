# StudySpot

A full stack web application for tracking room occupancy and environmental metrics in real time using IoT sensors and object detection.

## Table of Contents
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)


## Tech Stack

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **IoT Platform:** ThingsBoard (for sensor data ingestion)
- **HTTP Client:** Axios (for ThingsBoard API calls)

### Frontend
- **Framework:** React with Vite
- **Language:** JavaScript/JSX
- **Styling:** CSS Modules
- **Routing:** React Router


## Project Structure

StudySpot/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Express app setup
│   │   ├── controllers/        # HTTP request handlers
│   │   ├── services/           # Business logic
│   │   ├── routes/             # API route definitions
│   │   ├── middleware/         # Express middleware (auth, parsing, etc.)
│   │   ├── config/             # Configuration files
│   │   ├── utils/              # Utility functions
│   │   └── generated/          # Prisma-generated files (auto)
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Database migrations
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx            # Entry point
│   │   ├── App.jsx             # Root component
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── styles/             # CSS modules
│   │   ├── routes.jsx          # Route definitions
│   │   └── assets/             # Images, icons, etc.
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md

## Prerequisites (Make sure these are installed first)

### Required
- **Node.js** (v16+)
- **npm** or **yarn**
- **PostgreSQL** (v12+)
- **Git**

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/StudySpot.git
cd StudySpot
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Database Setup
```bash
# Ensure PostgreSQL is running
sudo service postgresql start

# Set up the database (from backend directory)
cd ../backend
npx prisma migrate dev --name init
```

## Configuration

### Backend Environment Variables
Create a `backend/.env` file:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres" 
THINGSBOARD_URL="http://localhost:8080"
THINGSBOARD_API_KEY="your_api_key_here"
POLLING_INTERVAL=60000
PORT=3000
NODE_ENV=development
```

### Frontend Environment Variables
Create a `frontend/.env` file:
```
VITE_API_URL="http://localhost:3000/api"
```

## Running the Application

### Backend
```bash
cd backend
npx tsx src/app.ts
```
Server runs at `http://localhost:3000` 

### Frontend
```bash
cd frontend
npm run dev
```
App runs at `http://localhost:5173`

------- END OF SETUP ------

## API Documentation

### GET `/api/sensordata/:roomId`
Fetch sensor readings for a specific room.

**Parameters:**
- `roomId` (number): Room ID

**Response:**
```json
{
  "101": { "metricType": "OCCUPANCY", "value": 5, "time": "2026-03-21T12:00:00Z" },
  "102": { "metricType": "TEMP", "value": 22.5, "time": "2026-03-21T12:00:00Z" }
}
```

## Database Schema

### Room
- `id` (PK): Auto-increment integer
- `roomName`: String (room identifier)
- Relations: One-to-many with `SensorReading`, `Sensor`, `OccupancyAverage`

### SensorReading
- `readingId` (PK): Auto-increment integer
- `roomId` (FK): Foreign key to `Room`
- `metricType`: Enum (TEMP, HUMIDITY, NOISE, OCCUPANCY)
- `value`: Float
- `time`: DateTime

### OccupancyAverage
- `id` (PK): Auto-increment integer
- `roomId` (FK): Foreign key to `Room`
- `dayOfWeek`: Integer (0=Monday, 6=Sunday)
- `hour`: Integer (0=midnight, 23=11PM)
- `averageOccupancy`: Integer

### Sensor
- `sensorId` (PK): Integer
- `roomId` (FK): Foreign key to `Room`

### Data Flow
```
Physical Sensors → ThingsBoard → Backend Polling Service → Database → Frontend
```
