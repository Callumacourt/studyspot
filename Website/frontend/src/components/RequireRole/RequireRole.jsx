import { Navigate, useLocation } from "react-router-dom";
import { getStoredUser, hasRequiredRole } from "../../utils/auth";

export default function RequireRole({ children, minRole = "UNIVERSITY_ADMIN" }) {
  const location = useLocation();
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasRequiredRole(user.role, minRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
