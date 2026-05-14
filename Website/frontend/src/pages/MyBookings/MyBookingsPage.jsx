import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuthHeaders } from "../../utils/auth";
import Toast from "../../components/Toast/Toast";
import styles from "./MyBookingsPage.module.css";
import api from "../../utils/axios";

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABEL = {
  PENDING:   { text: "Pending",   cls: "pending"   },
  CONFIRMED: { text: "Confirmed", cls: "confirmed" },
  CANCELLED: { text: "Cancelled", cls: "cancelled" },
  COMPLETED: { text: "Completed", cls: "completed" },
};

export default function MyBookingsPage() {
  const navigate    = useNavigate();
  const authHeaders = useMemo(() => getAuthHeaders(), []);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login", { replace: true }); }
  }, [navigate]);

  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [cancelling,   setCancelling]   = useState(null);
  const [confirmId,     setConfirmId]     = useState(null); // bookingId awaiting confirm
  const [cancelSuccess, setCancelSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/user/me/bookings", { headers: authHeaders });
        setBookings(res.data?.bookings ?? []);
      } catch (err) {
        if (err?.response?.status === 401) { navigate("/login", { replace: true }); return; }
        setError(err?.response?.data?.error || "Failed to load bookings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authHeaders, navigate]);

  async function handleCancel(bookingId) {
    setCancelling(bookingId);
    setConfirmId(null);
    try {
      await api.delete(`/api/user/bookings/${bookingId}/cancel`, { headers: authHeaders });
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setCancelSuccess("Booking cancelled successfully.");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to cancel booking.");
    } finally {
      setCancelling(null);
    }
  }

  const upcoming = bookings.filter((b) => b.status !== "CANCELLED" && new Date(b.endTime) > new Date());

  return (
    <div className={styles.pageWrapper}>
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>My account</p>
        <h1>My Bookings</h1>
        <p>View and manage your room reservations.</p>
      </section>

      <Toast message={error}         type="error"   onDismiss={() => setError("")}          />
      <Toast message={cancelSuccess} type="success" onDismiss={() => setCancelSuccess("")} />
      {loading && <p className={styles.loading} aria-live="polite" role="status">Loading bookings…</p>}

      {!loading && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Upcoming</h2>
          {upcoming.length === 0
            ? <p className={styles.empty}>No upcoming bookings. <Link to="/search">Find a room →</Link></p>
            : <ul className={styles.list}>
                {upcoming.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onRequestCancel={setConfirmId}
                    onConfirmCancel={handleCancel}
                    onDismissCancel={() => setConfirmId(null)}
                    confirmId={confirmId}
                    cancelling={cancelling}
                  />
                ))}
              </ul>
          }
        </section>
      )}
    </main>
    </div>
  );
}

function BookingCard({ booking, onRequestCancel, onConfirmCancel, onDismissCancel, confirmId, cancelling }) {
  const { id, room, startTime, endTime, status } = booking;
  const badge     = STATUS_LABEL[status] ?? { text: status, cls: "pending" };
  const canCancel = (status === "CONFIRMED" || status === "PENDING") && new Date(endTime) > new Date();
  const isConfirming = confirmId === id;

  return (
    <li className={styles.card}>
      <div className={styles.cardMain}>
        <div className={styles.cardInfo}>
          <Link className={styles.roomName} to={`/room/${room.id}`}>
            {room.name}
          </Link>
          <span className={styles.building}>{room.building?.name}</span>
          <span className={styles.time}>
            {formatDateTime(startTime)} → {formatTime(endTime)}
          </span>
        </div>
        <div className={styles.cardActions}>
          <span className={`${styles.badge} ${styles[`badge_${badge.cls}`]}`}>
            {badge.text}
          </span>
          {canCancel && !isConfirming && (
            <button
              className={styles.cancelBtn}
              onClick={() => onRequestCancel(id)}
              disabled={cancelling === id}
              type="button"
              aria-label={`Cancel booking for ${room.name}`}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {isConfirming && (
        // aria-live=polite announces the confirmation prompt to screen readers
        <div className={styles.confirmRow} aria-live="polite">
          <span className={styles.confirmText}>Cancel this booking?</span>
          <button
            className={styles.confirmYes}
            onClick={() => onConfirmCancel(id)}
            disabled={cancelling === id}
            type="button"
            aria-label={`Confirm cancel booking for ${room.name}`}
          >
            {cancelling === id ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button
            className={styles.confirmNo}
            onClick={onDismissCancel}
            type="button"
            aria-label={`Keep booking for ${room.name}`}
          >
            Keep it
          </button>
        </div>
      )}
    </li>
  );
}
