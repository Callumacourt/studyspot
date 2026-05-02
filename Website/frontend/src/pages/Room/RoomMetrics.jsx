import { useState } from "react";
import tempIcn     from "../../assets/icons/thermometer.svg";
import humidityIcn from "../../assets/icons/humidity.svg";
import noiseIcn    from "../../assets/icons/volume-2.svg";
import styles      from "./Room.module.css";

// Label thresholds mirrors backend MetricConverters.ts
function noiseLabel(db) {
    if (db < 50) return "Silent";
    if (db < 70) return "Quiet";
    if (db < 90) return "Normal";
    return "Loud";
}

function lightLabel(lux) {
    if (lux < 50)  return "Dark";
    if (lux < 200) return "Dim";
    if (lux < 500) return "Normal";
    return "Bright";
}

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
    { key: "temp",     label: "Temperature", icon: (s) => <img src={tempIcn}     alt="Temperature Icon" />, fallback: "No temperature data" },
    { key: "humidity", label: "Humidity",    icon: (s) => <img src={humidityIcn} alt="Humidity Icon"    />, fallback: "No humidity data"    },
    { key: "noise",    label: "Noise",       icon: (s) => <img src={noiseIcn}    alt="Noise Icon"       />, fallback: "No noise data",       labelFn: noiseLabel, rawKey: "noiseRaw", unit: "dB"  },
    { key: "light",    label: "Light",       icon: (s) => <LightIcon />,                                    fallback: "No light data",        labelFn: lightLabel, rawKey: "lightRaw", unit: "lux" },
];

export default function RoomMetrics({ stats }) {
    const [revealed, setRevealed] = useState(/** @type {Set<string>} */ (new Set()));

    function toggle(key) {
        setRevealed((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    return (
        <div className={styles.sensorData}>
            {METRICS.map(({ key, label, icon, fallback, labelFn, rawKey, unit }) => {
                const raw       = rawKey ? stats?.[rawKey] : null;
                const formatted = stats?.[key] ?? null;
                const hasLabel  = labelFn && raw != null;
                const isRevealed = revealed.has(key);

                let displayValue;
                if (hasLabel && !isRevealed) {
                    displayValue = labelFn(raw);
                } else if (formatted) {
                    displayValue = formatted;
                } else {
                    displayValue = fallback;
                }

                return (
                    <div
                        key={key}
                        className={`${styles.metric}${hasLabel ? ` ${styles.metricClickable}` : ""}`}
                        onClick={hasLabel ? () => toggle(key) : undefined}
                        role={hasLabel ? "button" : undefined}
                        tabIndex={hasLabel ? 0 : undefined}
                        onKeyDown={hasLabel ? (e) => (e.key === "Enter" || e.key === " ") && toggle(key) : undefined}
                        aria-label={hasLabel ? `${label}: ${displayValue}. Click to ${isRevealed ? "show label" : `show value in ${unit}`}` : undefined}
                        title={hasLabel ? (isRevealed ? "Click to show label" : `Click to show value in ${unit}`) : undefined}
                    >
                        <div className={styles.metricTitle}>{label}</div>
                        <div className={styles.metricValue}>
                            {icon(stats)}
                            <span>{displayValue}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
