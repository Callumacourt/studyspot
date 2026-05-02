import styles from "./RoomCard.module.css";
import tempIcn from "../../assets/icons/thermometer.svg";
import humidityIcn from "../../assets/icons/humidity.svg";
import occupancyIcn from "../../assets/icons/user.svg";
import mapIcn from "../../assets/icons/map.svg";

// Occupancy % → label + colour
function occupancyInfo(pct) {
  if (pct == null) return { label: "—", color: "#94a3b8", css: null };
  if (pct === 0)   return { label: "Empty",  color: "#94a3b8", css: styles.statSlate   };
  if (pct <= 33)   return { label: "Sparse",  color: "#34d399", css: styles.statGreen   };
  if (pct <= 66)   return { label: "Normal", color: "#fbbf24", css: styles.statAmber   };
  return                  { label: "Busy",   color: "#f87171", css: styles.statRed     };
}

// Temperature °C → label + colour
function tempInfo(val) {
  if (val == null) return { label: "—", css: null };
  const n = Number(val);
  if (n < 16) return { label: `${val} °C`,  css: styles.statBlue  };
  if (n < 20) return { label: `${val} °C`,  css: styles.statBlue  };
  if (n < 25) return { label: `${val} °C`,          css: null              };
  return           { label: `${val} °C`,  css: styles.statOrange };
}

// Search results card for a room; fully clickable to open room details.
export default function RoomCard({ name, building, metrics, onClick }) {
  const occ  = occupancyInfo(metrics?.occupancy);
  const temp = tempInfo(metrics?.temperature);

  return (
    <div
      className={styles.roomCard}
      style={{ borderLeft: `4px solid ${occ.color}` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Open room ${name}`}
    >
      <h3 className={styles.title}>{name}</h3>

      <div className={styles.row}>
          {building && (
            <span className={styles.building}>
              <img src={mapIcn} alt="" aria-hidden="true" />
              {building}
            </span>
          )}
        </div>

        <div className={styles.right}>
          <span className={`${styles.stat} ${temp.css ?? ""}`}>
            <img src={tempIcn} alt="" aria-hidden="true" />
            {temp.label}
          </span>
          <span className={styles.stat}>
            <img src={humidityIcn} alt="" aria-hidden="true" />
            {metrics?.humidity ?? "—"} %
          </span>
          <span className={`${styles.stat} ${occ.css ?? ""}`}>
            <img src={occupancyIcn} alt="" aria-hidden="true" />
            {occ.label}
          </span>
        </div>
      </div>
  );
}