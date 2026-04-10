import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import styles from "../styles/Pages/Room.module.css";
import asslImg from "../assets/Images/ASSL.jpg";
import tempIcon from "../assets/icons/thermometer.svg";
import humidityIcon from "../assets/icons/humidity.svg";
import userIcon from "../assets/icons/user.svg";
import volumeIcon from "../assets/icons/volume-2.svg";
import chairIcon from "../assets/icons/chair.svg";
import heartIcon from "../assets/icons/heart.svg";
import favoriteIcon from "../assets/icons/favorite.svg";
import reportIcon from "../assets/icons/flag.svg";
import directionIcon from "../assets/icons/direction.svg";
import wheelchairIcon from "../assets/icons/wheelchair.svg";
import toiletIcon from "../assets/icons/toilet.svg";
import coffeeIcon from "../assets/icons/coffee.svg";
import heightIcon from "../assets/icons/height.svg";

// -----this room as an example for now - need to modify later
const roomMap = {
    "1": {
        name: "Silent Study Room",
        building: "ASSL",
        floor: "Floor 3",
        image: asslImg,
        temperature: "21C",
        occupancy: "50%",
        freeDesks: "10",
        noise: "Quiet",
        humidity: "50%",
        openHours: "06:00 - 18:00",
        liveCount: "48 People",
    },
};

const amenityList = [
    { icon: wheelchairIcon, label: "Wheelchair Accessible" },
    { icon: directionIcon, label: "Lift Access" },
    { icon: toiletIcon, label: "Toilets Nearby" },
    { icon: coffeeIcon, label: "Close To Refreshments" },
    { icon: heightIcon, label: "Adjustable Desks" },
];

const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

export default function RoomDetail() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [isSaved, setIsSaved] = useState(false);

    const room = useMemo(() => {
        return roomMap[roomId] ?? roomMap["1"];
    }, [roomId]);

    const metrics = [
        { icon: tempIcon, label: "Temperature", value: room.temperature },
        { icon: userIcon, label: "Occupancy", value: room.occupancy },
        { icon: chairIcon, label: "Free Desks", value: room.freeDesks },
        { icon: volumeIcon, label: "Noise Level", value: room.noise },
        { icon: humidityIcon, label: "Humidity", value: room.humidity },
    ];

    return (
        <section className={styles.page}>
            <div className={styles.inner}>
                <div className={styles.backRow}>
                    <button
                        type="button"
                        className={styles.backButton}
                        onClick={() => navigate(-1)}
                    >
                        <span aria-hidden="true" className={styles.backArrow}>
                            ‹
                        </span>
                        Back to search results
                    </button>
                </div>

                <article className={styles.heroCard}>
                    <div className={styles.imagePanel}>
                        <img
                            src={room.image}
                            alt={room.name}
                            className={styles.roomImage}
                        />
                    </div>

                    <div className={styles.detailsPanel}>
                        <div className={styles.roomIntro}>
                            <div>
                                <h1 className={styles.roomTitle}>{room.name}</h1>
                                <p className={styles.roomSubtitle}>
                                    {room.building} {room.floor}
                                </p>
                            </div>

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.actionButton}
                                    aria-label="Share room"
                                >
                                    <img
                                        src={directionIcon}
                                        alt=""
                                        aria-hidden="true"
                                        className={styles.actionIcon}
                                    />
                                </button>
                                <button
                                    type="button"
                                    className={styles.actionButton}
                                    aria-label={isSaved ? "Remove from favourites" : "Add to favourites"}
                                    onClick={() => setIsSaved((current) => !current)}
                                >
                                    <img
                                        src={isSaved ? favoriteIcon : heartIcon}
                                        alt=""
                                        aria-hidden="true"
                                        className={styles.actionIcon}
                                    />
                                </button>
                                <button
                                    type="button"
                                    className={styles.actionButton}
                                    aria-label="Report an issue"
                                >
                                    <img
                                        src={reportIcon}
                                        alt=""
                                        aria-hidden="true"
                                        className={styles.actionIcon}
                                    />
                                </button>
                            </div>
                        </div>

                        <div className={styles.detailGrid}>
                            <div className={styles.metricsColumn}>
                                {metrics.map((metric) => (
                                    <div key={metric.label} className={styles.metricRow}>
                                        <img
                                            src={metric.icon}
                                            alt=""
                                            aria-hidden="true"
                                            className={styles.metricIcon}
                                        />
                                        <span className={styles.metricLabel}>
                                            {metric.label}: {metric.value}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.amenitiesColumn}>
                                {amenityList.map((amenity) => (
                                    <div key={amenity.label} className={styles.amenityRow}>
                                        <img
                                            src={amenity.icon}
                                            alt=""
                                            aria-hidden="true"
                                            className={styles.amenityIcon}
                                        />
                                        <span>{amenity.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </article>

                <section className={styles.busySection}>
                    <div className={styles.busyHeader}>
                        <h2 className={styles.sectionTitle}>Busy Times</h2>
                        <div className={styles.statusRow}>
                            <span className={styles.openText}>Open: {room.openHours}</span>
                            <span className={styles.liveText}>Live: {room.liveCount}</span>
                        </div>
                    </div>

                    <div className={styles.chartCard}>
                        <div className={styles.chartFrame} aria-hidden="true" />

                        <div className={styles.dayTabs}>
                            {weekdays.map((day, index) => (
                                <button
                                    key={day}
                                    type="button"
                                    className={`${styles.dayButton} ${index === 0 ? styles.dayButtonActive : ""}`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </section>
    );
}
