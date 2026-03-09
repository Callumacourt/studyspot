import styles from "../styles/Header/Header.module.css"

export default function Header () {
    return (
        <header className = {styles.header}>
            <nav>
                <h3>StudySpot</h3>
                <nav>
                <button>Login</button>
                <button>Register</button>
                </nav>
            </nav>
        </header>
    )
}