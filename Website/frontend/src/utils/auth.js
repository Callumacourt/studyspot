/**
 * Frontend auth/session helpers.
 *
 * Centralises localStorage contract for token/user persistence and
 * role comparisons used by route guards and admin UI visibility.
 */
export const ROLE_ORDER = {
  USER: 0,
  UNIVERSITY_ADMIN: 1,
  SUPER_ADMIN: 2,
};

/** Safely parse persisted user object from localStorage. */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Return raw JWT token from localStorage (or null). */
export function getStoredToken() {
  return localStorage.getItem("token");
}

/** Check whether role is at least UNIVERSITY_ADMIN. */
export function isAdminRole(role) {
  return ROLE_ORDER[String(role)] >= ROLE_ORDER.UNIVERSITY_ADMIN;
}

/** Generic role hierarchy check. */
export function hasRequiredRole(role, requiredRole = "UNIVERSITY_ADMIN") {
  return ROLE_ORDER[String(role)] >= ROLE_ORDER[String(requiredRole)];
}

/** Build auth headers object for axios/fetch calls. */
export function getAuthHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Persist token+user and notify listeners (e.g., header/nav) via authChanged event. */
export function persistSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("authChanged"));
}
