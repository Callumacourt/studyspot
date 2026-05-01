import axios from "axios";

export async function fetchAdminDashboard(headers, universityId) {
  const scopedParams = universityId ? { universityId } : undefined;

  const [summaryRes, universityRes, buildingRes, roomRes] = await Promise.all([
    axios.get("/api/admin/summary", { headers }),
    axios.get("/api/admin/universities", { headers }),
    axios.get("/api/admin/buildings", { headers, params: scopedParams }),
    axios.get("/api/admin/rooms", { headers, params: scopedParams }),
  ]);

  return {
    summary: summaryRes.data?.summary ?? null,
    universities: universityRes.data?.universities ?? [],
    buildings: buildingRes.data?.buildings ?? [],
    rooms: roomRes.data?.rooms ?? [],
  };
}

export async function fetchPlatformAdminData(headers) {
  const [summaryRes, universityRes, userRes] = await Promise.all([
    axios.get("/api/admin/summary", { headers }),
    axios.get("/api/admin/universities", { headers }),
    axios.get("/api/admin/users", { headers }),
  ]);

  return {
    summary: summaryRes.data?.summary ?? null,
    universities: universityRes.data?.universities ?? [],
    users: userRes.data?.users ?? [],
  };
}

export function getApiErrorMessage(error, fallback) {
  return error?.response?.data?.error || fallback;
}

export function buildBuildingPayload(form, selectedUniversityId) {
  return {
    name: form.name,
    universityId: Number(form.universityId || selectedUniversityId),
  };
}

export function buildRoomPayload(form) {
  return {
    name: form.name,
    buildingId: Number(form.buildingId),
    wheelchairAccessible: Boolean(form.wheelchairAccessible),
    hasAdjustableDesks: Boolean(form.hasAdjustableDesks),
    groundFloor: Boolean(form.groundFloor),
    hearingAssistance: Boolean(form.hearingAssistance),
  };
}

export function buildUserRolePayload(draft) {
  return {
    role: draft.role,
    managedUniversityId:
      draft.role === "UNIVERSITY_ADMIN" ? Number(draft.managedUniversityId) : null,
  };
}
