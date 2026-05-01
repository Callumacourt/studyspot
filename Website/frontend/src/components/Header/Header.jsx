import styles from "./Header.module.css";
import ProfileDropdown from "../ProfileDropdown/ProfileDropdown";
import userIcn from "../../assets/icons/user.svg";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getStoredUser, isAdminRole } from "../../utils/auth";

// Global header with nav links and auth/profile actions.
export default function Header() {
    const navigate = useNavigate();
    const [isHovering, setIsHovering] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(
        Boolean(localStorage.getItem("token"))
    );
    const [user, setUser] = useState(getStoredUser());

    useEffect(() => {
        // Sync header auth state when login/logout happens in this tab.
        const onAuth = () => {
            setIsLoggedIn(Boolean(localStorage.getItem("token")));
            setUser(getStoredUser());
        };
        window.addEventListener("authChanged", onAuth);
        return () => window.removeEventListener("authChanged", onAuth);
    }, []);

    // Callback passed to profile dropdown.
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
                        {isAdminRole(user?.role) && (
                            <button
                                className={styles.aboutUsBtn}
                                type="button"
                                onClick={() => navigate("/admin")}
                            >
                                Admin
                            </button>
                        )}
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
                                    <ProfileDropdown onSignOut={handleSignedOut} user={user} />
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
