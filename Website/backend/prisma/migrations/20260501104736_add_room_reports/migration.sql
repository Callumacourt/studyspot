-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('DATA_QUALITY', 'SAFETY', 'ACCESSIBILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN');

-- AlterEnum
ALTER TYPE "MetricType" ADD VALUE 'LIGHT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managedUniversityId" INTEGER,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "RoomReport" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "reporterUserId" INTEGER,
    "category" "ReportCategory" NOT NULL DEFAULT 'OTHER',
    "message" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomReport_roomId_status_idx" ON "RoomReport"("roomId", "status");

-- CreateIndex
CREATE INDEX "RoomReport_reporterUserId_idx" ON "RoomReport"("reporterUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managedUniversityId_fkey" FOREIGN KEY ("managedUniversityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReport" ADD CONSTRAINT "RoomReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReport" ADD CONSTRAINT "RoomReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
