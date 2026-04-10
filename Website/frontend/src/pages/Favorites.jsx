import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Pages/FavoritesPage.module.css";

import asslImg from "../assets/Images/ASSL.jpg";
import scienceImg from "../assets/Images/Science.jpg";
import tempIcon from "../assets/icons/thermometer.svg";
import userIcon from "../assets/icons/user.svg";
import favIcon from "../assets/icons/favorite.svg";
import chairIcon from "../assets/icons/chair.svg";

const DEFAULT_FAVOURITE_ROOMS = [
    {
        id: 1,
        university: "Cardiff University",
        name: "Silent Study Room",
        building: "ASSL",
        location: "Floor 3",
        temp: 22,
        occupied: 33,
        free: 7,
        image: scienceImg,
    },
    {
        id: 3,
        university: "Cardiff University",
        name: "Room 1.45",
        building: "Science Library",
        location: "1.45",
        temp: 21,
        occupied: 10,
        free: 4,
        image: asslImg,
    },
];

function loadFavouriteRooms() {
    try {
        const storedRooms = localStorage.getItem("favoriteRooms");

        if (!storedRooms) {
            return DEFAULT_FAVOURITE_ROOMS;
        }

        const parsedRooms = JSON.parse(storedRooms);
        return Array.isArray(parsedRooms) && parsedRooms.length > 0
            ? parsedRooms
            : DEFAULT_FAVOURITE_ROOMS;
    } catch {
        return DEFAULT_FAVOURITE_ROOMS;
    }
}

export default function Favorites() {
    const navigate = useNavigate();
    const [favouriteRooms, setFavouriteRooms] = useState(loadFavouriteRooms);

    useEffect(() => {
        localStorage.setItem("favoriteRooms", JSON.stringify(favouriteRooms));
    }, [favouriteRooms]);

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate("/");
    };

    const handleRemoveFavourite = (roomId) => {
        setFavouriteRooms((currentRooms) =>
            currentRooms.filter((room) => room.id !== roomId)
        );
    };

    return (
        <div className={styles.pageWrapper}>
            <main className={styles.mainContent}>
                <button
                    className={styles.backButton}
                    onClick={handleBack}
                    type="button"
                >
                    <span className={styles.backArrow}>‹</span>
                    Back to previous page
                </button>

                <section className={styles.favouritesSection}>
                    <h1 className={styles.title}>Your Favourites</h1>

                    {favouriteRooms.length === 0 ? (
                        <p>You do not have any saved favourite rooms yet.</p>
                    ) : (

                        <div className={styles.cardList}>
                            {favouriteRooms.map((room) => (
                                <article key={room.id} className={styles.roomCard}>
                                    <div className={styles.imageWrapper}>
                                        <img
                                            src={room.image ?? scienceImg} 
                                            alt={room.name}
                                            className={styles.roomImage}
                                        />
                                    </div>

                                    <div className={styles.cardContent}>
                                        <div className={styles.roomInfo}>
                                            <h2 className={styles.universityName}>
                                                {room.university}
                                            </h2>

                                            <h3 className={styles.roomName}>
                                                {room.name}
                                            </h3>

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
                                                    aria-label={`Remove ${room.name} from favourites`}
                                                    onClick={() => handleRemoveFavourite(room.id)}
                                                >
                                                    <img
                                                        src={favIcon}
                                                        alt=""
                                                        aria-hidden="true"
                                                        className={styles.smallIcon}
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
                                                <span>{room.occupied} occupied</span>
                                            </div>

                                            <div className={styles.statItem}>
                                                <img
                                                    src={chairIcon}
                                                    alt=""
                                                    aria-hidden="true"
                                                    className={styles.statIcon}
                                                />                     
                                                <span>{room.free} free</span>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
