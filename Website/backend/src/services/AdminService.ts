import { Prisma } from "../generated/prisma/client";
import { prisma } from "../prisma";
import type { AdminAuthContext, UserRole } from "../utils/adminAccess";

class AdminError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function assertSuperAdmin(auth: AdminAuthContext) {
  if (auth.role !== "SUPER_ADMIN") {
    throw new AdminError("Super admin access required", 403);
  }
}

async function getUniversityIdForBuilding(buildingId: number): Promise<number> {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { universityId: true },
  });

  if (!building) throw new AdminError("Building not found", 404);
  return building.universityId;
}

async function getUniversityIdForRoom(roomId: number): Promise<number> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { building: { select: { universityId: true } } },
  });

  if (!room) throw new AdminError("Room not found", 404);
  return room.building.universityId;
}

async function assertCanManageUniversity(auth: AdminAuthContext, universityId: number) {
  if (auth.role === "SUPER_ADMIN") return;
  if (auth.role !== "UNIVERSITY_ADMIN") {
    throw new AdminError("Admin access required", 403);
  }
  if (!auth.managedUniversityId || auth.managedUniversityId !== universityId) {
    throw new AdminError("You can only manage your assigned university", 403);
  }
}

function ensureName(name: unknown, label: string): string {
  const value = String(name ?? "").trim();
  if (!value) throw new AdminError(`${label} is required`);
  return value;
}

function ensureBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function ensureNumber(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AdminError(`${label} must be a positive integer`);
  }
  return parsed;
}

function handlePrismaError(error: unknown): never {
  if (error instanceof AdminError) throw error;

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new AdminError("A record with those details already exists", 409);
  }

  throw error;
}

async function deleteRoomCascade(tx: Prisma.TransactionClient, roomId: number) {
  await tx.room.update({
    where: { id: roomId },
    data: { favouritedByUsers: { set: [] } },
  });
  await tx.sensorReading.deleteMany({ where: { roomId } });
  await tx.occupancyAverage.deleteMany({ where: { roomId } });
  await tx.sensor.deleteMany({ where: { roomId } });
  await tx.room.delete({ where: { id: roomId } });
}

async function deleteBuildingCascade(tx: Prisma.TransactionClient, buildingId: number) {
  const rooms = await tx.room.findMany({ where: { buildingId }, select: { id: true } });
  for (const room of rooms) {
    await deleteRoomCascade(tx, room.id);
  }
  await tx.building.delete({ where: { id: buildingId } });
}

