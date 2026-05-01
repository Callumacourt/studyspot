import tempIcn     from "../../assets/icons/thermometer.svg";
import humidityIcn from "../../assets/icons/humidity.svg";
import noiseIcn    from "../../assets/icons/volume-2.svg";
import styles      from "./Room.module.css";

function LightIcon() {
    return (
        <svg className={styles.inlineStatIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M9 18h6m-5 3h4m-6.2-6.5C6.68 13.4 6 11.98 6 10.4 6 6.87 8.69 4 12 4s6 2.87 6 6.4c0 1.58-.68 3-1.8 4.1-.71.69-1.2 1.28-1.45 1.9h-5.5c-.25-.62-.74-1.21-1.45-1.9Z"
                fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            />
        </svg>
    );
}

const METRICS = [
    { key: "temp",     label: "Temperature", icon: <img src={tempIcn}     alt="Temperature Icon" />, fallback: "No temperature data" },
    { key: "humidity", label: "Humidity",    icon: <img src={humidityIcn} alt="Humidity Icon"    />, fallback: "No humidity data"    },
    { key: "noise",    label: "Noise",       icon: <img src={noiseIcn}    alt="Noise Icon"       />, fallback: "No noise data"       },
    { key: "light",    label: "Light",       icon: <LightIcon />,                                    fallback: "No light data"       },
];

export default function RoomMetrics({ stats }) {
    return (
        <div className={styles.sensorData}>
            {METRICS.map(({ key, label, icon, fallback }) => (
                <div key={key} className={styles.metric}>
                    <div className={styles.metricTitle}>{label}</div>
                    <div className={styles.metricValue}>
                        {icon}
                        {stats?.[key] ?? fallback}
                    </div>
                </div>
            ))}
        </div>
    );
}
