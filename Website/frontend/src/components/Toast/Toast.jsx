import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Toast.module.css";

/**
 * Floating toast notification rendered into document.body via a portal.
 * Auto-dismisses after `duration` ms (default 3000).
 *
 * Props:
 *   message  – string to display (falsy = hidden)
 *   type     – "success" | "error" | "info"  (default "success")
 *   onDismiss – callback fired when toast hides
 *   duration – ms before auto-dismiss (default 3000)
 */
export default function Toast({ message, type = "success", onDismiss, duration = 3000 }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!message) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(timerRef.current);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return createPortal(
    <div
      className={`${styles.toast} ${styles[type] ?? styles.success}`}
      // Errors are urgent — use assertive so screen readers interrupt immediately.
      // Info/success use polite so they wait for a natural pause.
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <span className={styles.icon}>
        {type === "error" ? "✕" : "✓"}
      </span>
      {message}
    </div>,
    document.body
  );
}
