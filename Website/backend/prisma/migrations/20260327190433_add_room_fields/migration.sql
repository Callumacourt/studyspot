-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "accessibility" TEXT[],
ADD COLUMN     "free" INTEGER,
ADD COLUMN     "humidity" INTEGER,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "noise" TEXT,
ADD COLUMN     "occupancyPercent" INTEGER,
ADD COLUMN     "occupied" INTEGER,
ADD COLUMN     "temperature" INTEGER;
