import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./SearchPage.module.css";
import RoomFilter from "../../components/RoomFilter/RoomFilter";
import RoomCard from "../../components/RoomCard/RoomCard.jsx";
import { useState, useEffect } from "react";
import axios from "axios";
import RoomSearcher from "../../components/RoomSearcher/RoomSearcher";

export default function SearchPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();

  const handleSearch = (query) => {
    const next = new URLSearchParams(urlParams);
    if (query && query.trim() !== "") next.set("name", query.trim());
    else next.delete("name");
    setUrlParams(next);
  }

  const queryString = urlParams.toString();

  useEffect(() => {
    let cancelled = false;

    async function fetchRooms() {
      setLoading(true);
      setError("");

      try {
        const endpoint = queryString ? `/api/rooms/filter?${queryString}` : "/api/rooms";
        const res = await axios.get(endpoint);
        const payload = res.data?.rooms ?? res.data?.data ?? [];
        if (!cancelled) setRooms(payload);
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load rooms.");
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRooms();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const handleFilterChange = (filters) => {
    const next = new URLSearchParams(urlParams);

    // clear filter related keys
    [
      "tempMin",
      "tempMax",
      "humidityMin",
      "humidityMax",
      "noise",
      "occupancy",
      "wheelchairAccessible",
      "hasAdjustableDesks",
      "hearingAssistance",
    ].forEach((k) => next.delete(k));

    // re add active filters
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

  // group rooms by building name for rendering
  const groupedRooms = rooms.reduce((acc, room) => {
    const b = room.building?.name || "Other";
    if (!acc[b]) acc[b] = [];
    acc[b].push(room);
    return acc;
  }, {});

  return (
    <main className={styles.content}>
      <section className={styles.navButtons}>
        <div className={styles.paddedSection}>
          <span>
            <div className={styles.searchBtn}>
              <span>Filter</span>
              <RoomSearcher onSearch={handleSearch} />
            </div>
          </span>
          <RoomFilter onFilterChange={handleFilterChange} onReset={handleReset} filteredRooms={rooms} />
        </div>
      </section>

      <section className={styles.campusMap}>
        <div className = {styles.navSection}>
          <h2>Find A Study Space</h2>
        </div>

        {loading && <p>Loading rooms...</p>}
        {error && <p>{error}</p>}

        {/* render grouped by building */}
        {Object.entries(groupedRooms).map(([buildingName, roomsInBuilding]) => (
          <section key={buildingName} className={styles.buildingSection}>
            <h3 className={styles.buildingHeader}>{buildingName}</h3>
            <div className={styles.roomGrid}>
              {roomsInBuilding.map((room) => (
                <RoomCard
                  key={room.id}
                  name={room.name}
                  building={null} // already shown in header
                  metrics={room.metrics}
                  onClick={() => goToRoom(room.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}