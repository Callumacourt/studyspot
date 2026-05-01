import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { AdminService } from "../services/AdminService";
import { AdminError } from "../services/admin/adminErrors";

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).auth!;
}

function handleError(error: unknown, res: Response) {
  if (error instanceof AdminError) {
    return res.status(error.status).json({ success: false, error: error.message });
  }

  console.error("[AdminController] unexpected error:", error);
  return res.status(500).json({ success: false, error: "Internal Server Error" });
}

async function run(
  res: Response,
  action: () => Promise<unknown>,
  responseKey: string,
  successStatus = 200
) {
  try {
    const payload = await action();
    return res.status(successStatus).json({ success: true, [responseKey]: payload });
  } catch (error) {
    return handleError(error, res);
  }
}

export const AdminController = {
  async getSummary(req: Request, res: Response) {
    return run(res, () => AdminService.getSummary(getAuth(req)), "summary");
  },

  async getUniversities(req: Request, res: Response) {
    return run(res, () => AdminService.getUniversities(getAuth(req)), "universities");
  },

  async createUniversity(req: Request, res: Response) {
    return run(res, () => AdminService.createUniversity(getAuth(req), req.body), "university", 201);
  },

  async updateUniversity(req: Request, res: Response) {
    const universityId = Number(req.params.id);
    return run(res, () => AdminService.updateUniversity(getAuth(req), universityId, req.body), "university");
  },

  async deleteUniversity(req: Request, res: Response) {
    const universityId = Number(req.params.id);
    return run(res, () => AdminService.deleteUniversity(getAuth(req), universityId), "result");
  },

  async getBuildings(req: Request, res: Response) {
    const universityId = req.query.universityId ? Number(req.query.universityId) : undefined;
    return run(res, () => AdminService.getBuildings(getAuth(req), universityId), "buildings");
  },

  async createBuilding(req: Request, res: Response) {
    return run(res, () => AdminService.createBuilding(getAuth(req), req.body), "building", 201);
  },

  async updateBuilding(req: Request, res: Response) {
    const buildingId = Number(req.params.id);
    return run(res, () => AdminService.updateBuilding(getAuth(req), buildingId, req.body), "building");
  },

  async deleteBuilding(req: Request, res: Response) {
    const buildingId = Number(req.params.id);
    return run(res, () => AdminService.deleteBuilding(getAuth(req), buildingId), "result");
  },

  async getRooms(req: Request, res: Response) {
    return run(
      res,
      () =>
        AdminService.getRooms(getAuth(req), {
        buildingId: req.query.buildingId ? Number(req.query.buildingId) : undefined,
        universityId: req.query.universityId ? Number(req.query.universityId) : undefined,
        }),
      "rooms"
    );
  },

  async createRoom(req: Request, res: Response) {
    return run(res, () => AdminService.createRoom(getAuth(req), req.body), "room", 201);
  },

  async updateRoom(req: Request, res: Response) {
    const roomId = Number(req.params.id);
    return run(res, () => AdminService.updateRoom(getAuth(req), roomId, req.body), "room");
  },

  async deleteRoom(req: Request, res: Response) {
    const roomId = Number(req.params.id);
    return run(res, () => AdminService.deleteRoom(getAuth(req), roomId), "result");
  },

  async getUsers(req: Request, res: Response) {
    return run(res, () => AdminService.getUsers(getAuth(req)), "users");
  },

  async updateUserRole(req: Request, res: Response) {
    const userId = Number(req.params.id);
    return run(res, () => AdminService.updateUserRole(getAuth(req), userId, req.body), "user");
  },
};
