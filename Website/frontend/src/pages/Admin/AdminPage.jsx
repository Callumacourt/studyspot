import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPage.module.css";
import { getAuthHeaders, getStoredUser } from "../../utils/auth";
import {
  buildBuildingPayload,
  buildRoomPayload,
  fetchAdminReports,
  fetchAdminDashboard,
  getApiErrorMessage,
  updateAdminReportStatus,
} from "./adminApi";
import api from "../../utils/api";

const emptyBuildingForm = { id: null, name: "", universityId: "" };
const emptyRoomForm = {
  id: null,
  name: "",
  buildingId: "",
  wheelchairAccessible: false,
  hasAdjustableDesks: false,
  groundFloor: false,
  hearingAssistance: false,
};

function includesQuery(query, ...values) {
  if (!query) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(query));
}

export default function AdminPage() {
  const user = getStoredUser();
  const authHeaders = useMemo(() => getAuthHeaders(), []);

  const [summary, setSummary] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [buildingForm, setBuildingForm] = useState(emptyBuildingForm);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [buildingSearch, setBuildingSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  async function loadDashboard(targetUniversityId = selectedUniversityId) {
    setLoading(true);
    setError("");

    try {
      const [dashboard, nextReports] = await Promise.all([
        fetchAdminDashboard(authHeaders, targetUniversityId),
        fetchAdminReports(authHeaders, targetUniversityId),
      ]);
      const {
        summary,
        universities: nextUniversities,
        buildings: nextBuildings,
        rooms: nextRooms,
      } = dashboard;
      const resolvedUniversityId =
        targetUniversityId ||
        user?.managedUniversityId ||
        nextUniversities[0]?.id ||
        "";

      setSummary(summary);
      setUniversities(nextUniversities);
      setBuildings(nextBuildings);
      setRooms(nextRooms);
      setReports(nextReports);
      setSelectedUniversityId(String(resolvedUniversityId || ""));

      setBuildingForm((prev) => ({
        ...prev,
        universityId: prev.universityId || String(resolvedUniversityId || ""),
      }));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load admin dashboard."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard(user?.managedUniversityId ? String(user.managedUniversityId) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedUniversityId) return;
    loadDashboard(selectedUniversityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUniversityId]);

  async function submitBuilding(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = buildBuildingPayload(buildingForm, selectedUniversityId);

      if (buildingForm.id) {
        await api.patch(`/api/admin/buildings/${buildingForm.id}`, payload, { headers: authHeaders });
        setMessage("Building updated.");
      } else {
        await api.post("/api/admin/buildings", payload, { headers: authHeaders });
        setMessage("Building created.");
      }

      setBuildingForm({ ...emptyBuildingForm, universityId: selectedUniversityId });
      await loadDashboard(selectedUniversityId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save building."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRoom(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = buildRoomPayload(roomForm);

      if (roomForm.id) {
        await api.patch(`/api/admin/rooms/${roomForm.id}`, payload, { headers: authHeaders });
        setMessage("Room updated.");
      } else {
        await api.post("/api/admin/rooms", payload, { headers: authHeaders });
        setMessage("Room created.");
      }

      setRoomForm(emptyRoomForm);
      await loadDashboard(selectedUniversityId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save room."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteBuilding(building) {
    const confirmed = window.confirm(
      `Delete ${building.name}? This will also remove ${building._count?.rooms ?? 0} room(s) inside it.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/buildings/${building.id}`, { headers: authHeaders });
      setMessage("Building deleted.");
      await loadDashboard(selectedUniversityId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete building."));
    }
  }

  async function handleDeleteRoom(room) {
    const confirmed = window.confirm(`Delete ${room.name}?`);
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/rooms/${room.id}`, { headers: authHeaders });
      setMessage("Room deleted.");
      await loadDashboard(selectedUniversityId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete room."));
    }
  }

  async function handleUpdateReportStatus(reportId, status) {
    try {
      await updateAdminReportStatus(authHeaders, reportId, status);
      setMessage("Report status updated.");
      await loadDashboard(selectedUniversityId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update report status."));
    }
  }

  function startEditBuilding(building) {
    setBuildingForm({
      id: building.id,
      name: building.name,
      universityId: String(building.university?.id ?? selectedUniversityId),
    });
  }

  function startEditRoom(room) {
    setRoomForm({
      id: room.id,
      name: room.name,
      buildingId: String(room.building?.id ?? ""),
      wheelchairAccessible: Boolean(room.wheelchairAccessible),
      hasAdjustableDesks: Boolean(room.hasAdjustableDesks),
      groundFloor: Boolean(room.groundFloor),
      hearingAssistance: Boolean(room.hearingAssistance),
    });
  }

  const filteredBuildings = selectedUniversityId
    ? buildings.filter((building) => String(building.university?.id ?? building.universityId) === String(selectedUniversityId))
    : buildings;

  const buildingQuery = buildingSearch.trim().toLowerCase();
  const roomQuery = roomSearch.trim().toLowerCase();

  const visibleBuildings = filteredBuildings.filter((building) =>
    includesQuery(buildingQuery, building.name, building.university?.name)
  );

  const visibleRooms = rooms.filter((room) =>
    includesQuery(roomQuery, room.name, room.building?.name)
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Admin workspace</p>
          <h1>University operations console</h1>
          <p className={styles.description}>
            Manage buildings, rooms, and accessibility data from one place. This is intended for campus staff
            responsible for keeping live study-space information accurate.
          </p>
        </div>
        {isSuperAdmin && (
          <label className={styles.selector}>
            <span>University scope</span>
            <select value={selectedUniversityId} onChange={(e) => setSelectedUniversityId(e.target.value)}>
              {universities.map((university) => (
                <option key={university.id} value={university.id}>
                  {university.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <section className={styles.kpis}>
        <article className={styles.kpiCard}>
          <span>Universities in scope</span>
          <strong>{summary?.counts?.universities ?? 0}</strong>
        </article>
        <article className={styles.kpiCard}>
          <span>Buildings</span>
          <strong>{summary?.counts?.buildings ?? 0}</strong>
        </article>
        <article className={styles.kpiCard}>
          <span>Rooms</span>
          <strong>{summary?.counts?.rooms ?? 0}</strong>
        </article>
        <article className={styles.kpiCard}>
          <span>Open reports</span>
          <strong>{summary?.counts?.openReports ?? 0}</strong>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>{buildingForm.id ? "Edit building" : "Add building"}</h2>
            <button type="button" onClick={() => setBuildingForm({ ...emptyBuildingForm, universityId: selectedUniversityId })}>
              Clear
            </button>
          </div>
          <form className={styles.form} onSubmit={submitBuilding}>
            {isSuperAdmin && (
              <label>
                <span>University</span>
                <select
                  value={buildingForm.universityId || selectedUniversityId}
                  onChange={(e) => setBuildingForm((prev) => ({ ...prev, universityId: e.target.value }))}
                  required
                >
                  <option value="">Select university</option>
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>Building name</span>
              <input
                type="text"
                value={buildingForm.name}
                onChange={(e) => setBuildingForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Queen's Buildings"
                required
              />
            </label>
            <button type="submit" disabled={submitting}>
              {buildingForm.id ? "Save building" : "Create building"}
            </button>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>{roomForm.id ? "Edit room" : "Add room"}</h2>
            <button type="button" onClick={() => setRoomForm(emptyRoomForm)}>
              Clear
            </button>
          </div>
          <form className={styles.form} onSubmit={submitRoom}>
            <label>
              <span>Building</span>
              <select
                value={roomForm.buildingId}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, buildingId: e.target.value }))}
                required
              >
                <option value="">Select building</option>
                {filteredBuildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Room name</span>
              <input
                type="text"
                value={roomForm.name}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Silent Study Room 2"
                required
              />
            </label>
            <div className={styles.checkboxGrid}>
              {[
                ["wheelchairAccessible", "Wheelchair accessible"],
                ["hasAdjustableDesks", "Adjustable desks"],
                ["groundFloor", "Ground floor"],
                ["hearingAssistance", "Hearing assistance"],
              ].map(([key, label]) => (
                <label key={key} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={Boolean(roomForm[key])}
                    onChange={(e) => setRoomForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <button type="submit" disabled={submitting}>
              {roomForm.id ? "Save room" : "Create room"}
            </button>
          </form>
        </article>
      </section>

      <section className={styles.tableSection}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Buildings</h2>
            <span>{visibleBuildings.length} shown</span>
          </div>
          <div className={styles.tableToolbar}>
            <input
              type="search"
              className={styles.searchInput}
              value={buildingSearch}
              onChange={(e) => setBuildingSearch(e.target.value)}
              placeholder="Search buildings"
              aria-label="Search buildings"
            />
          </div>
          {loading ? (
            <p>Loading buildings…</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>University</th>
                    <th>Rooms</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBuildings.map((building) => (
                    <tr key={building.id}>
                      <td>{building.name}</td>
                      <td>{building.university?.name ?? "—"}</td>
                      <td>{building._count?.rooms ?? 0}</td>
                      <td className={styles.actions}>
                        <button type="button" onClick={() => startEditBuilding(building)}>Edit</button>
                        <button type="button" className={styles.danger} onClick={() => handleDeleteBuilding(building)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Rooms</h2>
            <span>{visibleRooms.length} shown</span>
          </div>
          <div className={styles.tableToolbar}>
            <input
              type="search"
              className={styles.searchInput}
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              placeholder="Search rooms"
              aria-label="Search rooms"
            />
          </div>
          {loading ? (
            <p>Loading rooms…</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Building</th>
                    <th>Accessibility</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRooms.map((room) => (
                    <tr key={room.id}>
                      <td>{room.name}</td>
                      <td>{room.building?.name ?? "—"}</td>
                      <td>
                        {[
                          room.wheelchairAccessible && "Wheelchair",
                          room.hasAdjustableDesks && "Adjustable desks",
                          room.groundFloor && "Ground floor",
                          room.hearingAssistance && "Hearing assistance",
                        ]
                          .filter(Boolean)
                          .join(", ") || "Standard"}
                      </td>
                      <td className={styles.actions}>
                        <button type="button" onClick={() => startEditRoom(room)}>Edit</button>
                        <button type="button" className={styles.danger} onClick={() => handleDeleteRoom(room)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Room reports</h2>
            <span>{reports.length} total</span>
          </div>
          {loading ? (
            <p>Loading reports…</p>
          ) : reports.length === 0 ? (
            <p>No reports in this scope.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Category</th>
                    <th>Message</th>
                    <th>Reporter</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <strong>{report.room?.name ?? "Unknown room"}</strong>
                        <div>{report.room?.building?.name ?? ""}</div>
                      </td>
                      <td>{String(report.category || "OTHER").replaceAll("_", " ")}</td>
                      <td>{report.message}</td>
                      <td>{report.reporterUser?.email ?? "Unknown"}</td>
                      <td>{String(report.status || "OPEN").replaceAll("_", " ")}</td>
                      <td className={styles.actions}>
                        {[
                          ["OPEN", "Open"],
                          ["IN_REVIEW", "In review"],
                          ["RESOLVED", "Resolved"],
                          ["DISMISSED", "Dismiss"],
                        ].map(([value, label]) => (
                          <button
                            key={`${report.id}-${value}`}
                            type="button"
                            disabled={report.status === value}
                            onClick={() => handleUpdateReportStatus(report.id, value)}
                          >
                            {label}
                          </button>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
