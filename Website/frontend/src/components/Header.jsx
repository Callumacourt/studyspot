import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileDropdown from "./ProfileDropdown";
import userIcn from "../assets/icons/user.svg";
import styles from "../styles/Header/Header.module.css";

export default function Header() {
    const navigate = useNavigate();
    const [isHovering, setIsHovering] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(
        Boolean(localStorage.getItem("token"))
    );

    useEffect(() => {
        const onAuth = () => setIsLoggedIn(Boolean(localStorage.getItem("token")));
        window.addEventListener("authChanged", onAuth);
        return () => window.removeEventListener("authChanged", onAuth);
    }, []);

    function handleSignedOut() {
        setIsLoggedIn(false);
        setIsHovering(false);
        navigate("/login");
    }

    return (
        <header className={styles.header}>
            <nav className={styles.mainNav}>
                <div className={styles.leftGroup}>
                    <h2 className={styles.logo} onClick={() => navigate("/")}>
                        StudySpot
                    </h2>
                </div>

                <div className={styles.headerNav}>
                    <div className={styles.navLinks}>
                        <button
                            className={styles.privacyBtn}
                            type="button"
                            onClick={() => navigate("/privacy")}
                        >
                            Privacy Policy
                        </button>
                        <button
                            className={styles.aboutUsBtn}
                            type="button"
                            onClick={() => navigate("/about")}
                        >
                            About
                        </button>
                    </div>

                    <div className={styles.authArea}>
                        {isLoggedIn ? (
                            <div
                                className={styles.profileMenu}
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
                                {isHovering && (
                                    <ProfileDropdown onSignOut={handleSignedOut} />
                                )}
                            </div>
                        ) : (
                            <button
                                className={styles.signinBtn}
                                type="button"
                                onClick={() => navigate("/login")}
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}
