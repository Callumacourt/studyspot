import { Link, useLocation } from "react-router-dom";
import styles from "../styles/Pages/Login.module.css";

export default function SuccessPage() {
  const location = useLocation();

  const title = location.state?.title || "Success";
  const message = location.state?.message || "Your action was completed successfully.";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{message}</p>

        <div className={styles.successBox}>
          <p className={styles.successText}>
            You may now continue using the system.
          </p>
        </div>

        <div className={styles.successActions}>
          <Link to="/login" className={styles.secondaryButton}>
            Back to Sign In
          </Link>
          <Link to="/" className={styles.buttonLink}>
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}