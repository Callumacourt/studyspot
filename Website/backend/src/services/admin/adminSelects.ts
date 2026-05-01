export const ADMIN_USER_SELECT = {
  userId: true,
  email: true,
  role: true,
  managedUniversityId: true,
  managedUniversity: { select: { id: true, name: true } },
} as const;

export const UNIVERSITY_ADMINISTRATOR_SELECT = {
  userId: true,
  email: true,
  role: true,
  managedUniversityId: true,
} as const;

export const UNIVERSITY_WITH_STRUCTURE_INCLUDE = {
  buildings: {
    include: { _count: { select: { rooms: true } } },
    orderBy: { name: "asc" as const },
  },
  administrators: {
    select: UNIVERSITY_ADMINISTRATOR_SELECT,
    orderBy: { email: "asc" as const },
  },
} as const;

export const ROOM_ADMIN_INCLUDE = {
  building: {
    select: {
      id: true,
      name: true,
      university: { select: { id: true, name: true } },
    },
  },
  sensors: {
    select: { sensorId: true, name: true, deviceId: true },
    orderBy: { sensorId: "asc" as const },
  },
} as const;
