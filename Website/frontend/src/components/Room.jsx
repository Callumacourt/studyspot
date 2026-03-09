import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styles from "../styles/Pages/Room.module.css";

export default function Room () {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const isLoggedIn = Boolean(localStorage.getItem("token"));
    const [isFavourite, setIsFavourite] = useState(false);

    const handleFavouriteClick = () => {
        if (!isLoggedIn) {
            navigate("/login");
            return;
        }
        setIsFavourite((prev) => !prev);
    };

    const roomData = null;
    const stats = roomData?.stats;
    const tables = roomData?.tables ?? [];

    return (
        <main className={styles.page}>
            <section className={styles.header}>
                <h2>Room {roomId}</h2>

                <button
                    type="button"
                    className={`${styles.favBtn} ${isFavourite ? styles.favActive : ""}`}
                    onClick={handleFavouriteClick}
                    title={isLoggedIn ? "Toggle favourite" : "Log in to favourite rooms"}
                    aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
                >
                    {isFavourite ? "★" : "☆"}
                </button>

                <Link className={styles.backLink} to="/">← Back to map</Link>
            </section>

            <section className={styles.content}>
                <aside className={styles.stats}>
                    <h2>Live Stats</h2>

                    {stats ? (
                        <>
                            <div className={styles.statItem}><span>Current temp</span><strong>{stats.temperature}</strong></div>
                            <div className={styles.statItem}><span>Occupancy</span><strong>{stats.occupiedSeats} / {stats.totalSeats}</strong></div>
                            <div className={styles.statItem}><span>Humidity</span><strong>{stats.humidity}</strong></div>
                            <div className={styles.statItem}><span>Noise level</span><strong>{stats.noiseLevel}</strong></div>
                            <div className={styles.statItem}><span>Seats free</span><strong>{stats.freeSeats}</strong></div>
                        </>
                    ) : (
                        <p>No stats loaded.</p>
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
                <section className = {styles.busyTimes}>
                    <h2>Busy Times</h2>
                </section>
            </section>
        </main>
    );
}
