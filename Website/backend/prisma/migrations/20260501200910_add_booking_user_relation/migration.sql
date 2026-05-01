-- AlterTable
ALTER TABLE "RoomBooking" ADD COLUMN     "bookedByUserId" INTEGER;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_bookedByUserId_fkey" FOREIGN KEY ("bookedByUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
