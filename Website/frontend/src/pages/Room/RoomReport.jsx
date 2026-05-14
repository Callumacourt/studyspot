import { useState } from "react";
import { getAuthHeaders } from "../../utils/auth";
import styles from "./Room.module.css";

export default function RoomReport({ roomId, onClose, onMessage }) {
    const [category,   setCategory]   = useState("OTHER");
    const [message,    setMessage]    = useState("");
    const [submitting, setSubmitting] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!message.trim()) { onMessage("Please include a short report description."); return; }

        setSubmitting(true);
        try {
            await api.post(
                `/api/rooms/${roomId}/reports`,
                { category, message: message.trim() },
                { headers: getAuthHeaders() }
            );
            onClose();
            onMessage("Thanks — your report has been sent to admins.");
        } catch (err) {
            onMessage(err?.response?.data?.error || "Could not submit report.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section
            className={styles.reportOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            aria-describedby="report-dialog-desc"
        >
            <form className={styles.reportCard} onSubmit={submit}>
                <h3 id="report-dialog-title">Report room issue</h3>
                <p id="report-dialog-desc" className={styles.srOnly}>
                    Use this form to report a data quality, safety, or accessibility issue with this room.
                </p>

                {/* Category select — explicit id/htmlFor pairing for maximum AT compat */}
                <label htmlFor="report-category">Category</label>
                <select
                    id="report-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    // autoFocus gives keyboard/AT users immediate focus when dialog opens
                    autoFocus
                >
                    <option value="DATA_QUALITY">Data quality</option>
                    <option value="SAFETY">Safety</option>
                    <option value="ACCESSIBILITY">Accessibility</option>
                    <option value="OTHER">Other</option>
                </select>

                <label htmlFor="report-message">Description</label>
                <textarea
                    id="report-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe what is wrong with this room or its data"
                    maxLength={1200}
                    rows={5}
                    required
                    aria-required="true"
                />

                <div className={styles.reportActions}>
                    <button type="button" onClick={onClose} aria-label="Cancel report and close dialog">Cancel</button>
                    <button type="submit" disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit report"}
                    </button>
                </div>
            </form>
        </section>
    );
}
