import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import reportIcn from "../assets/icons/flag.svg"
import humidityIcn from "../assets/icons/humidity.svg"
import tempIcn from "../assets/icons/thermometer.svg"
import noiseIcn from "../assets/icons/volume-2.svg"
import peopleIcn from "../assets/icons/user.svg"
import chevronRightIcn from "../assets/icons/chevron-right.svg"
import { useSensorData } from "../../hooks/useSensorData";
import styles from "./Room.module.css";

export default function Room () {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const isLoggedIn = Boolean(localStorage.getItem("token"));
    const [isFavourite, setIsFavourite] = useState(false); 

    // Redirect to login if not authenticated, otherwise toggle
    const handleFavouriteClick = () => {
        if (!isLoggedIn) {
            navigate("/login");
            return;
        }
        setIsFavourite((prev) => !prev);
    };

    const { stats, loading, error } = useSensorData(roomId);
    const tables = roomData?.tables ?? [];

    return (
        <main className={styles.page}>
            <section className={styles.header}>
                <nav aria-label="Breadcrumb" className={styles.breadcrumbNav}>
                    <ul>
                        <li><a href="#">Cardiff Uni</a></li>
                        <li className={styles.seperator}><img src={chevronRightIcn} alt=">" /></li>
                        <li><a href="#">Building X</a></li>
                        <li className={styles.seperator}><img src={chevronRightIcn} alt=">"/></li>
                        <li className="current">Room A102</li>
                    </ul>
                </nav>

                <h2>Room {roomId}</h2>
                <span className={styles.tools}>
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
                        onClick={handleReportClick}
                        title="Report an issue with this room"
                        aria-label="Report an issue with this room"
                    >
                        <img src={reportIcn} className={styles.reportIcon} alt="An icon of a flag" />
                    </button>
                </span>
                <Link className={styles.backLink} to="/">← Back to map</Link>
            </section>

            <section className={styles.content}>
                <aside className={styles.stats}>
                    <h2>Live Stats</h2>
                    {loading && <p>Loading sensor data...</p>}
                    {error && <p>Error: {error}</p>}
                    {!loading && !error && (
                        <div className={styles.sensorData}>
                            <span><img src={peopleIcn} alt="Person Icon"/>{stats?.occupancy ?? "No occupancy data"}</span>
                            <span><img src={tempIcn} alt="Temperature Icon"/>{stats?.temp ?? "No temperature data"}</span>
                            <span><img src={humidityIcn} alt="Humidity Icon"/>{stats?.humidity ?? "No humidity data"}</span>
                            <span><img src={noiseIcn} alt="Noise Icon"/>{stats?.noise ?? "No noise data"}</span>
                        </div>
                    )}
                </aside>

                <section className={styles.tableMap}>
                    <h2>Table Map</h2>
                    {tables.length > 0 ? (
                        <div className={styles.tableGrid}>
                            {tables.map((table) => {
                                const free = table.total - table.occupied;
                                return (
                                    <article key={table.id} className={styles.tableCard}>
                                        <div className={styles.tableTop}>
                                            <strong>{table.id}</strong>
                                            <span>{free} free</span>
                                        </div>
                                        <p>{table.occupied}/{table.total} occupied</p>
                                        <div className={styles.seats}>
                                            {Array.from({ length: table.total }).map((_, i) => (
                                                <span
                                                    key={i}
                                                    className={`${styles.seat} ${i < table.occupied ? styles.occupied : styles.free}`}
                                                />
                                            ))}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <p>No table data loaded.</p>
                    )}
                </section>

                <section className={styles.busyTimes}>
                    <h2>Busy Times</h2>
                    {/* TODO: display peak hours by day of week from OccupancyAverage */}
                </section>
            </section>
        </main>
    );
}
