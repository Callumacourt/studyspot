import styles from "../styles/Header/Header.module.css"
import { useNavigate } from "react-router-dom";

export default function Header () {
    const navigate = useNavigate();
    return (
        <header className = {styles.header}>
            <nav>
                <h3 onClick={() => navigate("/")}>StudySpot</h3>
                <nav className = {styles.headerNav}>
                <button className = {styles.privacyBtn}>Privacy Policy</button>
                <button className = {styles.aboutUsBtn}>About</button>
                <button className = {styles.signinBtn}>Sign In</button>
                </nav>
            </nav>
        </header>
    )
}