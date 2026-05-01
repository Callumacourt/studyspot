import styles from "./Footer.module.css";
import { Link } from "react-router-dom";

// Static site footer with helpful navigation links.
export default function Footer() {
    // Keep copyright year current automatically.
    const year = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.topSection}>
                <div className={styles.brand}>
                    <h4 className={styles.logo}>
                        <Link to="/" className={styles.logoLink}>
                            StudySpot
                        </Link>
                    </h4>
                    <p className={styles.tagline}>Helping students stay focused</p>
                </div>

                <div className={styles.column}>
                    <h4 className={styles.heading}>Software</h4>
                    <nav className={styles.links} aria-label="Software links">
                        <Link to="/how-it-works" className={styles.link}>
                            How it works
                        </Link>
                        <Link to="/report-problem" className={styles.link}>
                            Report A Problem
                        </Link>
                    </nav>
                </div>

                <div className={styles.column}>
                    <h4 className={styles.heading}>Quick Links</h4>
                    <nav className={styles.links} aria-label="Quick links">
                        <Link to="/about" className={styles.link}>
                            About Us
                        </Link>
                        <Link to="/privacy" className={styles.link}>
                            Privacy Policy
                        </Link>
                        <Link to="/contactus" className={styles.link}>
                            Contact
                        </Link>
                    </nav>
                </div>
            </div>

            <div className={styles.bottomSection}>
                <small className={styles.copy}>
                    © StudySpot {year}, All Rights Reserved
                </small>
            </div>
        </footer>
    );
}