import { useNavigate } from "react-router-dom"
import styles from "./SearchPage.module.css";
import RoomFilter from "../../components/RoomFilter/RoomFilter.tsx";
import RoomCard from "../../components/RoomCard/RoomCard.jsx";
import { useState, useEffect } from "react";
import axios from "axios";
import chevronDown from "../assets/icons/chevron-down.svg";
import chevronUp from "../assets/icons/chevron-up.svg";
import searchIcn from "../assets/icons/search.svg";

export default function SearchPage () {
    const navigate = useNavigate();
    const [filterExpanded, setFilterExpanded] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchRooms() {
            try {
                const res = await axios.get("/api/rooms");
                setRooms(res.data.rooms);
            } catch (err) {
                setError("Failed to load rooms.");
            } finally {
                setLoading(false);
            }
        }
        fetchRooms();
    }, []);

    /**
     * Navigate to the detailed view for a specific room.
     * @param {number} roomId - The ID of the room to view
     */
    const goToRoom = (roomId) => {
        navigate(`/room/${roomId}`);
    };

    return (
        <main className={styles.content}>
            <section className={styles.navButtons}>
                <div className={styles.paddedSection}>
                    <button>Find me a quiet spot</button>
                    <button
                        className={styles.filterExpandBtn}
                        onClick={() => setFilterExpanded(v => !v)}
                        aria-expanded={filterExpanded}
                    >
                        <span>Filter rooms</span>
                        <img
                            src={filterExpanded ? chevronDown : chevronUp}
                            alt=""
                            aria-hidden="true"
                        />
                    </button>
                    <span>
                        <button className={styles.searchBtn}>
                            <span>Search for a room</span>
                            <img src={searchIcn} alt="Search icon" />
                        </button>
                    </span>
                    <section className={styles.filterExpanded}>
                        {filterExpanded && <RoomFilter />}
                    </section>
                </div>
                <section className={styles.atGlance}>
                    <h3>At a glance</h3>
                    <ul>
                        <li>Abacws: 3.02 - 5 tables free</li>
                        <li>Sir Martin Evans - 4 tables free</li>
                    </ul>
                </section>
            </section>
            <section className={styles.campusMap}>
                <nav className={styles.navBoard}>
                    <button>Recently Viewed</button>
                    <button>Your Favourites</button>
                    <button>Cardiff University</button>
                </nav>
                <h2>Explore Study Spaces</h2>

                {loading && <p>Loading rooms...</p>}
                {error && <p>{error}</p>}
                {console.log(`rooms ${rooms}`)}
                <div className={styles.roomGrid}>
                    {console.log(rooms)}
                    {rooms.map((room) => (
                        <RoomCard
                            key={room.id}
                            name={room.name}
                            building={room.building?.name}
                            onClick={() => goToRoom(room.id)}
                        />
                    ))}
                </div>
            </section>
        </main>
    );
}