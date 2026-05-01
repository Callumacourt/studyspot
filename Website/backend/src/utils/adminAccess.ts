export type UserRole = "USER" | "UNIVERSITY_ADMIN" | "SUPER_ADMIN";

const ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  UNIVERSITY_ADMIN: 1,
  SUPER_ADMIN: 2,
};

export type AdminAuthContext = {
  userId: number;
  email: string;
  role: UserRole;
  managedUniversityId: number | null;
};

function parseEmailList(raw: string | undefined): string[] {
  return String(raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isBootstrapSuperAdmin(email: string): boolean {
  return parseEmailList(process.env.SUPER_ADMIN_EMAILS).includes(email.trim().toLowerCase());
}

export function resolveEffectiveRole(user: { email: string; role?: UserRole | null }): UserRole {
  if (isBootstrapSuperAdmin(user.email)) return "SUPER_ADMIN";
  return user.role ?? "USER";
}

export function hasRequiredRole(role: UserRole, requiredRole: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[requiredRole];
}
