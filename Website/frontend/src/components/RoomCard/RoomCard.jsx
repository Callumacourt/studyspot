import { useEffect } from "react";
import styles from "./RoomCard.module.css";

export default function RoomCard ({name, building, metrics, onClick }) {

    return (
        <div className={styles.roomCard} onClick={onClick} role="button" tabIndex={0}>
            <h3>{name}</h3>
            <nav>
            {building && <p>{building}</p>}
            <div>{metrics?.temperature ?? " "} °C</div>
            <div>{metrics?.humidity ?? " "} %</div>
            <div>{metrics?.occupancy ?? " "}</div>
            </nav>
        </div>
    );
}