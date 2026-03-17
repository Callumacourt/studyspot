import { useNavigate } from "react-router-dom"
import styles from "../styles/Pages/Home.module.css"
import RoomFilter from "../components/RoomFilter.tsx";
import { useState } from "react";
import chevronDown from "../assets/icons/chevron-down.svg";
import chevronUp from "../assets/icons/chevron-up.svg";

export default function Home () {
    const navigate = useNavigate();
    const [filterExpanded, setFilterExpanded] = useState(false) 

    const goToRoom = (roomId) => {
        navigate(`/room/${roomId}`);
    };

    return (
        <main className = {styles.content}>
            <section className = {styles.navButtons}>
                <div className = {styles.paddedSection}>
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
                        <button>Search for a room</button>
                    </span>
                    <section className={styles.filterExpanded}>
                    {filterExpanded && (
                        <RoomFilter/>
                    )}
                    </section>
                </div>
                {/* maybe ranked on rooms with free tables? top 5 etc 
                    just placeholder examples for now
                */}
                <section className={styles.atGlance}>
                    <h3>At a glance</h3>
                    <ul>
                        <li>Abacws: 3.02 - 5 tables free</li>
                        <li>Sir Martin Evans - 4 tables free</li>
                    </ul>
                </section>
            </section>

            {/* random fake rooms - maybe we need an admin workflow for rooms to be added */}
            <section className = {styles.campusMap}>
                <button className={styles.roomButton} onClick={() => goToRoom("A101")} style={{top: '10%', left: '15%'}}>Room A101</button>
                <button className={styles.roomButton} onClick={() => goToRoom("A102")} style={{top: '10%', left: '50%'}}>Room A102</button>
                <button className={styles.roomButton} onClick={() => goToRoom("A103")} style={{top: '10%', left: '75%'}}>Room A103</button>
                <button className={styles.roomButton} onClick={() => goToRoom("B201")} style={{top: '35%', left: '20%'}}>Room B201</button>
                <button className={styles.roomButton} onClick={() => goToRoom("B202")} style={{top: '35%', left: '60%'}}>Room B202</button>
                <button className={styles.roomButton} onClick={() => goToRoom("C301")} style={{top: '60%', left: '10%'}}>Room C301</button>
                <button className={styles.roomButton} onClick={() => goToRoom("C302")} style={{top: '60%', left: '45%'}}>Room C302</button>
                <button className={styles.roomButton} onClick={() => goToRoom("C303")} style={{top: '60%', left: '70%'}}>Room C303</button>
                <button className={styles.roomButton} onClick={() => goToRoom("LIBRARY")} style={{top: '80%', left: '30%'}}>Library</button>
                <button className={styles.roomButton} onClick={() => goToRoom("STUDY-HALL")} style={{top: '80%', left: '65%'}}>Study Hall</button>
            </section>
        </main>
    )
}