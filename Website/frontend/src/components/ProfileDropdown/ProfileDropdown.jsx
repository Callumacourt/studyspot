import { Link } from "react-router-dom";
import styles from "./ProfileDropdown.module.css";
import { hasRequiredRole } from "../../utils/auth";

// Simple dropdown menu shown from the header profile icon.
export default function ProfileDropdown({ onSignOut, user }) {
    function handleSignOut() {
        // Clear client auth state and notify listeners.
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // notify same-window listeners
        window.dispatchEvent(new Event("authChanged"));
        onSignOut?.();
    }

    return (
        <section className={styles.profileDropdown}>
            <nav aria-label="Profile menu">
                <ul>
                    {hasRequiredRole(user?.role, "UNIVERSITY_ADMIN") && (
                        <li><Link to="/admin">Admin workspace</Link></li>
                    )}
                    {hasRequiredRole(user?.role, "SUPER_ADMIN") && (
                        <li><Link to="/admin/system">Platform admin</Link></li>
                    )}
                    <li><Link to="/favourites">Favourites</Link></li>
                    <li><button onClick={handleSignOut} type="button">Sign Out</button></li>
                </ul>
            </nav>
        </section>
    );
}