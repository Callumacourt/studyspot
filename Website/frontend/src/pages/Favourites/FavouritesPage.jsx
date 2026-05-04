import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import RoomCard from "../../components/RoomCard/RoomCard";
import Toast from "../../components/Toast/Toast";
import styles from "./FavouritesPage.module.css";
import { getAuthHeaders } from "../../utils/auth";

export default function FavouritesPage() {
  const navigate = useNavigate();
  const authHeaders = useMemo(() => getAuthHeaders(), []);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function occupancyAccent(metrics) {
    const pct = Number(metrics?.occupancy);
    if (!Number.isFinite(pct)) return "#94a3b8";
    if (pct === 0) return "#94a3b8";
    if (pct <= 33) return "#34d399";
    if (pct <= 66) return "#fbbf24";
    return "#f87171";
  }

  async function loadFavourites() {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get("/api/user/me/favourites", { headers: authHeaders });
      setRooms(response.data?.rooms ?? []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(err?.response?.data?.error || "Failed to load favourite rooms.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavourites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removeFavourite(roomId) {
    try {
      await axios.delete(`/api/rooms/${roomId}/favourite`, { headers: authHeaders });
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
      setMessage("Room removed from favourites.");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to remove favourite room.");
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>My spaces</p>
        <h1>Favourite study rooms</h1>
        <p>Quickly jump back to the spaces you use most often.</p>
      </section>

      <Toast message={message} type="success" onDismiss={() => setMessage("")} />
      <Toast message={error}   type="error"   onDismiss={() => setError("")}   />

      {loading ? (
        <p aria-live="polite" role="status">Loading favourites…</p>
      ) : rooms.length === 0 ? (
        <div className={styles.empty}>
          <h2>No favourites yet</h2>
          <p>Open a room page and use the star icon to save it here.</p>
          <button type="button" onClick={() => navigate("/search")}>Browse rooms</button>
        </div>
      ) : (
        <section className={styles.grid}>
          {rooms.map((room) => (
            <article
              key={room.id}
              className={styles.cardWrap}
              style={{ "--fav-accent": occupancyAccent(room.metrics) }}
            >
              <RoomCard
                name={room.name}
                building={room.building?.name}
                metrics={room.metrics}
                onClick={() => navigate(`/room/${room.id}`)}
                className={styles.favRoomCard}
                accentPosition="none"
                disableShadow
              />
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeFavourite(room.id)}
                // Include room name so screen readers say "Remove Cardiff Library from favourites"
                aria-label={`Remove ${room.name} from favourites`}
              >
                Remove from favourites
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
