import { useState } from "react";
import styles from "./RoomFilter.module.css";
import RangeFilter from "./utils/RangeFilter";
import ButtonGroup from "./utils/ButtonGroup";
import type { FiltersState, RoomFilterProps } from "./utils/filterTypes";
import chevronUp from "../../assets/icons/chevron-up.svg";
import chevronDown from "../../assets/icons/chevron-down.svg";

export default function RoomFilter({ onFilterChange, onReset, filteredRooms = [] }: RoomFilterProps) {
  const defaultFilters: FiltersState = {
    temp: [10, 40],
    humidity: [10, 100],
    noise: "",
    occupancy: "",
    accessibility: [],
  };

  const [vals, setVals] = useState<FiltersState>(defaultFilters);
  const [showEnvironmentFilters, setShowEnvironmentFilters] = useState(false);
  const [showAccessibilityFilters, setShowAccessibilityFilters] = useState(false);

  const handleNoiseChange = (noiseLvl: string) => {
    setVals((prev) => {
      const next = { ...prev, noise: prev.noise === noiseLvl ? "" : noiseLvl };
      onFilterChange(next);
      return next;
    });
  };

  const handleAccessibilityChange = (feature: string) => {
    setVals((prevVals) => {
      const updated = prevVals.accessibility.includes(feature)
        ? prevVals.accessibility.filter((f) => f !== feature)
        : [...prevVals.accessibility, feature];

        const next = {...prevVals, accessibility: updated };
          onFilterChange(next);
          return next;
        });
  };

  const handleReset = () => {
    setVals(defaultFilters);
    onReset();
  };

  const handleOccupancyChangeBtn = (occ: string) => {
    setVals((prev) => {
      const next = { ...prev, occupancy: prev.occupancy === occ ? "" : occ };
      onFilterChange(next);
      return next;
    });
  };

  return (
    <form
      className={styles.filterForm}
      onSubmit={(e) => {
        e.preventDefault();
        onFilterChange(vals);
      }}
    >
      <fieldset className = {styles.noiseFilter}>
        <legend>Noise Level</legend>
        <div className={styles.noiseBtns}>
          <button
            type="button"
            className={`${styles.leftBtn} ${vals.noise === "Silent" ? styles.clicked : ""}`}
            aria-label="Silent"
            onClick={() => handleNoiseChange("Silent")}
          >
            Silent
          </button>
          <button
            type="button"
            className={vals.noise === "Quiet" ? styles.clicked : ""}
            aria-label="Quiet"
            onClick={() => handleNoiseChange("Quiet")}
          >
            Quiet
          </button>
          <button
            type="button"
            className={`${styles.rightBtn} ${vals.noise === "Normal" ? styles.clicked : ""}`}
            aria-label="Normal+"
            onClick={() => handleNoiseChange("Normal")}
          >
            Moderate+
          </button>
        </div>
      </fieldset>

      <fieldset className = {styles.occupancyFilter}>
        <legend>Occupancy</legend>
        <ButtonGroup
          options={["Any", "Empty", "Sparse", "Moderate+"]}
          value={vals.occupancy || "Any"}
          onChange={(v) => handleOccupancyChangeBtn(v === "Any" ? "" : v)}
          leftClass={styles.leftBtn}
          rightClass={styles.rightBtn}
        />
      </fieldset>

      <fieldset className = {styles.environmentFilter}>
        <button
          type="button"
          className={styles.collapseBtn}
          aria-expanded={showEnvironmentFilters}
          aria-controls="environment-filters"
          onClick={() => setShowEnvironmentFilters((prev) => !prev)}
        >
          Environment Filters {showEnvironmentFilters ? <img src = {chevronUp} alt = "▲" /> : <img src = {chevronDown} alt="▼"/>}
        </button>

        {showEnvironmentFilters && (
          <div id="environment-filters" className={styles.environmentFilters}>
            <RangeFilter
              label="Temperature"
              reading="temp"
              vals={vals}
              setVals={setVals}
              min={10}
              max={40}
              step={1}
              unit="°C"
            />
            <RangeFilter
              label="Humidity"
              reading="humidity"
              vals={vals}
              setVals={setVals}
              min={10}
              max={100}
              step={1}
              unit="%"
            />
          </div>
        )}
      </fieldset>
      <fieldset className = {styles.accessibilityFilter}>
        <button
          type="button"
          className={styles.collapseBtn}
          aria-expanded={showAccessibilityFilters}
          aria-controls="accessibility-filters"
          onClick={() => setShowAccessibilityFilters((prev) => !prev)}
        >
          Accessibility Filters {showAccessibilityFilters ? <img src = {chevronUp} alt = "▲" /> : <img src = {chevronDown} alt="▼"/>}
        </button>

        {showAccessibilityFilters && (
          <div id="accessibility-filters" className={styles.accessibilityFeats}>
            {[
              "Wheelchair Accessible",
              "Adjustable Desks",
              "Hearing Assistance",
              "Visual Assistance",
              "Elevator Access",
            ].map((feature) => (
              <label key={feature}>
                <input
                  type="checkbox"
                  value={feature}
                  checked={vals.accessibility.includes(feature)}
                  onChange={() => handleAccessibilityChange(feature)}
                />
                {feature}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <span className = {styles.submitSpan}>
        <button type="submit">Apply Filters</button>
        <button type="button" onClick={handleReset} aria-label="Reset all filters">
          Reset Filters
        </button>
      </span>

      <p aria-live="polite">{filteredRooms?.length || 0} rooms match your filters</p>
    </form>
  );
}
