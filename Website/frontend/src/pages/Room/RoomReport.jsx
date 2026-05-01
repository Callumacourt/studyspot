import { useState } from "react";
import axios from "axios";
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
            await axios.post(
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
        <section className={styles.reportOverlay} role="dialog" aria-modal="true" aria-label="Report room issue">
            <form className={styles.reportCard} onSubmit={submit}>
                <h3>Report room issue</h3>
                <label>
                    Category
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="DATA_QUALITY">Data quality</option>
                        <option value="SAFETY">Safety</option>
                        <option value="ACCESSIBILITY">Accessibility</option>
                        <option value="OTHER">Other</option>
                    </select>
                </label>
                <label>
                    Description
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe what is wrong with this room or its data"
                        maxLength={1200}
                        rows={5}
                        required
                    />
                </label>
                <div className={styles.reportActions}>
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit" disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit report"}
                    </button>
                </div>
            </form>
        </section>
    );
}
