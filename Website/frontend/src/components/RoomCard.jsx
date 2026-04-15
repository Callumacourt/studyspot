import styles from "../styles/Components/RoomCard.module.css";

export default function RoomCard ({name, building, onClick }) {
    return (
        <div className={styles.roomCard} onClick={onClick} role="button" tabIndex={0}>
            <h3>{name}</h3>
            {building && <p>{building}</p>}
        </div>
    );
}