export const ROLE_ORDER = {
  USER: 0,
  UNIVERSITY_ADMIN: 1,
  SUPER_ADMIN: 2,
};

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredToken() {
  return localStorage.getItem("token");
}

export function isAdminRole(role) {
  return ROLE_ORDER[String(role)] >= ROLE_ORDER.UNIVERSITY_ADMIN;
}

export function hasRequiredRole(role, requiredRole = "UNIVERSITY_ADMIN") {
  return ROLE_ORDER[String(role)] >= ROLE_ORDER[String(requiredRole)];
}

export function getAuthHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function persistSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("authChanged"));
}
