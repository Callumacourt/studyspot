import { Range } from "react-range";
import styles from "../RoomFilter.module.css";
import type { RangeFilterProps } from "./filterTypes";

// Reusable range slider for numeric filter values 
export default function RangeFilter({ label, reading, vals, setVals, min, max, step, unit }: RangeFilterProps) {
  const values = vals[reading] as [number, number];

  return (
    <div>
      <label id={`${reading}-label`}>{label}:</label>
      <div role="group" aria-labelledby={`${reading}-label`}>
        <Range
          values={[values[0], values[1]]}
          step={step}
          min={min}
          max={max}
          onChange={(v) =>
            setVals((prevVals) => ({ ...prevVals, [reading]: [Math.round(v[0]), Math.round(v[1])] }))
          }
          renderTrack={({ props, children }) => {
            const leftPct = ((values[0] - min) / (max - min)) * 100;
            const rightPct = ((values[1] - min) / (max - min)) * 100;
            const gradient = `linear-gradient(to right, #ddd ${leftPct}%, #2a5c82 ${leftPct}%, #2a5c82 ${rightPct}%, #ddd ${rightPct}%)`;
            return (
              <div
                onMouseDown={props.onMouseDown}
                onTouchStart={props.onTouchStart}
                className={styles.rangeWrapper}
              >
                <div
                  ref={props.ref}
                  className={styles.track}
                  style={{ background: gradient }}
                >
                  {children}
                </div>
              </div>
            );
          }}
          renderThumb={({ props, index }) => (
            <div
              {...props}
              className={styles.thumb}
              style={props.style}
              aria-label={index === 0 ? `Minimum ${label}` : `Maximum ${label}`}
            >
              <div className={styles.thumbValue}>{index === 0 ? values[0] : values[1]}</div>
            </div>
          )}
        />
        <p>{values[0]}{unit} - {values[1]}{unit}</p>
      </div>
    </div>
  );
}