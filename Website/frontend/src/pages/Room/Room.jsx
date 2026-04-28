import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import reportIcn from "../../assets/icons/flag.svg";
import humidityIcn from "../../assets/icons/humidity.svg";
import tempIcn from "../../assets/icons/thermometer.svg";
import noiseIcn from "../../assets/icons/volume-2.svg";
import chevronRightIcn from "../../assets/icons/chevron-right.svg"
import DirectionIcn from "../../assets/icons/map.svg"
import roomImg from "../../assets/Images/study-room.jpg";
import { useSensorData } from "../../hooks/useSensorData";
import BusyTimesChart from "../../components/BusyTimesChart/BusyTimesChart";
import styles from "./Room.module.css";
import axios from "axios";

function LightIcon() {
    return (
        <svg className={styles.inlineStatIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M9 18h6m-5 3h4m-6.2-6.5C6.68 13.4 6 11.98 6 10.4 6 6.87 8.69 4 12 4s6 2.87 6 6.4c0 1.58-.68 3-1.8 4.1-.71.69-1.2 1.28-1.45 1.9h-5.5c-.25-.62-.74-1.21-1.45-1.9Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function WheelchairIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M13 7a3 3 0 11-2.83 4H9v2h2.17A3.001 3.001 0 1113 7zM6 20a2 2 0 100-4 2 2 0 000 4zm12 0a4 4 0 100-8 4 4 0 000 8zM8 11v6h2v-4h2v-2H8z" fill="currentColor" />
        </svg>
    );
}

function DeskIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M3 7h18v2H3V7zm2 4h14v6H5v-6zM7 19v2h2v-2H7zm8 0v2h2v-2h-2z" fill="currentColor" />
        </svg>
    );
}

function GroundIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 2L2 7v2c0 5 4 9 10 13 6-4 10-8 10-13V7l-10-5z" fill="currentColor" />
        </svg>
    );
}

function HearIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 3v2a7 7 0 017 7 7 7 0 01-7 7v2a9 9 0 009-9 9 9 0 00-9-9zM3 12a9 9 0 0112.9-8.36L14 7a5 5 0 00-6 5 5 5 0 006 5l1.9 3.36A9 9 0 013 12z" fill="currentColor" />
        </svg>
    );
}

