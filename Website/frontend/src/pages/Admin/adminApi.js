import api from "../../utils/axios";

export async function fetchAdminDashboard(headers, universityId) {
  const scopedParams = universityId ? { universityId } : undefined;

  const [summaryRes, universityRes, buildingRes, roomRes] = await Promise.all([
    api.get("/api/admin/summary", { headers }),
    api.get("/api/admin/universities", { headers }),
    api.get("/api/admin/buildings", { headers, params: scopedParams }),
    api.get("/api/admin/rooms", { headers, params: scopedParams }),
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
    api.get("/api/admin/summary", { headers }),
    api.get("/api/admin/universities", { headers }),
    api.get("/api/admin/users", { headers }),
  ]);

  return {
    summary: summaryRes.data?.summary ?? null,
    universities: universityRes.data?.universities ?? [],
    users: userRes.data?.users ?? [],
  };
}

export async function fetchAdminReports(headers, universityId) {
  const params = universityId ? { universityId } : undefined;
  const response = await api.get("/api/admin/reports", { headers, params });
  return response.data?.reports ?? [];
}

export async function updateAdminReportStatus(headers, reportId, status) {
  const response = await api.patch(
    `/api/admin/reports/${reportId}/status`,
    { status },
    { headers }
  );
  return response.data?.report ?? null;
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
