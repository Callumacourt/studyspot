import { useState } from "react";
import styles from "./Home.module.css";
import searchIcon from "../../assets/icons/search.svg";
import { useNavigate } from "react-router-dom";

// Landing page with university autocomplete and recent searches.

export default function Home () {
    const navigate = useNavigate();
    const universities = [
        "Cardiff University",
        "Cardiff Metropolitan University",
        "Cambridge University",
        "Bristol University",
        "Swansea University",
        "University of Manchester",
    ];
    const recentSearches = ["Cardiff University", "Bristol University"];

    const [searchTerm, setSearchTerm] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    const filteredUniversities = (() => {
        const trimmed = searchTerm.trim().toLowerCase();

        if (!trimmed) return [];

        return universities.filter((uni) =>
            uni.toLowerCase().includes(trimmed)
        );
    })();

    const handleChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setShowSuggestions(value.trim() !== "");
    };

    const handleSelectUniversity = (university) => {
        setSearchTerm(university);
        setShowSuggestions(false);
        // Prototype route currently enabled for Cardiff.
        if (university === "Cardiff University") {
            navigate("/search");
        }
    };

    const handleSearch = () => {
        if (searchTerm.trim() === "Cardiff University") {
            navigate("/home");
        }
    };

    const handleFocus = () => {
        if (searchTerm.trim() !== "") {
            setShowSuggestions(true);
        }
    };

    const handleBlur = () => {
        // Delay close slightly so suggestion clicks still register.
        setTimeout(() => {
            setShowSuggestions(false);
        }, 150);
    };

    return (
        <main className={styles.searchPage}>
            <section className={styles.searchSection}>
                <h1 className={styles.title}>Where are you studying?</h1>

                <div className={styles.searchWrapper}>
                    <div className={`${styles.searchBar}${showSuggestions && filteredUniversities.length > 0 ? ` ${styles.searchBarOpen}` : ""}`}>
                        <input
                            type="text"
                            placeholder="Search university..."
                            value={searchTerm}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            className={styles.searchInput}
                            aria-label="Search university"
                        />

                        <button
                            type="button"
                            className={styles.searchButton}
                            aria-label="Search"
                            onClick={handleSearch}
                        >
                            <img src={searchIcon} alt="" aria-hidden="true" />
                        </button>
                    </div>

                    {showSuggestions && filteredUniversities.length > 0 && (
                        <div className={styles.suggestionBox}>
                            {filteredUniversities.map((university) => (
                                <button
                                    key={university}
                                    type="button"
                                    className={styles.suggestionItem}
                                    onMouseDown={() =>
                                        handleSelectUniversity(university)
                                    }
                                >
                                    {university}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.recentSearches}>
                    <span className={styles.recentLabel}>Recent Searches:</span>

                    <div className={styles.recentTags}>
                        {recentSearches.map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={styles.recentTag}
                                onClick={() => handleSelectUniversity(item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}

