-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('TEMP', 'HUMIDITY', 'NOISE', 'OCCUPANCY');

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "roomName" TEXT NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorReading" (
    "readingId" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("readingId")
);

-- CreateTable
CREATE TABLE "OccupancyAverage" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "averangeOccupancy" INTEGER NOT NULL,

    CONSTRAINT "OccupancyAverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sensor" (
    "sensorId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("sensorId")
);

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupancyAverage" ADD CONSTRAINT "OccupancyAverage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
