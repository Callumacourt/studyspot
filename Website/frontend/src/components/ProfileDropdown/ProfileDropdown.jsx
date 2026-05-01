import { Link } from "react-router-dom";
import styles from "./ProfileDropdown.module.css";

// Simple dropdown menu shown from the header profile icon.
export default function ProfileDropdown({ onSignOut }) {
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
                    <li><Link to="/favourites">Favourites</Link></li>
                    <li><button onClick={handleSignOut} type="button">Sign Out</button></li>
                </ul>
            </nav>
        </section>
    );
}