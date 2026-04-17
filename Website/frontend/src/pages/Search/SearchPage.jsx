import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./SearchPage.module.css";
import RoomFilter from "../../components/RoomFilter/RoomFilter";
import RoomCard from "../../components/RoomCard/RoomCard.jsx";
import { useState, useEffect } from "react";
import axios from "axios";
import chevronDown from "../../assets/icons/chevron-down.svg";
import chevronUp from "../../assets/icons/chevron-up.svg";
import searchIcn from "../../assets/icons/search.svg";

export default function SearchPage() {
  const navigate = useNavigate();
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();

  useEffect(() => {
    async function fetchRooms() {
      setLoading(true);
      setError("");

      try {
        const qs = urlParams.toString();
        const endpoint = qs ? `/api/rooms/filter?${qs}` : "/api/rooms";
        const res = await axios.get(endpoint);
        const payload = res.data?.rooms ?? res.data?.data ?? [];
        setRooms(payload);
      } catch (err) {
        setError("Failed to load rooms.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRooms();
  }, [urlParams]);

  const handleFilterChange = (filters) => {
    const next = new URLSearchParams();

    // Only apply range filters if the user has moved them from the full range
    if (filters.temp[0] > 10) next.set("tempMin", String(filters.temp[0]));
    if (filters.temp[1] < 40) next.set("tempMax", String(filters.temp[1]));
    if (filters.humidity[0] > 10) next.set("humidityMin", String(filters.humidity[0]));
    if (filters.humidity[1] < 100) next.set("humidityMax", String(filters.humidity[1]));

    if (filters.noise) next.set("noise", filters.noise);
    if (filters.occupancy) next.set("occupancy", filters.occupancy);

    if (filters.accessibility?.includes("Wheelchair Accessible")) next.set("wheelchairAccessible", "true");
    if (filters.accessibility?.includes("Adjustable Desks")) next.set("hasAdjustableDesks", "true");
    if (filters.accessibility?.includes("Hearing Assistance")) next.set("hearingAssistance", "true");

    setUrlParams(next);
  };

  const handleReset = () => {
    setUrlParams(new URLSearchParams());
  };

  const goToRoom = (roomId) => navigate(`/room/${roomId}`);

  return (
    <main className={styles.content}>
      <section className={styles.navButtons}>
        <div className={styles.paddedSection}>
          <button>Find me a quiet spot</button>
          <button
            className={styles.filterExpandBtn}
            onClick={() => setFilterExpanded((v) => !v)}
            aria-expanded={filterExpanded}
          >
            <span>Filter rooms</span>
            <img src={filterExpanded ? chevronDown : chevronUp} alt="" aria-hidden="true" />
          </button>
          <span>
            <button className={styles.searchBtn}>
              <span>Search for a room</span>
              <img src={searchIcn} alt="Search icon" />
            </button>
          </span>

          <section className={styles.filterExpanded}>
            {filterExpanded && (
              <RoomFilter onFilterChange={handleFilterChange} onReset={handleReset} filteredRooms={rooms} />
            )}
          </section>
        </div>
      </section>

      <section className={styles.campusMap}>
        <h2>Explore Study Spaces</h2>
        {loading && <p>Loading rooms...</p>}
        {error && <p>{error}</p>}

        <div className={styles.roomGrid}>
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              name={room.name}
              building={room.building?.name}
              metrics={room.metrics}
              onClick={() => goToRoom(room.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}