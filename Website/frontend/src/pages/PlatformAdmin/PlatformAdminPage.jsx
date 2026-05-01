import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "./PlatformAdminPage.module.css";
import { getAuthHeaders } from "../../utils/auth";
import {
  buildUserRolePayload,
  fetchPlatformAdminData,
  getApiErrorMessage,
} from "../Admin/adminApi";

const emptyUniversityForm = { id: null, name: "" };

export default function PlatformAdminPage() {
  const authHeaders = useMemo(() => getAuthHeaders(), []);

  const [summary, setSummary] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [users, setUsers] = useState([]);
  const [userDrafts, setUserDrafts] = useState({});
  const [universityForm, setUniversityForm] = useState(emptyUniversityForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const { summary, universities: nextUniversities, users: nextUsers } =
        await fetchPlatformAdminData(authHeaders);

      setSummary(summary);
      setUniversities(nextUniversities);
      setUsers(nextUsers);
      setUserDrafts(
        Object.fromEntries(
          nextUsers.map((user) => [
            user.userId,
            {
              role: user.role,
              managedUniversityId: user.managedUniversityId ? String(user.managedUniversityId) : "",
            },
          ])
        )
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load platform admin data."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitUniversity(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (universityForm.id) {
        await axios.patch(`/api/admin/universities/${universityForm.id}`, { name: universityForm.name }, { headers: authHeaders });
        setMessage("University updated.");
      } else {
        await axios.post("/api/admin/universities", { name: universityForm.name }, { headers: authHeaders });
        setMessage("University created.");
      }
      setUniversityForm(emptyUniversityForm);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save university."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUniversity(university) {
    const buildingCount = university.buildings?.length ?? 0;
    const roomCount = (university.buildings ?? []).reduce(
      (sum, building) => sum + (building._count?.rooms ?? 0),
      0
    );

    const confirmed = window.confirm(
      `Delete ${university.name}? This will remove ${buildingCount} building(s) and ${roomCount} room(s).`
    );
    if (!confirmed) return;

    try {
      await axios.delete(`/api/admin/universities/${university.id}`, { headers: authHeaders });
      setMessage("University deleted.");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete university."));
    }
  }

  async function saveUserRole(userId) {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const draft = userDrafts[userId];
      await axios.patch(
        `/api/admin/users/${userId}/role`,
        buildUserRolePayload(draft),
        { headers: authHeaders }
      );
      setMessage("User permissions updated.");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update user permissions."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Platform administration</p>
        <h1>System-wide control centre</h1>
        <p>
          Use this view to scale beyond a single campus: add universities, remove old datasets, and assign staff
          members to the institutions they manage.
        </p>
      </section>

      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <section className={styles.kpis}>
        <article className={styles.kpiCard}>
          <span>Universities</span>
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
          <span>Users</span>
          <strong>{summary?.counts?.users ?? 0}</strong>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>{universityForm.id ? "Edit university" : "Add university"}</h2>
            <button type="button" onClick={() => setUniversityForm(emptyUniversityForm)}>
              Clear
            </button>
          </div>
          <form className={styles.form} onSubmit={submitUniversity}>
            <label>
              <span>University name</span>
              <input
                type="text"
                value={universityForm.name}
                onChange={(e) => setUniversityForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. University of Bristol"
                required
              />
            </label>
            <button type="submit" disabled={submitting}>
              {universityForm.id ? "Save university" : "Create university"}
            </button>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Scalability rationale</h2>
          </div>
          <ul className={styles.bulletList}>
            <li>Universities, buildings, and rooms are managed independently so the platform can grow campus by campus.</li>
            <li>University admins are restricted to one institution, while super admins keep cross-campus control.</li>
            <li>Deletion flows show impact clearly, making data cleanup safer during demos and real deployment.</li>
          </ul>
        </article>
      </section>

      <section className={styles.tableSection}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Universities</h2>
            <span>{universities.length} total</span>
          </div>
          {loading ? (
            <p>Loading universities…</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Buildings</th>
                    <th>Rooms</th>
                    <th>Admins</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {universities.map((university) => (
                    <tr key={university.id}>
                      <td>{university.name}</td>
                      <td>{university.buildings?.length ?? 0}</td>
                      <td>
                        {(university.buildings ?? []).reduce(
                          (sum, building) => sum + (building._count?.rooms ?? 0),
                          0
                        )}
                      </td>
                      <td>{university.administrators?.map((admin) => admin.email).join(", ") || "—"}</td>
                      <td className={styles.actions}>
                        <button type="button" onClick={() => setUniversityForm({ id: university.id, name: university.name })}>
                          Edit
                        </button>
                        <button type="button" className={styles.danger} onClick={() => handleDeleteUniversity(university)}>
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
            <h2>User access management</h2>
            <span>{users.length} users</span>
          </div>
          {loading ? (
            <p>Loading users…</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Managed university</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const draft = userDrafts[user.userId] ?? { role: user.role, managedUniversityId: "" };
                    return (
                      <tr key={user.userId}>
                        <td>{user.email}</td>
                        <td>
                          <select
                            value={draft.role}
                            onChange={(e) =>
                              setUserDrafts((prev) => ({
                                ...prev,
                                [user.userId]: {
                                  ...draft,
                                  role: e.target.value,
                                  managedUniversityId: e.target.value === "UNIVERSITY_ADMIN" ? draft.managedUniversityId : "",
                                },
                              }))
                            }
                          >
                            <option value="USER">User</option>
                            <option value="UNIVERSITY_ADMIN">University admin</option>
                            <option value="SUPER_ADMIN">Super admin</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={draft.managedUniversityId}
                            disabled={draft.role !== "UNIVERSITY_ADMIN"}
                            onChange={(e) =>
                              setUserDrafts((prev) => ({
                                ...prev,
                                [user.userId]: { ...draft, managedUniversityId: e.target.value },
                              }))
                            }
                          >
                            <option value="">Not assigned</option>
                            {universities.map((university) => (
                              <option key={university.id} value={university.id}>
                                {university.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={styles.actions}>
                          <button type="button" onClick={() => saveUserRole(user.userId)} disabled={submitting}>
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
