/**
 * `useRoomData`
 *
 * Aggregates room-detail data requirements into a single reusable hook:
 * - room metadata,
 * - busy-times hourly averages,
 * - favourite status/actions,
 * - UI action messages.
 *
 * Why this hook exists:
 * - keeps `Room.jsx` focused on rendering and interaction,
 * - centralizes API calls and cancellation patterns,
 * - avoids duplicating auth/favourite logic across components.
 */
import { useState, useEffect } from "react";
import { getAuthHeaders } from "../../utils/auth";
import api from "../../utils/api";

export function useRoomData(roomId) {
    const isLoggedIn   = Boolean(localStorage.getItem("token"));
    const authHeaders  = getAuthHeaders();

    const [roomData,       setRoomData]       = useState(null);
    const [hourlyAverages, setHourlyAverages] = useState(Array(24).fill(0));
    const [isFavourite,    setIsFavourite]    = useState(false);
    const [favLoading,     setFavLoading]     = useState(false);
    const [actionMessage,  setActionMessage]  = useState("");

    // Room metadata fetch (name, building, booking/accessibility fields, etc.)
    useEffect(() => {
        let cancelled = false;
        api.get(`/api/rooms/${roomId}`)
            .then((res) => { if (!cancelled) setRoomData(res.data?.room ?? null); })
            .catch(console.error);
        return () => { cancelled = true; };
    }, [roomId]);

    // Favourite status is only queried for authenticated users.
    useEffect(() => {
        if (!isLoggedIn) { setIsFavourite(false); return; }
        let cancelled = false;
        api.get(`/api/rooms/${roomId}/favourite`, { headers: authHeaders })
            .then((res) => { if (!cancelled) setIsFavourite(Boolean(res.data?.isFavourite)); })
            .catch(() => { if (!cancelled) setIsFavourite(false); });
        return () => { cancelled = true; };
    }, [roomId, isLoggedIn]);

    // Hourly occupancy averages drive the BusyTimesChart; refresh every 60s.
    useEffect(() => {
        let cancelled = false;

        async function fetch() {
            try {
                const res    = await api.get(`/api/sensordata/${roomId}/occupancy-averages`);
                const values = Array.isArray(res.data?.data) ? res.data.data : [];
                if (!cancelled) setHourlyAverages(Array.from({ length: 24 }, (_, i) => Number(values[i] ?? 0)));
            } catch {
                if (!cancelled) setHourlyAverages(Array(24).fill(0));
            }
        }

        fetch();
        const id = setInterval(fetch, 60_000);
        return () => { cancelled = true; clearInterval(id); };
    }, [roomId]);

    // Toggle favourite state with optimistic-style local update + feedback toast.
    const toggleFavourite = async (navigate) => {
        if (!isLoggedIn) { navigate("/login"); return; }
        setFavLoading(true);
        setActionMessage("");
        try {
            if (isFavourite) {
                await api.delete(`/api/rooms/${roomId}/favourite`, { headers: authHeaders });
                setIsFavourite(false);
                setActionMessage("Removed from favourites.");
            } else {
                await api.post(`/api/rooms/${roomId}/favourite`, {}, { headers: authHeaders });
                setIsFavourite(true);
                setActionMessage("Added to favourites.");
            }
        } catch (err) {
            setActionMessage(err?.response?.data?.error || "Could not update favourites.");
        } finally {
            setFavLoading(false);
        }
    };

    // Defensive building-name resolver (supports multiple payload shapes).
    const getBuildingName = () => {
        const b = roomData?.building;
        if (!b) return roomData?.buildingName ?? (roomData?.buildingId ? `Building ${roomData.buildingId}` : "");
        if (typeof b === "string") return b;
        return b.name ?? b.displayName ?? "";
    };

    return {
        roomData,
        hourlyAverages,
        isFavourite,
        favLoading,
        actionMessage,
        setActionMessage,
        toggleFavourite,
        getBuildingName,
        isLoggedIn,
    };
}
