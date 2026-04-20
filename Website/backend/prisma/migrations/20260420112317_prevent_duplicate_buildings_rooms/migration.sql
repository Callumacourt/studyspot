/*
  Warnings:

  - A unique constraint covering the columns `[universityId,name]` on the table `Building` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[buildingId,name]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "groundFloor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasAdjustableDesks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hearingAssistance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wheelchairAccessible" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Building_universityId_name_key" ON "Building"("universityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Room_buildingId_name_key" ON "Room"("buildingId", "name");
