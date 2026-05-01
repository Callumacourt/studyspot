import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./SearchPage.module.css";
import RoomFilter from "../../components/RoomFilter/RoomFilter";
import RoomCard from "../../components/RoomCard/RoomCard.jsx";
import { useState, useEffect } from "react";
import axios from "axios";
import RoomSearcher from "../../components/RoomSearcher/RoomSearcher";
import chevronUp from "../../assets/icons/chevron-up.svg";
import chevronDown from "../../assets/icons/chevron-down.svg";
import Select from "react-select";

// Search results page: URL-backed filters + grouped room cards.
export default function SearchPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const [collapsedBuildings, setCollapsedBuildings] = useState({});
  const [universities, setUniversities] = useState([]);

  // Load universities once; default to Cardiff if URL has no selection.
  useEffect(() => {
    axios.get("/api/universities")
      .then((res) => {
        const list = res.data?.universities ?? [];
        setUniversities(list);
        // pre-select Cardiff University if nothing is already in the URL
        if (!urlParams.get("universityId")) {
          const cardiff = list.find((u) =>
            u.name.toLowerCase().includes("cardiff")
          );
          if (cardiff) {
            const next = new URLSearchParams(urlParams);
            next.set("universityId", String(cardiff.id));
            setUrlParams(next, { replace: true });
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUniversityChange = (option) => {
    // Persist selected university in query params.
    const next = new URLSearchParams(urlParams);
    if (option?.value) next.set("universityId", String(option.value));
    else next.delete("universityId");
    setUrlParams(next);
  };

  const handleSearch = (query) => {
    // Persist room-name search in query params.
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

    // Clear filter keys first, then re-add active values.
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

    // Re-add active filters.
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

  const toggleBuilding = (buildingName) => {
    setCollapsedBuildings((prev) => ({ ...prev, [buildingName]: !prev[buildingName] }));
  };

  const goToRoom = (roomId) => navigate(`/room/${roomId}`);

  // Group rooms by building so sections can collapse independently.
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
        <div className={styles.navSection}>
          <h2>Find A Study Space</h2>
          {universities.length > 0 && (
            <Select
              inputId="uni-select"
              options={[
                { value: "", label: "All universities" },
                ...universities.map((u) => ({ value: u.id, label: u.name })),
              ]}
              value={
                (() => {
                  const id = urlParams.get("universityId");
                  if (!id) return { value: "", label: "All universities" };
                  const u = universities.find((u) => String(u.id) === id);
                  return u ? { value: u.id, label: u.name } : { value: "", label: "All universities" };
                })()
              }
              onChange={handleUniversityChange}
              isSearchable
              placeholder="Select university…"
              classNamePrefix="uniSelect"
              className={styles.uniSelectControl}
            />
          )}
        </div>

        {loading && <p>Loading rooms...</p>}
        {error && <p>{error}</p>}

        {/* render grouped by building */}
        {Object.entries(groupedRooms).map(([buildingName, roomsInBuilding]) => (
          <section key={buildingName} className={styles.buildingSection}>
            <button
              type="button"
              className={styles.buildingHeader}
              onClick={() => toggleBuilding(buildingName)}
              aria-expanded={!collapsedBuildings[buildingName]}
            >
              {buildingName}
              <img
                src={collapsedBuildings[buildingName] ? chevronDown : chevronUp}
                alt={collapsedBuildings[buildingName] ? "Expand" : "Collapse"}
                className={styles.buildingChevron}
              />
            </button>
            {!collapsedBuildings[buildingName] && (
              <div className={styles.roomGrid}>
                {roomsInBuilding.map((room) => (
                  <RoomCard
                    key={room.id}
                    name={room.name}
                    building={null}
                    metrics={room.metrics}
                    onClick={() => goToRoom(room.id)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </section>
    </main>
  );
}