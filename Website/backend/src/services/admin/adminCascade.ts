import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../prisma";
import { AdminError } from "./adminErrors";

export async function getUniversityIdForBuilding(buildingId: number): Promise<number> {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { universityId: true },
  });

  if (!building) throw new AdminError("Building not found", 404);
  return building.universityId;
}

export async function getUniversityIdForRoom(roomId: number): Promise<number> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { building: { select: { universityId: true } } },
  });

  if (!room) throw new AdminError("Room not found", 404);
  return room.building.universityId;
}

export async function deleteRoomCascade(tx: Prisma.TransactionClient, roomId: number) {
  await tx.room.update({ where: { id: roomId }, data: { favouritedByUsers: { set: [] } } });
  await tx.sensorReading.deleteMany({ where: { roomId } });
  await tx.occupancyAverage.deleteMany({ where: { roomId } });
  await tx.sensor.deleteMany({ where: { roomId } });
  await tx.room.delete({ where: { id: roomId } });
}

export async function deleteBuildingCascade(tx: Prisma.TransactionClient, buildingId: number) {
  const rooms = await tx.room.findMany({ where: { buildingId }, select: { id: true } });
  for (const room of rooms) {
    await deleteRoomCascade(tx, room.id);
  }
  await tx.building.delete({ where: { id: buildingId } });
}

export async function deleteUniversityCascade(tx: Prisma.TransactionClient, universityId: number) {
  const buildings = await tx.building.findMany({ where: { universityId }, select: { id: true } });
  for (const building of buildings) {
    await deleteBuildingCascade(tx, building.id);
  }

  const affectedUsers = await tx.user.findMany({
    where: { managedUniversityId: universityId },
    select: { userId: true, role: true },
  });

  for (const user of affectedUsers) {
    await tx.user.update({
      where: { userId: user.userId },
      data: {
        managedUniversityId: null,
        role: user.role === "UNIVERSITY_ADMIN" ? "USER" : user.role,
      },
    });
  }

  await tx.university.delete({ where: { id: universityId } });
}
