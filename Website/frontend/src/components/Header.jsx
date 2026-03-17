import styles from "../styles/Header/Header.module.css";
import darkmodeIcn from "../assets/icons/moon.svg";
import { useNavigate } from "react-router-dom";

export default function Header() {
    const navigate = useNavigate();

    return (
        <header className={styles.header}>
            <nav className={styles.mainNav}>
                <div className={styles.leftGroup}>
                    <h3 onClick={() => navigate("/")}>StudySpot</h3>
                    <button
                        type="button"
                        className={styles.darkModeBtn}
                        aria-label="Toggle dark mode"
                    >
                        <img src={darkmodeIcn} alt="" aria-hidden="true" />
                    </button>
                </div>

                <div className={styles.headerNav}>
                    <button className={styles.privacyBtn}>Privacy Policy</button>
                    <button className={styles.aboutUsBtn}>About</button>
                    <button className={styles.signinBtn}>Sign In</button>
                </div>
            </nav>
        </header>
    );
}