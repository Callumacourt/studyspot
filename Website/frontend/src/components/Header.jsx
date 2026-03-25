import styles from "../styles/Header/Header.module.css";
import { useNavigate } from "react-router-dom";

export default function Header() {
    const navigate = useNavigate();

    return (
        <header className={styles.header}>
            <nav className={styles.mainNav}>
                <div className={styles.leftGroup}>
                    <h3 onClick={() => navigate("/")}>StudySpot</h3>
                </div>

                <div className={styles.headerNav}>
                    <button className={styles.privacyBtn}
                    onClick={() => navigate("/privacy")}
                    >
                        Privacy Policy
                    </button>
                    <button
                        className={styles.aboutUsBtn}
                        onClick={() => navigate("/about")}
                    >
                        About
                    </button>
                    <button className={styles.signinBtn}
                    onClick={() => navigate("/login")}
                    >Sign In</button>
                </div>
            </nav>
        </header>
    );
}