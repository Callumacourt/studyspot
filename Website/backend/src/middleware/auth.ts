/**
 * Authentication / authorisation middleware.
 *
 * `requireAuth`:
 * - Extracts Bearer token from Authorization header.
 * - Verifies token with `JWT_SECRET`.
 * - Hydrates `req.auth` with normalised identity context.
 *
 * `requireAdmin`:
 * - Requires `req.auth` to exist (must run after `requireAuth`).
 * - Checks role hierarchy against required minimum role.
 */
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { hasRequiredRole, type AdminAuthContext, type UserRole } from "../utils/adminAccess";

export type AuthenticatedRequest = Request & {
  auth?: AdminAuthContext;
};

type JwtPayload = {
  userId: number;
  email: string;
  role?: UserRole;
  managedUniversityId?: number | null;
};

function getBearerToken(req: Request): string | null {
  const authHeader = req.header("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

/**
 * Require a valid JWT and attach normalised auth context to `req.auth`.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not configured");

    const payload = jwt.verify(token, secret) as JwtPayload;
    req.auth = {
      userId: Number(payload.userId),
      email: String(payload.email),
      role: payload.role ?? "USER",
      managedUniversityId:
        typeof payload.managedUniversityId === "number" ? payload.managedUniversityId : null,
    };
    return next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

/**
 * Require authenticated user with at least `requiredRole`.
 *
 * Example:
 * - `requireAdmin("UNIVERSITY_ADMIN")` allows UNIVERSITY_ADMIN and SUPER_ADMIN.
 * - `requireAdmin("SUPER_ADMIN")` allows only SUPER_ADMIN.
 */
export function requireAdmin(requiredRole: UserRole = "UNIVERSITY_ADMIN") {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    if (!hasRequiredRole(req.auth.role, requiredRole)) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }

    return next();
  };
}
