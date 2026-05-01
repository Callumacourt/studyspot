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

/** Format "YYYY-MM-DD" for a local Date (avoids UTC shift from toISOString). */
function toLocalDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today as YYYY-MM-DD local. */
const TODAY = toLocalDate(new Date());

/**
 * Build a list of full-hour slot labels (e.g. "09:00") between open and close.
 * openHour / closeHour are ISO strings stored in DB — we only care about the
 * UTC hour component (seeds set them to 08:00Z / 22:00Z).
 */
function buildSlots(openIso: string | null | undefined, closeIso: string | null | undefined): number[] {
    const open  = openIso  ? new Date(openIso).getUTCHours()  : 8;
    const close = closeIso ? new Date(closeIso).getUTCHours() : 22;
    return Array.from({ length: close - open }, (_, i) => open + i);
}

/** Given existing bookings, mark which hours are taken for a given date. */
function buildTakenSet(bookings: Booking[], dateStr: string): Set<number> {
    const taken = new Set<number>();
    const prefix = dateStr; // "YYYY-MM-DD"
    for (const b of bookings) {
        const start = new Date(b.startTime);
        const end   = new Date(b.endTime);
        // mark every full hour that is covered by this booking
        for (let h = start.getUTCHours(); h < end.getUTCHours(); h++) {
            if (toLocalDate(start) === prefix || toLocalDate(end) === prefix) taken.add(h);
        }
    }
    return taken;
}

/** Format a UTC hour (0–23) as "HH:00". */
function fmtHour(h: number) { return `${String(h).padStart(2, "0")}:00`; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoomBooker({ roomId, openHour, closeHour, maxBookingDurationMinutes, onSuccess }: Props) {
    const isLoggedIn = Boolean(localStorage.getItem("token"));

    const [selectedDate,  setSelectedDate]  = useState(TODAY);
    const [bookings,      setBookings]      = useState<Booking[]>([]);
    const [loadingSlots,  setLoadingSlots]  = useState(false);
    const [selectedStart, setSelectedStart] = useState<number | null>(null);
    const [selectedEnd,   setSelectedEnd]   = useState<number | null>(null);
    const [submitting,    setSubmitting]    = useState(false);
    const [message,       setMessage]       = useState<{ text: string; ok: boolean } | null>(null);

    const slots  = useMemo(() => buildSlots(openHour, closeHour), [openHour, closeHour]);
    const taken  = useMemo(() => buildTakenSet(bookings, selectedDate), [bookings, selectedDate]);
    const maxDur = maxBookingDurationMinutes ? maxBookingDurationMinutes / 60 : null;

    // Fetch existing bookings whenever the date changes
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

    // ── Slot selection logic ──────────────────────────────────────────────────

    /** Whether a given hour slot can be part of a selection. */
    const isSelectable = (h: number) => !taken.has(h) && selectedDate >= TODAY;

    /**
     * Clicking a slot:
     * - No selection → set as start
     * - Start set, clicking same → deselect
     * - Start set, clicking after → set end (validate range, duration)
     * - Otherwise → restart from clicked slot
     */
    const handleSlotClick = (h: number) => {
        if (!isSelectable(h)) return;
        setMessage(null);

        if (selectedStart === null) {
            setSelectedStart(h);
            setSelectedEnd(null);
            return;
        }

        if (h === selectedStart) {
            setSelectedStart(null);
            setSelectedEnd(null);
            return;
        }

        // Always make lower = start, higher = end
        const start = Math.min(selectedStart, h);
        const end   = Math.max(selectedStart, h) + 1; // end is exclusive hour

        // Check no taken slots in range
        for (let i = start; i < end; i++) {
            if (taken.has(i)) {
                setMessage({ text: "Selection includes a booked slot — please choose a gap.", ok: false });
                setSelectedStart(null);
                setSelectedEnd(null);
                return;
            }
        }

        // Enforce max duration
        if (maxDur && end - start > maxDur) {
            setMessage({ text: `Max booking duration is ${maxBookingDurationMinutes} mins.`, ok: false });
            setSelectedStart(h);
            setSelectedEnd(null);
            return;
        }

        setSelectedStart(start);
        setSelectedEnd(end);
    };

    /** Slot visual state */
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
            setMessage({ text: "Pick a start and end slot first.", ok: false });
            return;
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
            setMessage({ text: `Booked ${fmtHour(selectedStart)}–${fmtHour(selectedEnd)} on ${selectedDate} ✓`, ok: true });
            setSelectedStart(null);
            setSelectedEnd(null);
            // refresh slots
            const res = await axios.get(`/api/rooms/${roomId}/bookings?date=${selectedDate}`);
            setBookings(res.data?.bookings ?? []);            if (onSuccess) setTimeout(onSuccess, 1500);        } catch (err: any) {
            setMessage({ text: err?.response?.data?.error || "Booking failed — please try again.", ok: false });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const hasSelection = selectedStart !== null && selectedEnd !== null;

    return (
        <form className={styles.booker} onSubmit={handleSubmit} aria-label="Book this room">
            <div className={styles.row}>
                <label className={styles.label} htmlFor="booking-date">Date</label>
                <input
                    id="booking-date"
                    type="date"
                    className={styles.dateInput}
                    value={selectedDate}
                    min={TODAY}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </div>

            <p className={styles.hint}>
                {isLoggedIn
                    ? "Click a slot to start, click another to set end."
                    : "Log in to book a slot."}
            </p>

            {loadingSlots ? (
                <p className={styles.loading}>Loading availability…</p>
            ) : (
                <div className={styles.slotGrid} role="group" aria-label="Available time slots">
                    {slots.map((h) => (
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

            {/* Summary + legend */}
            <div className={styles.legend}>
                <span className={`${styles.dot} ${styles.dotFree}`}    /> Available
                <span className={`${styles.dot} ${styles.dotSelected}`} /> Selected
                <span className={`${styles.dot} ${styles.dotTaken}`}   /> Booked
            </div>

            {hasSelection && (
                <p className={styles.summary}>
                    {fmtHour(selectedStart!)} – {fmtHour(selectedEnd!)} &nbsp;
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
                    {submitting ? "Booking…" : "Confirm booking"}
                </button>
            )}
        </form>
    );
}
