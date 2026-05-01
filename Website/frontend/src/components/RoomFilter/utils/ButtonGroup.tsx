import styles from "../RoomFilter.module.css";

type ButtonGroupProps = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  leftClass?: string;
  rightClass?: string;
};

// Generic segmented button row used by filter controls.
export default function ButtonGroup({
  options,
  value,
  onChange,
  leftClass,
  rightClass,
}: ButtonGroupProps) {
  return (
    <div className={styles.noiseBtns}>
      {options.map((opt, idx) => {
        // Build class names for left/right rounded buttons and active state.
        const cls =
          idx === 0
            ? `${leftClass ?? ""} ${value === opt ? styles.clicked : ""}`
            : idx === options.length - 1
            ? `${rightClass ?? ""} ${value === opt ? styles.clicked : ""}`
            : value === opt
            ? styles.clicked
            : "";

        return (
          <button
            key={opt}
            type="button"
            className={cls}
            aria-pressed={value === opt}
            // Clicking the active option clears selection.
            onClick={() => onChange(value === opt ? "" : opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
