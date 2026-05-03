import styles from "./Room.module.css";

function WheelchairIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M13 7a3 3 0 11-2.83 4H9v2h2.17A3.001 3.001 0 1113 7zM6 20a2 2 0 100-4 2 2 0 000 4zm12 0a4 4 0 100-8 4 4 0 000 8zM8 11v6h2v-4h2v-2H8z" fill="currentColor" />
        </svg>
    );
}

function DeskIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M3 7h18v2H3V7zm2 4h14v6H5v-6zM7 19v2h2v-2H7zm8 0v2h2v-2h-2z" fill="currentColor" />
        </svg>
    );
}

function GroundIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 2L2 7v2c0 5 4 9 10 13 6-4 10-8 10-13V7l-10-5z" fill="currentColor" />
        </svg>
    );
}

function HearIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 3v2a7 7 0 017 7 7 7 0 01-7 7v2a9 9 0 009-9 9 9 0 00-9-9zM3 12a9 9 0 0112.9-8.36L14 7a5 5 0 00-6 5 5 5 0 006 5l1.9 3.36A9 9 0 013 12z" fill="currentColor" />
        </svg>
    );
}

const ACCESS_ITEMS = [
    { key: "wheelchairAccessible", label: "Wheelchair",         Icon: WheelchairIcon },
    { key: "hasAdjustableDesks",   label: "Adjustable desks",   Icon: DeskIcon       },
    { key: "groundFloor",          label: "Ground floor",       Icon: GroundIcon     },
    { key: "hearingAssistance",    label: "Hearing assistance",  Icon: HearIcon       },
];

export default function RoomAccessibility({ roomData }) {
    return (
        <div className={styles.accessibility}>
            {ACCESS_ITEMS.map(({ key, label, Icon }) => (
                <div
                    key={key}
                    className={styles.accessItem}
                    // Full sentence label lets screen readers skip the separate icon/label/flag columns
                    aria-label={`${label}: ${roomData?.[key] ? "Yes" : "No"}`}
                >
                    <div className={styles.accessIcon} aria-hidden="true"><Icon /></div>
                    <div className={styles.accessLabel} aria-hidden="true">{label}</div>
                    <div className={styles.accessFlag} aria-hidden="true">{roomData?.[key] ? "Yes" : "No"}</div>
                </div>
            ))}
        </div>
    );
}
