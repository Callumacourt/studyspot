import { Link } from "react-router-dom";
import styles from "../styles/Components/ProfileDropdown.module.css";

export default function ProfileDropdown({ onSignOut }) {
    function handleSignOut() {
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
                    <li><Link to="/recommendations">Recommendations</Link></li>
                    <li><button onClick={handleSignOut} type="button">Sign Out</button></li>
                </ul>
            </nav>
        </section>
    );
}