export default function Room () {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const isLoggedIn = Boolean(localStorage.getItem("token"));
    const [isFavourite, setIsFavourite] = useState(false); 
    const [roomData, setRoomData] = useState(null);
    const [hourlyAverages, setHourlyAverages] = useState([]);

    // Redirect to login if not authenticated, otherwise toggle
    const handleFavouriteClick = () => {
        if (!isLoggedIn) {
            navigate("/login");
            return;
        }
        setIsFavourite((prev) => !prev);
    };

    useEffect(() => {
        let cancelled = false;
        axios.get(`/api/rooms/${roomId}`)
          .then((res) => { if (!cancelled) setRoomData(res.data?.room ?? null); })
          .catch(console.error);
        return () => { cancelled = true; };
    }, [roomId]);

    // helper to get a usable building name from the room payload
    function getBuildingName() {
        const b = roomData?.building;
        if (!b) return roomData?.buildingName ?? (roomData?.buildingId ? `Building ${roomData.buildingId}` : "");
        if (typeof b === "string") return b;
        return b.name ?? b.displayName ?? "";
    }

    function openGoogleMaps() {
        const query = getBuildingName() || roomData?.name || "";
        if (!query) return;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    }

    useEffect(() => {
        let cancelled = false;

        async function fetchHourlyAverages() {
            try {
                const res = await axios.get(`/api/sensordata/${roomId}/occupancy-averages`);
                const values = Array.isArray(res.data?.data) ? res.data.data : [];
                const full24 = Array.from({ length: 24}, (_, i) => Number(values[i] ?? 0));
                if (!cancelled) setHourlyAverages(full24);
            } catch (err) {
                if (!cancelled) setHourlyAverages(Array(24).fill(0));
                console.log(err);
            }
        }

        fetchHourlyAverages();
        const id = setInterval(fetchHourlyAverages, 60000);

        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [roomId]);

    const { stats, loading, error } = useSensorData(roomId);

    return (
        <main className={styles.page}>
            <section className={styles.header}>
                <nav aria-label="Breadcrumb" className={styles.breadcrumbNav}>
                    <ul>
                        <li><a href="#">Cardiff Uni</a></li>
                        <li className={styles.seperator}><img src={chevronRightIcn} alt=">" /></li>
                        <li><a href="#">{getBuildingName() || "Building"}</a></li>
                        <li className={styles.seperator}><img src={chevronRightIcn} alt=">"/></li>
                        <li className="current">{roomData?.name ?? `Room ${roomId}`}</li>
                    </ul>
                </nav>
                <Link className={styles.backLink} to="/search">← Back to map</Link>
            </section>

            <section className={styles.content}>
                <section className={styles.roomImageCard} onClick={openGoogleMaps} role="button" tabIndex={0} title="Open building in Google Maps" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openGoogleMaps(); }}>
                    <img
                        src={roomImg}
                        alt={roomData?.name ? `${roomData.name} study space` : "Study room"}
                        className={styles.roomImage}
                    />
                    <div className={styles.roomImageOverlay}>
                        <h3>{roomData?.name ?? `Room ${roomId}`}</h3>
                        <p>Quiet study zone • Live monitored</p>
                    </div>
                </section>

                <aside className={styles.stats}>
                    <div className={styles.statsNav}>
                        <div className={styles.roomTitle}>{roomData?.name ?? `Room ${roomId}`}</div>
                        <div className={styles.statsActions}>
                            <a
                                href={roomData ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getBuildingName() || roomData.name || "")}` : '#'}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.iconButton}
                                aria-label="Directions to room"
                            >
                                <img src={DirectionIcn} alt="Directions to" />
                            </a>

                            <button
                                type="button"
                                className={`${styles.favBtn} ${isFavourite ? styles.favActive : ""}`}
                                onClick={handleFavouriteClick}
                                title={isLoggedIn ? "Toggle favourite" : "Log in to favourite rooms"}
                                aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
                            >
                                <svg className={styles.favIcon} viewBox="0 0 24 24">
                                    <path
                                        d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 17.52 6.12 20.62l1.12-6.56L2.48 9.42l6.58-.96L12 2.5z"
                                        fill={isFavourite ? "currentColor" : "none"}
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>

                            <button
                                type="button"
                                className={styles.iconButton}
                                title="Report an issue with this room"
                                aria-label="Report an issue with this room"
                            >
                                <img src={reportIcn} className={styles.reportIcon} alt="Report" />
                            </button>
                        </div>
                    </div>

                    {loading && <p>Loading sensor data...</p>}
                    {error && <p>Error: {error}</p>}

                    <div className={styles.statsContent}>
                        <h4>Enviroment Metrics</h4>
                        <div className={styles.sensorData}>
                            <div className={styles.metric}>
                                <div className={styles.metricTitle}>Temperature</div>
                                <div className={styles.metricValue}>
                                    <img src={tempIcn} alt="Temperature Icon" />
                                    {stats?.temp ?? "No temperature data"}
                                </div>
                            </div>

                            <div className={styles.metric}>
                                <div className={styles.metricTitle}>Humidity</div>
                                <div className={styles.metricValue}>
                                    <img src={humidityIcn} alt="Humidity Icon" />
                                    {stats?.humidity ?? "No humidity data"}
                                </div>
                            </div>

                            <div className={styles.metric}>
                                <div className={styles.metricTitle}>Noise</div>
                                <div className={styles.metricValue}>
                                    <img src={noiseIcn} alt="Noise Icon" />
                                    {stats?.noise ?? "No noise data"}
                                </div>
                            </div>

                            <div className={styles.metric}>
                                <div className={styles.metricTitle}>Light</div>
                                <div className={styles.metricValue}>
                                    <LightIcon />
                                    {stats?.light ?? "No light data"}
                                </div>
                            </div>
                        </div>
                        <h4>Room Accessibility</h4>
                        <div className={styles.accessibility}>
                            <div className={styles.accessItem}>
                                <div className={styles.accessIcon}><WheelchairIcon /></div>
                                <div className={styles.accessLabel}>Wheelchair</div>
                                <div className={styles.accessFlag}>{roomData?.wheelchairAccessible ? 'Yes' : 'No'}</div>
                            </div>
                            <div className={styles.accessItem}>
                                <div className={styles.accessIcon}><DeskIcon /></div>
                                <div className={styles.accessLabel}>Adjustable desks</div>
                                <div className={styles.accessFlag}>{roomData?.hasAdjustableDesks ? 'Yes' : 'No'}</div>
                            </div>
                            <div className={styles.accessItem}>
                                <div className={styles.accessIcon}><GroundIcon /></div>
                                <div className={styles.accessLabel}>Ground floor</div>
                                <div className={styles.accessFlag}>{roomData?.groundFloor ? 'Yes' : 'No'}</div>
                            </div>
                            <div className={styles.accessItem}>
                                <div className={styles.accessIcon}><HearIcon /></div>
                                <div className={styles.accessLabel}>Hearing assistance</div>
                                <div className={styles.accessFlag}>{roomData?.hearingAssistance ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                    </div>

                </aside>
                <section className={styles.busyTimes}>
                    <nav className = {styles.roomNav}>
                    <h2>Busy Times</h2>
                    </nav>
                    <div className={styles.graphContainer}>
                        <BusyTimesChart hourlyAverages={hourlyAverages} liveOccupancy={stats?.occupancy ?? null} />
                    </div>
                </section>
            </section>
        </main>
    );
}
