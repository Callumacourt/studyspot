import styles from "./RoomCard.module.css";
import tempIcn from "../../assets/icons/thermometer.svg";
import humidityIcn from "../../assets/icons/humidity.svg";
import occupancyIcn from "../../assets/icons/user.svg";
import mapIcn from "../../assets/icons/map.svg";

// Search results card for a room; fully clickable to open room details.
export default function RoomCard({ name, building, metrics, onClick }) {
  return (
    <div
      className={styles.roomCard}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Open room ${name}`}
    >
      <h3 className={styles.title}>{name}</h3>

      <div className={styles.row}>
        <div className={styles.left}>
          {building && (
            <span className={styles.building}>
              <img src={mapIcn} alt="" aria-hidden="true" />
              {building}
            </span>
          )}
        </div>

        <div className={styles.right}>
          <span className={styles.stat}>
            <img src={tempIcn} alt="" aria-hidden="true" />
            {metrics?.temperature ?? "—"} °C
          </span>
          <span className={styles.stat}>
            <img src={humidityIcn} alt="" aria-hidden="true" />
            {metrics?.humidity ?? "—"} %
          </span>
          <span className={styles.stat}>
            <img src={occupancyIcn} alt="" aria-hidden="true" />
            {metrics?.occupancy ?? "—"} %
          </span>
        </div>
      </div>
    </div>
  );
}