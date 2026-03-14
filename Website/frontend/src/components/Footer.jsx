import styles from "../styles/Footer/Footer.module.css";

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.brand}>
                <h4>StudySpot</h4>
                <p>Helping students stay focused and organised.</p>
            </div>

            <div className={styles.linkSection}>
                <h4>Quick Links</h4>
                <nav className={styles.links} aria-label="Footer links">
                    <a href="/about">About</a>
                    <a href="/privacy">Privacy</a>
                    <a href="/terms">Terms</a>
                    <a href="/contact">Contact</a>
                </nav>
            </div>

            <img src="" alt="" />

            <small className={styles.copy}>© {year} StudySpot. All rights reserved.</small>
        </footer>
    );
}