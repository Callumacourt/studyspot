import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Pages/Home.module.css";
import chevronDown from "../assets/icons/chevron-down.svg";
import chevronUp from "../assets/icons/chevron-up.svg";
import chevronRight from "../assets/icons/chevron-right.svg";
import searchIcn from "../assets/icons/search.svg";
import tempIcn from "../assets/icons/thermometer.svg";
import userIcn from "../assets/icons/user.svg";

const API_BASE_URL = "http://localhost:3000";

const defaultFilters = {
    search: "",
    building: "Any Building",
    occupancy: "Any",
    noise: "All",
    temp: "Any",
    humidity: "Any",
    accessibility: [],
};

const accessibilityOptions = [
    "Adjustable Desks",
    "Lift access",
    "Toilet nearby",
    "Close to refreshments",
    "Wheelchair accessible",
];

export default function Home () {
    const navigate = useNavigate();
    const [filters, setFilters] = useState(defaultFilters);
    const [rooms, setRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [roomsError, setRoomsError] = useState("");
    const [sectionsOpen, setSectionsOpen] = useState({
        occupancy: true,
        noise: true,
        temperature: false,
        humidity: true,
        accessibility: false,
    });

    /**
     * Navigate to the detailed view for a specific room.
     * @param {number} roomId - The ID of the room to view
     */
    const goToRoom = (roomId) => {
        navigate(`/room/${roomId}`);
    };

    useEffect(() => {
        let ignore = false;

        async function loadRooms() {
            setRoomsLoading(true);
            setRoomsError("");

            try {
                const response = await fetch(`${API_BASE_URL}/api/rooms`);

                if (!response.ok) {
                    throw new Error("Failed to fetch rooms");
                }

                const payload = await response.json();

                if (!ignore) {
                    setRooms(payload.data ?? []);
                }
            } catch (error) {
                if (!ignore) {
                    console.error(error);
                    setRoomsError("Unable to load rooms right now.");
                }
            } finally {
                if (!ignore) {
                    setRoomsLoading(false);
                }
            }
        }

        loadRooms();

        return () => {
            ignore = true;
        };
    }, []);

    const buildingOptions = Array.from(
        new Set(["Any Building", ...rooms.map((room) => room.building)])
    );

    const filteredRooms = rooms.filter((room) => {
        const occupancyMap = {
            Any: true,
            Low: room.occupancyPercent <= 30,
            Medium: room.occupancyPercent >= 31 && room.occupancyPercent <= 60,
            High: room.occupancyPercent >= 61,
        };
        const humidityMap = {
            Any: true,
            Dry: room.humidity < 40,
            Comfortable: room.humidity >= 40 && room.humidity <= 60,
            Humid: room.humidity > 60,
        };
        const temperatureMap = {
            Any: true,
            Cool: room.temp < 20,
            Comfortable: room.temp >= 20 && room.temp <= 23,
            Warm: room.temp > 23,
        };
        const noiseMap = {
            All: true,
            Silent: room.noise === "Silent",
            Quiet: room.noise === "Quiet",
            Noisy: room.noise === "Noisy",
        };

        const matchesSearch =
            room.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            room.building.toLowerCase().includes(filters.search.toLowerCase()) ||
            room.location.toLowerCase().includes(filters.search.toLowerCase());
        const matchesBuilding =
            filters.building === "Any Building" || room.building === filters.building;
        const matchesNoise = noiseMap[filters.noise];
        const matchesOccupancy = occupancyMap[filters.occupancy];
        const matchesTemp = temperatureMap[filters.temp];
        const matchesHumidity = humidityMap[filters.humidity];
        const matchesAccessibility =
            filters.accessibility.length === 0 ||
            filters.accessibility.every((feature) =>
                room.accessibility.includes(feature)
            );

        return (
            matchesSearch &&
            matchesBuilding &&
            matchesNoise &&
            matchesOccupancy &&
            matchesTemp &&
            matchesHumidity &&
            matchesAccessibility
        );
    });

    const toggleSection = (section) => {
        setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <main className={styles.page}>
            <section className={styles.layout}>
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarInner}>
                        <div className={styles.filterHeader}>
                            <h2>Filter</h2>
                        </div>

                        <label className={styles.searchField} htmlFor="room-search">
                            <input
                                id="room-search"
                                type="text"
                                placeholder="Search a room"
                                value={filters.search}
                                onChange={(event) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        search: event.target.value,
                                    }))
                                }
                            />
                            <img src={searchIcn} alt="" aria-hidden="true" />
                        </label>

                        <section className={styles.filterSection}>
                            <button
                                type="button"
                                className={styles.accordionButton}
                                onClick={() => toggleSection("occupancy")}
                                aria-expanded={sectionsOpen.occupancy}
                            >
                                <span>Occupancy</span>
                                <img
                                    src={sectionsOpen.occupancy ? chevronUp : chevronDown}
                                    alt=""
                                    aria-hidden="true"
                                />
                            </button>
                            {sectionsOpen.occupancy && (
                                <div className={styles.optionList}>
                                    {[
                                        ["Low", "Low: 0-30% occupied"],
                                        ["Medium", "Medium: 31-60% occupied"],
                                        ["High", "High: 61-90% occupied"],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className={
                                                filters.occupancy === value
                                                    ? styles.optionButtonActive
                                                    : styles.optionButton
                                            }
                                            onClick={() =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    occupancy: value,
                                                }))
                                            }
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className={styles.filterSection}>
                            <button
                                type="button"
                                className={styles.accordionButton}
                                onClick={() => toggleSection("humidity")}
                                aria-expanded={sectionsOpen.humidity}
                            >
                                <span>Humidity</span>
                                <img
                                    src={sectionsOpen.humidity ? chevronUp : chevronDown}
                                    alt=""
                                    aria-hidden="true"
                                />
                            </button>
                            {sectionsOpen.humidity && (
                                <div className={styles.optionList}>
                                    {[
                                        ["Dry", "Dry: below 40%"],
                                        ["Comfortable", "Comfortable: 40%-60%"],
                                        ["Humid", "Humid: above 60%"],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className={
                                                filters.humidity === value
                                                    ? styles.optionButtonActive
                                                    : styles.optionButton
                                            }
                                            onClick={() =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    humidity: value,
                                                }))
                                            }
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className={styles.filterSection}>
                            <button
                                type="button"
                                className={styles.accordionButton}
                                onClick={() => toggleSection("temperature")}
                                aria-expanded={sectionsOpen.temperature}
                            >
                                <span>Temperature</span>
                                <img
                                    src={sectionsOpen.temperature ? chevronUp : chevronDown}
                                    alt=""
                                    aria-hidden="true"
                                />
                            </button>
                            {sectionsOpen.temperature && (
                                <div className={styles.optionList}>
                                    {[
                                        ["Cool", "Cool (< 20C)"],
                                        ["Comfortable", "Comfortable (20-23C)"],
                                        ["Warm", "Warm (> 23C)"],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className={
                                                filters.temp === value
                                                    ? styles.optionButtonActive
                                                    : styles.optionButton
                                            }
                                            onClick={() =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    temp: value,
                                                }))
                                            }
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className={styles.filterSection}>
                            <button
                                type="button"
                                className={styles.accordionButton}
                                onClick={() => toggleSection("noise")}
                                aria-expanded={sectionsOpen.noise}
                            >
                                <span>Noise Levels</span>
                                <img
                                    src={sectionsOpen.noise ? chevronUp : chevronDown}
                                    alt=""
                                    aria-hidden="true"
                                />
                            </button>
                            {sectionsOpen.noise && (
                                <div className={styles.optionList}>
                                    {[
                                        "Silent",
                                        "Quiet",
                                        "Noisy",
                                    ].map((label) => (
                                        <button
                                            key={label}
                                            type="button"
                                            className={
                                                filters.noise === label
                                                    ? styles.optionButtonActive
                                                    : styles.optionButton
                                            }
                                            onClick={() =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    noise: label,
                                                }))
                                            }
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className={styles.filterSection}>
                            <button
                                type="button"
                                className={styles.accordionButton}
                                onClick={() => toggleSection("accessibility")}
                                aria-expanded={sectionsOpen.accessibility}
                            >
                                <span>Accessibility</span>
                                <img
                                    src={sectionsOpen.accessibility ? chevronUp : chevronDown}
                                    alt=""
                                    aria-hidden="true"
                                />
                            </button>
                            {sectionsOpen.accessibility && (
                                <div className={styles.optionList}>
                                    {accessibilityOptions.map((label) => {
                                        const selected = filters.accessibility.includes(label);

                                        return (
                                            <label
                                                key={label}
                                                className={
                                                    selected
                                                        ? styles.checkboxOptionActive
                                                        : styles.checkboxOption
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() =>
                                                        setFilters((prev) => ({
                                                            ...prev,
                                                            accessibility: selected
                                                                ? prev.accessibility.filter(
                                                                    (feature) => feature !== label
                                                                )
                                                                : [...prev.accessibility, label],
                                                        }))
                                                    }
                                                />
                                                <span>{label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <button
                            type="button"
                            className={styles.clearAll}
                            onClick={() => setFilters(defaultFilters)}
                        >
                            Clear All
                        </button>
                    </div>
                </aside>

                <section className={styles.resultsPanel}>
                    <div className={styles.resultsToolbar}>
                        <h2>{filteredRooms.length} Spots Found</h2>

                        <div className={styles.toolbarControls}>
                            <span className={styles.toolbarLabel}>Cardiff University</span>
                            <select
                                value={filters.building}
                                onChange={(event) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        building: event.target.value,
                                    }))
                                }
                                aria-label="Filter by building"
                            >
                                {buildingOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.resultsList}>
                        {roomsLoading && (
                            <div className={styles.emptyState}>
                                <h3>Loading rooms...</h3>
                                <p>Please wait while we fetch study spaces.</p>
                            </div>
                        )}

                        {roomsError && !roomsLoading && (
                            <div className={styles.emptyState}>
                                <h3>Could not load rooms</h3>
                                <p>{roomsError}</p>
                            </div>
                        )}

                        {!roomsLoading && !roomsError && filteredRooms.map((room) => (
                            <article
                                key={room.id}
                                className={styles.roomCard}
                                onClick={() => goToRoom(room.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        goToRoom(room.id);
                                    }
                                }}
                            >
                                <div className={styles.roomCopy}>
                                    <h3>{room.name}</h3>
                                    <p>{room.building} {room.location}</p>
                                </div>

                                <div className={styles.roomStats}>
                                    <span>
                                        <img src={tempIcn} alt="" aria-hidden="true" />
                                        {room.temp}C
                                    </span>
                                    <span>
                                        <img src={userIcn} alt="" aria-hidden="true" />
                                        {room.occupied}
                                    </span>
                                    <span>{room.free} Free</span>
                                </div>

                                <img
                                    className={styles.roomChevron}
                                    src={chevronRight}
                                    alt=""
                                    aria-hidden="true"
                                />
                            </article>
                        ))}

                        {!roomsLoading && !roomsError && filteredRooms.length === 0 && (
                            <div className={styles.emptyState}>
                                <h3>No rooms match these filters</h3>
                                <p>Try widening the filters or clearing them to explore more spaces.</p>
                            </div>
                        )}
                    </div>
                </section>
            </section>
        </main>
    );
}
