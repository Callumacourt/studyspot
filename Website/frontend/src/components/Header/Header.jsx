import styles from "./Header.module.css";
import ProfileDropdown from "../ProfileDropdown/ProfileDropdown";
import userIcn from "../../assets/icons/blue-user.svg";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getStoredUser, isAdminRole } from "../../utils/auth";


// Global header with nav links and auth/profile actions.
export default function Header() {
    const navigate = useNavigate();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(
        Boolean(localStorage.getItem("token"))
    );
    const [user, setUser] = useState(getStoredUser());
    const profileMenuRef = useRef(null);
    const closeTimerRef = useRef(null);

    function clearCloseTimer() {
        if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }

    function scheduleClose() {
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
            setIsProfileOpen(false);
        }, 180);
    }

    useEffect(() => {
        // Sync header auth state when login/logout happens in this tab.
        const onAuth = () => {
            setIsLoggedIn(Boolean(localStorage.getItem("token")));
            setUser(getStoredUser());
            if (!localStorage.getItem("token")) {
                setIsProfileOpen(false);
            }
        };
        window.addEventListener("authChanged", onAuth);
        return () => window.removeEventListener("authChanged", onAuth);
    }, []);

    useEffect(() => {
        function handlePointerDown(event) {
            if (!profileMenuRef.current?.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }

        function handleEscape(event) {
            if (event.key === "Escape") {
                setIsProfileOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
            clearCloseTimer();
        };
    }, []);

    // Callback passed to profile dropdown.
    function handleSignedOut() {
        setIsLoggedIn(false);
        setIsProfileOpen(false);
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
                                ref={profileMenuRef}
                                className={styles.profileMenu}
                                onMouseEnter={() => {
                                    clearCloseTimer();
                                    setIsProfileOpen(true);
                                }}
                                onMouseLeave={scheduleClose}
                            >
                                <button
                                    className={styles.userBtn}
                                    aria-label="Account"
                                    aria-expanded={isProfileOpen}
                                    aria-haspopup="menu"
                                    type="button"
                                    onClick={() => {
                                        clearCloseTimer();
                                        setIsProfileOpen((prev) => !prev);
                                    }}
                                >
                                    <img src={userIcn} alt="User" />
                                </button>
                                {isProfileOpen && (
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
