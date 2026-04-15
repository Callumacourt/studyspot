import styles from "./Header.module.css";
import ProfileDropdown from "../ProfileDropdown/ProfileDropdown";
import userIcn from "../assets/icons/user.svg";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Header() {
    const navigate = useNavigate();
    const [isHovering, setIsHovering] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem("token")));

    // Listens for user sign out and reloads header if changed
    useEffect(() => {
        const onAuth = () => setIsLoggedIn(Boolean(localStorage.getItem("token")));
        window.addEventListener("authChanged", onAuth);
        return () => window.removeEventListener("authChanged", onAuth)
    })

    function handleSignedOut() {
        setIsLoggedIn(false);
        setIsHovering(false);
        navigate("/login");
    }

    return (
        <header className={styles.header}>
            <nav className={styles.mainNav}>
                <div className={styles.leftGroup}>
                    <h2 onClick={() => navigate("/")}>StudySpot</h2>
                </div>

                <div className={styles.headerNav}>
                    <div className={styles.navLinks}>
                        <button className={styles.privacyBtn}>Privacy Policy</button>
                        <button className={styles.aboutUsBtn}>About</button>
                    </div>

                    <div className={styles.authArea}>
                        {isLoggedIn ? (
                            <div
                                onMouseEnter={() => setIsHovering(true)}
                                onMouseLeave={() => setIsHovering(false)}
                            >
                                <button
                                    className={styles.userBtn}
                                    aria-label="Account"
                                    type="button"
                                >
                                    <img src={userIcn} alt="User" />
                                </button>
                                {isHovering && <ProfileDropdown onSignOut={handleSignedOut} />}
                            </div>
                        ) : (
                            <button className={styles.signinBtn} onClick={() => navigate("/login")}>
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}