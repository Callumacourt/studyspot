import { useState } from "react";
import styles from "./RoomFilter.module.css";

type RangeFilterProps = {
    label: string;
    reading: keyof FiltersState;
    vals: FiltersState;
    setVals: React.Dispatch<React.SetStateAction<FiltersState>>;
    min: number;
    max: number;
    step: number;
    unit: string;
};

type FiltersState = {
    temp: [number, number];
    humidity: [number, number];
    noise: string;
    occupancy: string;
    accessibility: string[];
};

type RoomFilterProps = {
    onFilterChange: (filters: FiltersState) => void;
    onReset: () => void;
    filteredRooms?: { id: string; name: string }[];
};

export default function RoomFilter({ onFilterChange, onReset, filteredRooms = [] }: RoomFilterProps) {
  const defaultFilters: FiltersState = {
    temp: [10, 40],
    humidity: [10, 100],
    noise: "",
    occupancy: "",
    accessibility: [],
  };

  const [vals, setVals] = useState<FiltersState>(defaultFilters);

  const handleNoiseChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setVals((prev) => ({ ...prev, noise: e.target.value }));

  const handleOccupancyChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setVals((prev) => ({ ...prev, occupancy: e.target.value }));

  const handleAccessibilityChange = (feature: string) => {
    setVals((prevVals) => {
      const updated = prevVals.accessibility.includes(feature)
        ? prevVals.accessibility.filter((f) => f !== feature)
        : [...prevVals.accessibility, feature];
      return { ...prevVals, accessibility: updated };
    });
  };

  const handleReset = () => {
    setVals(defaultFilters);
    onReset();
  };

  return (
    <form
      className={styles.filterForm}
      onSubmit={(e) => {
        e.preventDefault();
        onFilterChange(vals);
      }}
    >
      {/* Environment filters */}
      <fieldset>
        <legend>Environment</legend>
        <RangeFilter label="Temperature" reading="temp" vals={vals} setVals={setVals} min={10} max={40} step={1} unit="°C" />
        <RangeFilter label="Humidity" reading="humidity" vals={vals} setVals={setVals} min={10} max={100} step={1} unit="%" />
        <label htmlFor="Noise">Noise Level:</label>
        <select name="Noise" id="Noise" value={vals.noise} onChange={handleNoiseChange} aria-label="Select noise level">
          <option value="">Any</option>
          <option value="Quiet">Quiet</option>
          <option value="Normal">Normal</option>
          <option value="Loud">Loud</option>
        </select>
      </fieldset>

      {/* Capacity filter */}
      <fieldset>
        <legend>Capacity</legend>
        <label htmlFor="Occupancy">Occupancy</label>
        <select name="Occupancy" id="Occupancy" value={vals.occupancy} onChange={handleOccupancyChange} aria-label="Select occupancy level">
          <option value="">Any</option>
          <option value="Sparse">Sparse</option>
          <option value="Moderate">Moderate</option>
          <option value="Busy">Busy</option>
        </select>
      </fieldset>

      {/* Accessibility feature checkboxes */}
      <fieldset>
        <legend>Accessibility Features</legend>
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
      </fieldset>

      <button type="submit">Apply Filters</button>
      <button type="button" onClick={handleReset} aria-label="Reset all filters">
        Reset Filters
      </button>

      <p aria-live="polite">{filteredRooms?.length || 0} rooms match your filters</p>
    </form>
  );
}

// Reusable range slider for numeric filter values
function RangeFilter({ label, reading, vals, setVals, min, max, step, unit }: RangeFilterProps) {
    const handleRangeChange = (index: number, value: string) => {
        setVals((prevVals) => {
            const newReading = [...prevVals[reading]] as [number, number];
            newReading[index] = Number(value);

            // Clamp min/max to prevent crossing over each other
            if (index === 0 && newReading[0] > newReading[1]) newReading[0] = newReading[1];
            if (index === 1 && newReading[1] < newReading[0]) newReading[1] = newReading[0];

            return { ...prevVals, [reading]: newReading };
        });
    };

    return (
        <div>
            <label id={`${reading}-label`}>{label}:</label>
            <div role="group" aria-labelledby={`${reading}-label`}>
                <input type="range" min={min} max={max} step={step} value={vals[reading][0]}
                    onChange={(e) => handleRangeChange(0, e.target.value)} aria-label={`Minimum ${label}`} />
                <input type="range" min={min} max={max} step={step} value={vals[reading][1]}
                    onChange={(e) => handleRangeChange(1, e.target.value)} aria-label={`Maximum ${label}`} />
                <p>{vals[reading][0]}{unit} - {vals[reading][1]}{unit}</p>
            </div>
        </div>
    );
}
