import React, {useState, useRef, KeyboardEvent} from "react";
import styles from "./RoomSearcher.module.css";

type Props = {
    onSearch: (query : string) => void;
}

// Debounced input used to search rooms by name.
export default function RoomSearcher ({onSearch} : Props) {
    const [query, setQuery] = useState("");
    const timer = useRef <number | null>(null)

    function triggerSearch(value: string) {
        onSearch(value);
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setQuery(value);
        // Debounce typing so we don't trigger a fetch on every keystroke.
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => triggerSearch(value), 400);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            if (timer.current) window.clearTimeout(timer.current);
            triggerSearch(query);
        }
        if (e.key === "Escape") {
            // Escape clears query and returns to unfiltered list.
            setQuery("");
            triggerSearch("");
        };
    };

    return (
        <input className = {styles.roomSearcher}
            type="search"
            placeholder="Search room name"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            aria-label="Search rooms by name"
        />
    )
}