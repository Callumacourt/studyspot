import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Pages/RecommendationsPage.module.css";

import asslImg from "../assets/Images/ASSL.jpg";
import scienceImg from "../assets/Images/Science.jpg";
import tempIcon from "../assets/icons/thermometer.svg";
import humidityIcon from "../assets/icons/humidity.svg";
import userIcon from "../assets/icons/user.svg";
import volumeIcon from "../assets/icons/volume-2.svg";
import heartIcon from "../assets/icons/heart.svg";
import favoriteIcon from "../assets/icons/favorite.svg";
import chairIcon from "../assets/icons/chair.svg";


// -----user preferences - need to modify based on actual user input in the future
const preferences = [
    { id: "temp", icon: tempIcon, label: "Comfortable (20C - 23C)" },
    { id: "humidity", icon: humidityIcon, label: "Dry (Below 40%)" },
    { id: "occupancy", icon: userIcon, label: "Low (31 - 60% Occupied)" },
    { id: "noise", icon: volumeIcon, label: "Silent" },
];

// -----default recommendations - need to modify based on actual recommendation algorithm in the future
const defaultRecommendations = [
    {
        id: 1,
        university: "Cardiff University",
        name: "Silent Study Room",
        building: "ASSL",
        location: "Floor 3",
        temp: 22,
        occupied: 33,
        free: 7,
        image: asslImg,
    },
    {
        id: 3,
        university: "Cardiff University",
        name: "Quiet Study Space",
        building: "Science Library",
        location: "Floor 1",
        temp: 22,
        occupied: 33,
        free: 7,
        image: scienceImg,
    },
];

export default function Recommendations() {
    const navigate = useNavigate();
    const [savedIds, setSavedIds] = useState(() => new Set());

    const handleToggleSaved = (room) => {
        setSavedIds((currentIds) => {
            const nextIds = new Set(currentIds);

            if (nextIds.has(room.id)) {
                nextIds.delete(room.id);
            } else {
                nextIds.add(room.id);
            }

            return nextIds;
        });
    };

    return (
        <div className={styles.pageWrapper}>
            <section className={styles.preferencePanel}>
                <div className={styles.panelInner}>
                    <h1 className={styles.panelTitle}>Your Preferences</h1>
                    <div className={styles.preferenceGrid}>
                        {preferences.map((preference) => (
                            <div key={preference.id} className={styles.preferenceItem}>
                                <img
                                    src={preference.icon}
                                    alt=""
                                    aria-hidden="true"
                                    className={styles.preferenceIcon}
                                />
                                <span>{preference.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <main className={styles.mainContent}>
                <section className={styles.recommendationsSection}>
                    <h2 className={styles.title}>Recommendations</h2>

                    <div className={styles.cardList}>
                        {defaultRecommendations.map((room) => (
                            <article key={room.id} className={styles.roomCard}>
                                <div className={styles.imageWrapper}>
                                    <img
                                        src={room.image}
                                        alt={room.name}
                                        className={styles.roomImage}
                                    />
                                </div>

                                <div className={styles.cardContent}>
                                    <div className={styles.roomInfo}>
                                        <h3 className={styles.universityName}>
                                            {room.university}
                                        </h3>

                                        <h4 className={styles.roomName}>
                                            {room.name}
                                        </h4>

                                        <p className={styles.locationText}>
                                            {room.building} {room.location}
                                        </p>

                                        <div className={styles.actionIcons}>
                                            <button
                                                type="button"
                                                className={styles.iconButton}
                                                aria-label={`View details for ${room.name}`}
                                                onClick={() => navigate(`/room/${room.id}`)}
                                            >
                                                ↩
                                            </button>

                                            <button
                                                type="button"
                                                className={styles.iconButton}
                                                aria-label={`Save ${room.name} to favourites`}
                                                onClick={() => handleToggleSaved(room)}
                                            >
                        
                                                <img
                                                    src={savedIds.has(room.id) ? favoriteIcon : heartIcon}
                                                    alt=""
                                                    aria-hidden="true"
                                                    className={`${styles.actionIconImage} ${
                                                        savedIds.has(room.id) ? styles.savedIcon : ""
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.stats}>
                                        <div className={styles.statItem}>
                                            <img
                                                src={tempIcon}
                                                alt=""
                                                aria-hidden="true"
                                                className={styles.statIcon}
                                            />
                                            <span>{room.temp}C</span>
                                        </div>

                                        <div className={styles.statItem}>
                                            <img
                                                src={userIcon}
                                                alt=""
                                                aria-hidden="true"
                                                className={styles.statIcon}
                                            />
                                            <span>{room.occupied}</span>
                                        </div>

                                        <div className={styles.statItem}>
                                            <img
                                                src={chairIcon}
                                                alt=""
                                                aria-hidden="true"
                                                className={styles.statIcon}
                                            />
                                            <span>{room.free} Free</span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
