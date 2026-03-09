import styles from "../styles/Header/Header.module.css"
import { useNavigate } from "react-router-dom";

export default function Header () {
    const navigate = useNavigate();
    return (
        <header className = {styles.header}>
            <nav>
                <h3 onClick={() => navigate("/")}>StudySpot</h3>
                <nav>
                <button>Login</button>
                <button>Register</button>
                </nav>
            </nav>
        </header>
    )
}