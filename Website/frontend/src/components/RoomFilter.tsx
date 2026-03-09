import { useState } from "react";
import styles from "../styles/Components/RoomFilter.module.css"

// Define types for the props and state
type RangeFilterProps = {
    label: string;
    reading: keyof FiltersState; // Keys of the FiltersState object
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
    filteredRooms?: { id: string; name: string }[]; // example ofroom structure
};


// Helper function for handling range values in the filter
function RangeFilter({
    label,
    reading,
    vals,
    setVals,
    min,
    max,
    step,
    unit,
}: RangeFilterProps) {
    const handleRangeChange = (index: number, value: string) => {
        setVals((prevVals) => {
            const newReading = [...prevVals[reading]] as [number, number];
            newReading[index] = Number(value);

            // Ensure min is not greater than max
            if (index === 0 && newReading[0] > newReading[1]) {
                newReading[0] = newReading[1];
            }
            // Ensure max is not less than min
            if (index === 1 && newReading[1] < newReading[0]) {
                newReading[1] = newReading[0];
            }

            return { ...prevVals, [reading]: newReading };
        });
    };

    return (
        <div>
            <label id={`${reading}-label`}>{label}:</label>
            <div role="group" aria-labelledby={`${reading}-label`}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={vals[reading][0]}
                    onChange={(e) => handleRangeChange(0, e.target.value)}
                    aria-label={`Minimum ${label}`}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={vals[reading][1]}
                    onChange={(e) => handleRangeChange(1, e.target.value)}
                    aria-label={`Maximum ${label}`}
                />
                <p>
                    {vals[reading][0]}{unit} - {vals[reading][1]}{unit}
                </p>
            </div>
        </div>
    );
}


export default function RoomFilter({
    onFilterChange,
    filteredRooms = [],
}: RoomFilterProps) {
    const defaultFilters: FiltersState = {
        temp: [10, 40],
        humidity: [20, 90],
        noise: "Medium",
        occupancy: "Moderate",
        accessibility: [], // by default no accessibility filters applied
    };

    const [vals, setVals] = useState<FiltersState>(defaultFilters);

    const handleFilterChange = (updatedVals: FiltersState) => {
        setVals(updatedVals);
        onFilterChange(updatedVals); // Notify parent component of changes
    };

    const handleNoiseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleFilterChange({ ...vals, noise: e.target.value });
    };

    const handleOccupancyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleFilterChange({ ...vals, occupancy: e.target.value });
    };

    const handleAccessibilityChange = (feature: string) => {
        setVals((prevVals) => {
            const currentFeatures = prevVals.accessibility;
            const updatedFeatures = currentFeatures.includes(feature)
                ? currentFeatures.filter((f) => f !== feature) // Remove if already selected
                : [...currentFeatures, feature]; // Add if not selected

            return { ...prevVals, accessibility: updatedFeatures };
        });
    };

    return (
        <form className = {styles.filterForm}>
            <fieldset>
                <legend>Environment</legend>
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
                <label htmlFor="Noise">Noise Level:</label>
                <select
                    name="Noise"
                    id="Noise"
                    value={vals.noise}
                    onChange={handleNoiseChange}
                    aria-label="Select noise level"
                >
                    <option value="Quiet">Quiet</option>
                    <option value="Normal">Normal</option>
                    <option value="Loud">Loud</option>
                </select>
            </fieldset>
            <fieldset>
                <legend>Capacity</legend>
                <label htmlFor="Occupancy">Occupancy</label>
                <select
                    name="Occupancy"
                    id="Occupancy"
                    value={vals.occupancy}
                    onChange={handleOccupancyChange}
                    aria-label="Select occupancy level"
                >
                    <option value="Sparse">Sparse</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Busy">Busy</option>
                </select>
            </fieldset>
            <fieldset>
                <legend>Accessibility Features</legend>
                <label>
                    <input
                        type="checkbox"
                        value="Wheelchair Accessible"
                        checked={vals.accessibility.includes("Wheelchair Accessible")}
                        onChange={() => handleAccessibilityChange("Wheelchair Accessible")}
                    />
                    Wheelchair Accessible
                </label>
                <label>
                    <input
                        type="checkbox"
                        value="Hearing Assistance"
                        checked={vals.accessibility.includes("Hearing Assistance")}
                        onChange={() => handleAccessibilityChange("Hearing Assistance")}
                    />
                    Hearing Assistance
                </label>
                <label>
                    <input
                        type="checkbox"
                        value="Visual Assistance"
                        checked={vals.accessibility.includes("Visual Assistance")}
                        onChange={() => handleAccessibilityChange("Visual Assistance")}
                    />
                    Visual Assistance
                </label>
                <label>
                    <input
                        type="checkbox"
                        value="Elevator Access"
                        checked={vals.accessibility.includes("Elevator Access")}
                        onChange={() => handleAccessibilityChange("Elevator Access")}
                    />
                    Elevator Access
                </label>
            </fieldset>

            <button type="submit">Apply Filters</button>
            <button
                type="button"
                onClick={() => setVals(defaultFilters)}
                aria-label="Reset all filters"
            > Reset Filters
            </button>
            <p aria-live="polite">{filteredRooms?.length || 0} rooms match your filters</p>
        </form>
    );
}