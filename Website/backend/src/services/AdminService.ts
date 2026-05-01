import { prisma } from "../prisma";
import type { AdminAuthContext, UserRole } from "../utils/adminAccess";
import {
  deleteBuildingCascade,
  deleteRoomCascade,
  deleteUniversityCascade,
  getUniversityIdForBuilding,
  getUniversityIdForRoom,
} from "./admin/adminCascade";
import { AdminError, asAdminError } from "./admin/adminErrors";
import {
  assertCanManageUniversity,
  assertSuperAdmin,
  resolveScopedUniversityId,
  resolveScopedUniversityIds,
} from "./admin/adminGuards";
import { ensureBoolean, ensureName, ensurePositiveInt } from "./admin/adminParsers";
import {
  ADMIN_USER_SELECT,
  ROOM_ADMIN_INCLUDE,
  UNIVERSITY_WITH_STRUCTURE_INCLUDE,
} from "./admin/adminSelects";

function isValidUserRole(role: string): role is UserRole {
  return role === "USER" || role === "UNIVERSITY_ADMIN" || role === "SUPER_ADMIN";
}

export const AdminService = {
  async getSummary(auth: AdminAuthContext) {
    const accessibleUniversityIds = resolveScopedUniversityIds(auth);

    const universityWhere = accessibleUniversityIds
      ? { id: { in: accessibleUniversityIds } }
      : undefined;

    const [universities, buildingsCount, roomsCount, usersCount] = await Promise.all([
      prisma.university.findMany({
        where: universityWhere,
        orderBy: { name: "asc" },
        include: {
          ...UNIVERSITY_WITH_STRUCTURE_INCLUDE,
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
    return prisma.university.findMany({
      where:
        auth.role === "SUPER_ADMIN"
          ? undefined
          : auth.managedUniversityId
          ? { id: auth.managedUniversityId }
          : { id: -1 },
      orderBy: { name: "asc" },
      include: UNIVERSITY_WITH_STRUCTURE_INCLUDE,
    });
  },

  async createUniversity(auth: AdminAuthContext, payload: { name: unknown }) {
    assertSuperAdmin(auth);
    try {
      return await prisma.university.create({
        data: { name: ensureName(payload.name, "University name") },
      });
    } catch (error) {
      asAdminError(error);
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
      asAdminError(error);
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

    const scopedUniversityId = resolveScopedUniversityId(auth, universityId);

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
    const universityId = ensurePositiveInt(payload.universityId, "University id");
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
      asAdminError(error);
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
      asAdminError(error);
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

    const scopedUniversityId = resolveScopedUniversityId(auth, filters.universityId);

    if (scopedUniversityId) {
      await assertCanManageUniversity(auth, scopedUniversityId);
    }

    return prisma.room.findMany({
      where: {
        ...(filters.buildingId ? { buildingId: filters.buildingId } : {}),
        ...(scopedUniversityId ? { building: { universityId: scopedUniversityId } } : {}),
      },
      orderBy: [{ buildingId: "asc" }, { name: "asc" }],
      include: ROOM_ADMIN_INCLUDE,
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
    const buildingId = ensurePositiveInt(payload.buildingId, "Building id");
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
        include: ROOM_ADMIN_INCLUDE,
      });
    } catch (error) {
      asAdminError(error);
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
    const targetBuildingId = ensurePositiveInt(payload.buildingId, "Building id");
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
        include: ROOM_ADMIN_INCLUDE,
      });
    } catch (error) {
      asAdminError(error);
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
      select: ADMIN_USER_SELECT,
    });
  },

  async updateUserRole(
    auth: AdminAuthContext,
    userId: number,
    payload: { role: unknown; managedUniversityId?: unknown }
  ) {
    assertSuperAdmin(auth);

    const role = String(payload.role ?? "");
    if (!isValidUserRole(role)) {
      throw new AdminError("Role must be USER, UNIVERSITY_ADMIN, or SUPER_ADMIN");
    }

    const managedUniversityId =
      payload.managedUniversityId === null || payload.managedUniversityId === ""
        ? null
        : payload.managedUniversityId === undefined
        ? undefined
        : ensurePositiveInt(payload.managedUniversityId, "Managed university id");

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
      select: ADMIN_USER_SELECT,
    });
  },

  AdminError,
};
