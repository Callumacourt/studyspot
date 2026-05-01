import type { AdminAuthContext } from "../../utils/adminAccess";
import { AdminError } from "./adminErrors";

export function assertSuperAdmin(auth: AdminAuthContext) {
  if (auth.role !== "SUPER_ADMIN") {
    throw new AdminError("Super admin access required", 403);
  }
}

export async function assertCanManageUniversity(auth: AdminAuthContext, universityId: number) {
  if (auth.role === "SUPER_ADMIN") return;

  if (auth.role !== "UNIVERSITY_ADMIN") {
    throw new AdminError("Admin access required", 403);
  }

  if (!auth.managedUniversityId || auth.managedUniversityId !== universityId) {
    throw new AdminError("You can only manage your assigned university", 403);
  }
}

export function resolveScopedUniversityIds(auth: AdminAuthContext): number[] | undefined {
  if (auth.role === "SUPER_ADMIN") return undefined;
  return auth.managedUniversityId ? [auth.managedUniversityId] : [];
}

export function resolveScopedUniversityId(
  auth: AdminAuthContext,
  requestedUniversityId?: number
): number | undefined {
  return auth.role === "SUPER_ADMIN" ? requestedUniversityId : auth.managedUniversityId ?? undefined;
}