async function deleteUniversityCascade(tx: Prisma.TransactionClient, universityId: number) {
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

export const AdminService = {
  async getSummary(auth: AdminAuthContext) {
    const accessibleUniversityIds =
      auth.role === "SUPER_ADMIN"
        ? undefined
        : auth.managedUniversityId
        ? [auth.managedUniversityId]
        : [];

    const universityWhere = accessibleUniversityIds
      ? { id: { in: accessibleUniversityIds } }
      : undefined;

    const [universities, buildingsCount, roomsCount, usersCount] = await Promise.all([
      prisma.university.findMany({
        where: universityWhere,
        orderBy: { name: "asc" },
        include: {
          buildings: {
            include: {
              _count: { select: { rooms: true } },
            },
            orderBy: { name: "asc" },
          },
          administrators: {
            select: {
              userId: true,
              email: true,
              role: true,
              managedUniversityId: true,
            },
            orderBy: { email: "asc" },
          },
          _count: { select: { buildings: true } },
        },
      }),
      prisma.building.count({
        where:
          accessibleUniversityIds !== undefined
            ? { universityId: { in: accessibleUniversityIds } }
            : undefined,
      }),
      prisma.room.count({
        where:
          accessibleUniversityIds !== undefined
            ? { building: { universityId: { in: accessibleUniversityIds } } }
            : undefined,
      }),
      auth.role === "SUPER_ADMIN" ? prisma.user.count() : Promise.resolve(undefined),
    ]);

    return {
      scope: auth.role === "SUPER_ADMIN" ? "platform" : "university",
      counts: {
        universities: universities.length,
        buildings: buildingsCount,
        rooms: roomsCount,
        users: usersCount ?? null,
      },
      universities: universities.map((university) => ({
        id: university.id,
        name: university.name,
        buildingCount: university._count.buildings,
        roomCount: university.buildings.reduce((sum, building) => sum + building._count.rooms, 0),
        administrators: university.administrators,
      })),
    };
  },

  async getUniversities(auth: AdminAuthContext) {
    if (auth.role === "SUPER_ADMIN") {
      return prisma.university.findMany({
        orderBy: { name: "asc" },
        include: {
          buildings: {
            include: { _count: { select: { rooms: true } } },
            orderBy: { name: "asc" },
          },
          administrators: {
            select: {
              userId: true,
              email: true,
              role: true,
              managedUniversityId: true,
            },
            orderBy: { email: "asc" },
          },
        },
      });
    }

    if (!auth.managedUniversityId) return [];
    return prisma.university.findMany({
      where: { id: auth.managedUniversityId },
      orderBy: { name: "asc" },
      include: {
        buildings: {
          include: { _count: { select: { rooms: true } } },
          orderBy: { name: "asc" },
        },
        administrators: {
          select: {
            userId: true,
            email: true,
            role: true,
            managedUniversityId: true,
          },
          orderBy: { email: "asc" },
        },
      },
    });
  },

  async createUniversity(auth: AdminAuthContext, payload: { name: unknown }) {
    assertSuperAdmin(auth);
    try {
      return await prisma.university.create({
        data: { name: ensureName(payload.name, "University name") },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  },

  async updateUniversity(auth: AdminAuthContext, universityId: number, payload: { name: unknown }) {
    assertSuperAdmin(auth);
    try {
      return await prisma.university.update({
        where: { id: universityId },
        data: { name: ensureName(payload.name, "University name") },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  },

  async deleteUniversity(auth: AdminAuthContext, universityId: number) {
    assertSuperAdmin(auth);

    const impact = await prisma.university.findUnique({
      where: { id: universityId },
      include: {
        buildings: {
          include: { _count: { select: { rooms: true } } },
        },
      },
    });

    if (!impact) throw new AdminError("University not found", 404);

    await prisma.$transaction(async (tx) => {
      await deleteUniversityCascade(tx, universityId);
    });

    return {
      deletedUniversityId: universityId,
      deletedBuildings: impact.buildings.length,
      deletedRooms: impact.buildings.reduce((sum, building) => sum + building._count.rooms, 0),
    };
  },

  async getBuildings(auth: AdminAuthContext, universityId?: number) {
    if (auth.role !== "SUPER_ADMIN" && !auth.managedUniversityId) {
      return [];
    }

    const scopedUniversityId =
      auth.role === "SUPER_ADMIN"
        ? universityId
        : auth.managedUniversityId ?? undefined;

    if (scopedUniversityId) {
      await assertCanManageUniversity(auth, scopedUniversityId);
    }

    return prisma.building.findMany({
      where: scopedUniversityId ? { universityId: scopedUniversityId } : undefined,
      orderBy: [{ universityId: "asc" }, { name: "asc" }],
      include: {
        university: { select: { id: true, name: true } },
        _count: { select: { rooms: true } },
      },
    });
  },

  async createBuilding(auth: AdminAuthContext, payload: { universityId: unknown; name: unknown }) {
    const universityId = ensureNumber(payload.universityId, "University id");
    await assertCanManageUniversity(auth, universityId);

    try {
      return await prisma.building.create({
        data: {
          universityId,
          name: ensureName(payload.name, "Building name"),
        },
        include: { university: { select: { id: true, name: true } } },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  },

  async updateBuilding(auth: AdminAuthContext, buildingId: number, payload: { name: unknown }) {
    const universityId = await getUniversityIdForBuilding(buildingId);
    await assertCanManageUniversity(auth, universityId);

    try {
      return await prisma.building.update({
        where: { id: buildingId },
        data: { name: ensureName(payload.name, "Building name") },
        include: { university: { select: { id: true, name: true } } },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  },

  async deleteBuilding(auth: AdminAuthContext, buildingId: number) {
    const universityId = await getUniversityIdForBuilding(buildingId);
    await assertCanManageUniversity(auth, universityId);

    const impact = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { _count: { select: { rooms: true } } },
    });

    if (!impact) throw new AdminError("Building not found", 404);

    await prisma.$transaction(async (tx) => {
      await deleteBuildingCascade(tx, buildingId);
    });

    return { deletedBuildingId: buildingId, deletedRooms: impact._count.rooms };
  },

  async getRooms(auth: AdminAuthContext, filters: { buildingId?: number; universityId?: number }) {
    if (auth.role !== "SUPER_ADMIN" && !auth.managedUniversityId) {
      return [];
    }

    const scopedUniversityId =
      auth.role === "SUPER_ADMIN"
        ? filters.universityId
        : auth.managedUniversityId ?? undefined;

    if (scopedUniversityId) {
      await assertCanManageUniversity(auth, scopedUniversityId);
    }

    return prisma.room.findMany({
      where: {
        ...(filters.buildingId ? { buildingId: filters.buildingId } : {}),
        ...(scopedUniversityId ? { building: { universityId: scopedUniversityId } } : {}),
      },
      orderBy: [{ buildingId: "asc" }, { name: "asc" }],
      include: {
        building: {
          select: {
            id: true,
            name: true,
            university: { select: { id: true, name: true } },
          },
        },
        sensors: {
          select: { sensorId: true, name: true, deviceId: true },
          orderBy: { sensorId: "asc" },
        },
      },
    });
  },

  async createRoom(
    auth: AdminAuthContext,
    payload: {
      buildingId: unknown;
      name: unknown;
      wheelchairAccessible?: unknown;
      hasAdjustableDesks?: unknown;
      groundFloor?: unknown;
      hearingAssistance?: unknown;
    }
  ) {
    const buildingId = ensureNumber(payload.buildingId, "Building id");
    const universityId = await getUniversityIdForBuilding(buildingId);
    await assertCanManageUniversity(auth, universityId);

    try {
      return await prisma.room.create({
        data: {
          buildingId,
          name: ensureName(payload.name, "Room name"),
          wheelchairAccessible: ensureBoolean(payload.wheelchairAccessible),
          hasAdjustableDesks: ensureBoolean(payload.hasAdjustableDesks),
          groundFloor: ensureBoolean(payload.groundFloor),
          hearingAssistance: ensureBoolean(payload.hearingAssistance),
        },
        include: {
          building: {
            select: {
              id: true,
              name: true,
              university: { select: { id: true, name: true } },
            },
          },
          sensors: {
            select: { sensorId: true, name: true, deviceId: true },
            orderBy: { sensorId: "asc" },
          },
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  },

  async updateRoom(
    auth: AdminAuthContext,
    roomId: number,
    payload: {
      buildingId: unknown;
      name: unknown;
      wheelchairAccessible?: unknown;
      hasAdjustableDesks?: unknown;
      groundFloor?: unknown;
      hearingAssistance?: unknown;
    }
  ) {
    const targetBuildingId = ensureNumber(payload.buildingId, "Building id");
    const targetUniversityId = await getUniversityIdForBuilding(targetBuildingId);
    const currentUniversityId = await getUniversityIdForRoom(roomId);

    await assertCanManageUniversity(auth, currentUniversityId);
    await assertCanManageUniversity(auth, targetUniversityId);

    try {
      return await prisma.room.update({
        where: { id: roomId },
        data: {
          buildingId: targetBuildingId,
          name: ensureName(payload.name, "Room name"),
          wheelchairAccessible: ensureBoolean(payload.wheelchairAccessible),
          hasAdjustableDesks: ensureBoolean(payload.hasAdjustableDesks),
          groundFloor: ensureBoolean(payload.groundFloor),
          hearingAssistance: ensureBoolean(payload.hearingAssistance),
        },
        include: {
          building: {
            select: {
              id: true,
              name: true,
              university: { select: { id: true, name: true } },
            },
          },
          sensors: {
            select: { sensorId: true, name: true, deviceId: true },
            orderBy: { sensorId: "asc" },
          },
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  },

  async deleteRoom(auth: AdminAuthContext, roomId: number) {
    const universityId = await getUniversityIdForRoom(roomId);
    await assertCanManageUniversity(auth, universityId);

    await prisma.$transaction(async (tx) => {
      await deleteRoomCascade(tx, roomId);
    });

    return { deletedRoomId: roomId };
  },

  async getUsers(auth: AdminAuthContext) {
    assertSuperAdmin(auth);

    return prisma.user.findMany({
      orderBy: { email: "asc" },
      select: {
        userId: true,
        email: true,
        role: true,
        managedUniversityId: true,
        managedUniversity: { select: { id: true, name: true } },
      },
    });
  },

  async updateUserRole(
    auth: AdminAuthContext,
    userId: number,
    payload: { role: unknown; managedUniversityId?: unknown }
  ) {
    assertSuperAdmin(auth);

    const role = String(payload.role ?? "") as UserRole;
    if (!["USER", "UNIVERSITY_ADMIN", "SUPER_ADMIN"].includes(role)) {
      throw new AdminError("Role must be USER, UNIVERSITY_ADMIN, or SUPER_ADMIN");
    }

    const managedUniversityId =
      payload.managedUniversityId === null || payload.managedUniversityId === ""
        ? null
        : payload.managedUniversityId === undefined
        ? undefined
        : ensureNumber(payload.managedUniversityId, "Managed university id");

    if (role === "UNIVERSITY_ADMIN" && !managedUniversityId) {
      throw new AdminError("University admins must be assigned to a university");
    }

    if (managedUniversityId) {
      const university = await prisma.university.findUnique({ where: { id: managedUniversityId } });
      if (!university) throw new AdminError("Assigned university not found", 404);
    }

    return prisma.user.update({
      where: { userId },
      data: {
        role,
        managedUniversityId: role === "UNIVERSITY_ADMIN" ? managedUniversityId ?? null : null,
      },
      select: {
        userId: true,
        email: true,
        role: true,
        managedUniversityId: true,
        managedUniversity: { select: { id: true, name: true } },
      },
    });
  },

  AdminError,
};
