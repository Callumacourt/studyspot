import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { getAuthHeaders } from "../../utils/auth";
import styles from "./RoomBooker.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type Booking = { id: number; startTime: string; endTime: string };

type Props = {
    roomId:                   string | number;
    openHour?:                string | null;
    closeHour?:               string | null;
    maxBookingDurationMinutes?: number | null;
    onSuccess?:               () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" for a local Date. */
function toLocalDate(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The next 7 days starting from today as { dateStr, label } */
function buildWeek(): { dateStr: string; label: string }[] {
    const days: { dateStr: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const dateStr = toLocalDate(d);
        const label = i === 0
            ? "Today"
            : i === 1
            ? "Tomorrow"
            : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
        days.push({ dateStr, label });
    }
    return days;
}

/** Slot hours between open and close (UTC hours from ISO strings). */
function buildSlots(openIso: string | null | undefined, closeIso: string | null | undefined): number[] {
    const open  = openIso  ? new Date(openIso).getUTCHours()  : 8;
    const close = closeIso ? new Date(closeIso).getUTCHours() : 22;
    return Array.from({ length: close - open }, (_, i) => open + i);
}

/** Hours already taken by confirmed/pending bookings on a given date. */
function buildTakenSet(bookings: Booking[], dateStr: string): Set<number> {
    const taken = new Set<number>();
    for (const b of bookings) {
        const start = new Date(b.startTime);
        const end   = new Date(b.endTime);
        if (toLocalDate(start) === dateStr || toLocalDate(end) === dateStr) {
            for (let h = start.getUTCHours(); h < end.getUTCHours(); h++) taken.add(h);
        }
    }
    return taken;
}

/** Format a UTC hour as "HH:00". */
function fmtHour(h: number) { return `${pad(h)}:00`; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoomBooker({ roomId, openHour, closeHour, maxBookingDurationMinutes, onSuccess }: Props) {
    const isLoggedIn = Boolean(localStorage.getItem("token"));
    const week       = useMemo(buildWeek, []);

    const [selectedDate,  setSelectedDate]  = useState(week[0].dateStr);
    const [bookings,      setBookings]      = useState<Booking[]>([]);
    const [loadingSlots,  setLoadingSlots]  = useState(false);
    const [selectedStart, setSelectedStart] = useState<number | null>(null);
    const [selectedEnd,   setSelectedEnd]   = useState<number | null>(null);
    const [submitting,    setSubmitting]    = useState(false);
    const [message,       setMessage]       = useState<{ text: string; ok: boolean } | null>(null);

    const allSlots = useMemo(() => buildSlots(openHour, closeHour), [openHour, closeHour]);
    const taken    = useMemo(() => buildTakenSet(bookings, selectedDate), [bookings, selectedDate]);
    const maxDur   = maxBookingDurationMinutes ? maxBookingDurationMinutes / 60 : null;

    // Current local hour — slots at or before this hour on today are in the past
    const currentHour = new Date().getHours(); // local time
    const isToday     = selectedDate === week[0].dateStr;

    /** Slots visible to the user: hide past hours on today */
    const visibleSlots = useMemo(
        () => isToday ? allSlots.filter((h) => h > currentHour) : allSlots,
        [allSlots, isToday, currentHour]
    );

    // Fetch bookings when date changes
    useEffect(() => {
        let cancelled = false;
        setLoadingSlots(true);
        setSelectedStart(null);
        setSelectedEnd(null);
        setMessage(null);

        axios.get(`/api/rooms/${roomId}/bookings?date=${selectedDate}`)
            .then((res) => { if (!cancelled) setBookings(res.data?.bookings ?? []); })
            .catch(() => { if (!cancelled) setBookings([]); })
            .finally(() => { if (!cancelled) setLoadingSlots(false); });

        return () => { cancelled = true; };
    }, [roomId, selectedDate]);

    // ── Slot selection ────────────────────────────────────────────────────────

    const isSelectable = (h: number) => !taken.has(h);

    const handleSlotClick = (h: number) => {
        if (!isSelectable(h)) return;
        setMessage(null);

        if (selectedStart === null) {
            setSelectedStart(h); setSelectedEnd(null); return;
        }
        if (h === selectedStart) {
            setSelectedStart(null); setSelectedEnd(null); return;
        }

        const start = Math.min(selectedStart, h);
        const end   = Math.max(selectedStart, h) + 1;

        for (let i = start; i < end; i++) {
            if (taken.has(i)) {
                setMessage({ text: "Selection spans a booked slot — choose a clear gap.", ok: false });
                setSelectedStart(null); setSelectedEnd(null); return;
            }
        }

        if (maxDur && end - start > maxDur) {
            setMessage({ text: `Max booking duration is ${maxBookingDurationMinutes} mins.`, ok: false });
            setSelectedStart(h); setSelectedEnd(null); return;
        }

        setSelectedStart(start);
        setSelectedEnd(end);
    };

    const slotClass = (h: number) => {
        if (taken.has(h)) return styles.slotTaken;
        if (selectedStart !== null && selectedEnd !== null && h >= selectedStart && h < selectedEnd) return styles.slotSelected;
        if (h === selectedStart) return styles.slotStart;
        return styles.slotFree;
    };

    // ── Submission ────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedStart === null || selectedEnd === null) {
            setMessage({ text: "Pick a start and end slot first.", ok: false }); return;
        }

        const startISO = new Date(`${selectedDate}T${fmtHour(selectedStart)}:00Z`).toISOString();
        const endISO   = new Date(`${selectedDate}T${fmtHour(selectedEnd)}:00Z`).toISOString();

        setSubmitting(true);
        setMessage(null);
        try {
            await axios.post(
                `/api/rooms/${roomId}/book`,
                { startTime: startISO, endTime: endISO },
                { headers: getAuthHeaders() }
            );
            setMessage({ text: `Booked ${fmtHour(selectedStart)} - ${fmtHour(selectedEnd)} on ${selectedDate} \u2713`, ok: true });
            setSelectedStart(null);
            setSelectedEnd(null);
            const res = await axios.get(`/api/rooms/${roomId}/bookings?date=${selectedDate}`);
            setBookings(res.data?.bookings ?? []);
            if (onSuccess) setTimeout(onSuccess, 1500);
        } catch (err: any) {
            setMessage({ text: err?.response?.data?.error || "Booking failed please try again.", ok: false });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const hasSelection = selectedStart !== null && selectedEnd !== null;

    return (
        <form className={styles.booker} onSubmit={handleSubmit} aria-label="Book this room">
            {/* Day strip */}
            <div className={styles.dayStrip} role="group" aria-label="Select date">
                {week.map(({ dateStr, label }) => (
                    <button
                        key={dateStr}
                        type="button"
                        className={`${styles.dayBtn} ${selectedDate === dateStr ? styles.dayBtnActive : ""}`}
                        onClick={() => setSelectedDate(dateStr)}
                        aria-pressed={selectedDate === dateStr}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <p className={styles.hint}>
                {isLoggedIn
                    ? "Click a slot to start, click another to set end."
                    : "Log in to book a slot."}
            </p>

            {loadingSlots ? (
                <p className={styles.loading}>Loading availability\u2026</p>
            ) : visibleSlots.length === 0 ? (
                <p className={styles.hint}>No more slots available today.</p>
            ) : (
                <div className={styles.slotGrid} role="group" aria-label="Available time slots">
                    {visibleSlots.map((h) => (
                        <button
                            key={h}
                            type="button"
                            className={`${styles.slot} ${slotClass(h)}`}
                            onClick={() => handleSlotClick(h)}
                            disabled={!isSelectable(h) || !isLoggedIn}
                            aria-pressed={selectedStart !== null && h >= selectedStart && (selectedEnd === null ? h === selectedStart : h < selectedEnd)}
                            aria-label={taken.has(h) ? `${fmtHour(h)} booked` : `${fmtHour(h)} available`}
                        >
                            {fmtHour(h)}
                        </button>
                    ))}
                </div>
            )}

            {/* Colour swatches are decorative — text labels carry the meaning */}
            <div className={styles.legend} aria-label="Slot colour legend">
                <span className={`${styles.dot} ${styles.dotFree}`}    aria-hidden="true" /> Available
                <span className={`${styles.dot} ${styles.dotSelected}`} aria-hidden="true" /> Selected
                <span className={`${styles.dot} ${styles.dotTaken}`}   aria-hidden="true" /> Booked
            </div>

            {hasSelection && (
                <p className={styles.summary}>
                    {fmtHour(selectedStart!)} - {fmtHour(selectedEnd!)} &nbsp;
                    ({selectedEnd! - selectedStart!}h)
                </p>
            )}

            {message && (
                <p className={message.ok ? styles.msgOk : styles.msgErr}>{message.text}</p>
            )}

            {isLoggedIn && (
                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={!hasSelection || submitting}
                >
                    {submitting ? "Booking\u2026" : "Confirm booking"}
                </button>
            )}
        </form>
    );
}
