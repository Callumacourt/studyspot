import { useState }        from "react";
import { createPortal }    from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import reportIcn           from "../../assets/icons/flag.svg";
import chevronRightIcn     from "../../assets/icons/chevron-right.svg";
import DirectionIcn        from "../../assets/icons/map.svg";
import roomImg             from "../../assets/Images/study-room.jpg";
import { useSensorData }   from "../../hooks/useSensorData";
import BusyTimesChart      from "../../components/BusyTimesChart/BusyTimesChart";
import RoomBooker          from "../../components/RoomBooker/RoomBooker";
import RoomMetrics         from "./RoomMetrics";
import RoomAccessibility   from "./RoomAccessibility";
import RoomReport          from "./RoomReport";
import { useRoomData }     from "./useRoomData";
import styles              from "./Room.module.css";

export default function Room() {
    const { roomId }  = useParams();
    const navigate    = useNavigate();

    const {
        roomData, hourlyAverages,
        isFavourite, favLoading,
        actionMessage, setActionMessage,
        toggleFavourite, getBuildingName, isLoggedIn,
    } = useRoomData(roomId);

    const [reportOpen, setReportOpen] = useState(false);
    const [bookerOpen, setBookerOpen] = useState(false);

    const { stats, loading, error } = useSensorData(roomId);

    const openGoogleMaps = () => {
        const query = getBuildingName() || roomData?.name || "";
        if (!query) return;
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
    };

    return (
        <main className={styles.page}>
            {/* ── Breadcrumb ── */}
            <section className={styles.header}>
                <nav aria-label="Breadcrumb" className={styles.breadcrumbNav}>
                    <ul>
                        <li><a href="#">Cardiff Uni</a></li>
                        <li className={styles.seperator}><img src={chevronRightIcn} alt=">" /></li>
                        <li><a href="#">{getBuildingName() || "Building"}</a></li>
                        <li className={styles.seperator}><img src={chevronRightIcn} alt=">" /></li>
                        <li className="current">{roomData?.name ?? `Room ${roomId}`}</li>
                    </ul>
                </nav>
                <Link className={styles.backLink} to="/search">← Back to map</Link>
            </section>

            <section className={styles.content}>
                {/* ── Room image card ── */}
                <section
                    className={styles.roomImageCard}
                    onClick={openGoogleMaps}
                    role="button" tabIndex={0} title="Open building in Google Maps"
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openGoogleMaps(); }}
                >
                    <img src={roomImg} alt={roomData?.name ? `${roomData.name} study space` : "Study room"} className={styles.roomImage} />
                    <div className={styles.roomImageOverlay}>
                        <h3>{roomData?.name ?? `Room ${roomId}`}</h3>
                        <p>Quiet study zone • Live monitored</p>
                    </div>
                </section>
                {console.log(roomData)}

                {/* ── Stats sidebar ── */}
                <aside className={styles.stats}>
                    <div className={styles.statsNav}>
                        <div className={styles.roomTitle}>{roomData?.name ?? `Room ${roomId}`}</div>
                        <div className={styles.statsActions}>
                            {roomData?.bookable && (
                                <button type="button" className={styles.bookBtn}
                                    onClick={() => setBookerOpen((s) => !s)}
                                    aria-haspopup="dialog" aria-expanded={bookerOpen}
                                    aria-controls="room-booker" title="Book this room"
                                >
                                    Book
                                </button>
                            )}
                            <a
                                href={roomData ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getBuildingName() || roomData.name || "")}` : "#"}
                                target="_blank" rel="noreferrer"
                                className={styles.iconButton} aria-label="Directions to room"
                            >
                                <img src={DirectionIcn} alt="Directions" />
                            </a>
                            <button
                                type="button"
                                className={`${styles.favBtn} ${isFavourite ? styles.favActive : ""}`}
                                onClick={() => toggleFavourite(navigate)}
                                title={isLoggedIn ? "Toggle favourite" : "Log in to favourite rooms"}
                                aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
                                disabled={favLoading}
                            >
                                <svg className={styles.favIcon} viewBox="0 0 24 24">
                                    <path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 17.52 6.12 20.62l1.12-6.56L2.48 9.42l6.58-.96L12 2.5z"
                                        fill={isFavourite ? "currentColor" : "none"}
                                        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button type="button" className={styles.iconButton}
                                title="Report an issue" aria-label="Report an issue with this room"
                                onClick={() => { if (!isLoggedIn) { navigate("/login"); return; } setReportOpen(true); }}
                            >
                                <img src={reportIcn} className={styles.reportIcon} alt="Report" />
                            </button>
                        </div>
                    </div>

                    {actionMessage && <p className={styles.inlineMessage}>{actionMessage}</p>}
                    {loading        && <p>Loading sensor data...</p>}
                    {error          && <p>Error: {error}</p>}

                    <div className={styles.statsContent}>
                        <h4>Environment Metrics</h4>
                        <RoomMetrics stats={stats} />
                        <h4>Room Accessibility</h4>
                        <RoomAccessibility roomData={roomData} />
                    </div>

                </aside>

                {/* ── Busy times chart ── */}
                <section className={styles.busyTimes}>
                    <nav className={styles.roomNav}><h2>Busy Times</h2></nav>
                    <div className={styles.graphContainer}>
                        <BusyTimesChart
                            hourlyAverages={hourlyAverages}
                            liveOccupancy={stats?.occupancy ?? null}
                            openHour={roomData?.openHour}
                            closeHour={roomData?.closeHour}
                            roomId={roomId}
                        />
                    </div>
                </section>
            </section>

            {reportOpen && (
                <RoomReport
                    roomId={roomId}
                    onClose={() => setReportOpen(false)}
                    onMessage={setActionMessage}
                />
            )}

            {bookerOpen && createPortal(
                <div
                    className={styles.bookerOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Book this room"
                    id="room-booker"
                    onClick={(e) => { if (e.target === e.currentTarget) setBookerOpen(false); }}
                >
                    <div className={styles.bookerModal}>
                        <button
                            className={styles.bookerClose}
                            onClick={() => setBookerOpen(false)}
                            aria-label="Close booking"
                        >✕</button>
                        <h2 className={styles.bookerTitle}>
                            Book — {roomData?.name ?? `Room ${roomId}`}
                        </h2>
                        <RoomBooker
                            roomId={roomId}
                            openHour={roomData?.openHour}
                            closeHour={roomData?.closeHour}
                            maxBookingDurationMinutes={roomData?.maxBookingDurationMinutes}
                            onSuccess={() => setBookerOpen(false)}
                        />
                    </div>
                </div>,
                document.body
            )}
        </main>
    );
}
