import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { AdminService } from "../services/AdminService";

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).auth!;
}

function handleError(error: unknown, res: Response) {
  if (error instanceof AdminService.AdminError) {
    return res.status(error.status).json({ success: false, error: error.message });
  }

  console.error("[AdminController] unexpected error:", error);
  return res.status(500).json({ success: false, error: "Internal Server Error" });
}

export const AdminController = {
  async getSummary(req: Request, res: Response) {
    try {
      const summary = await AdminService.getSummary(getAuth(req));
      return res.status(200).json({ success: true, summary });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async getUniversities(req: Request, res: Response) {
    try {
      const universities = await AdminService.getUniversities(getAuth(req));
      return res.status(200).json({ success: true, universities });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async createUniversity(req: Request, res: Response) {
    try {
      const university = await AdminService.createUniversity(getAuth(req), req.body);
      return res.status(201).json({ success: true, university });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async updateUniversity(req: Request, res: Response) {
    try {
      const universityId = Number(req.params.id);
      const university = await AdminService.updateUniversity(getAuth(req), universityId, req.body);
      return res.status(200).json({ success: true, university });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async deleteUniversity(req: Request, res: Response) {
    try {
      const universityId = Number(req.params.id);
      const result = await AdminService.deleteUniversity(getAuth(req), universityId);
      return res.status(200).json({ success: true, result });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async getBuildings(req: Request, res: Response) {
    try {
      const universityId = req.query.universityId ? Number(req.query.universityId) : undefined;
      const buildings = await AdminService.getBuildings(getAuth(req), universityId);
      return res.status(200).json({ success: true, buildings });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async createBuilding(req: Request, res: Response) {
    try {
      const building = await AdminService.createBuilding(getAuth(req), req.body);
      return res.status(201).json({ success: true, building });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async updateBuilding(req: Request, res: Response) {
    try {
      const buildingId = Number(req.params.id);
      const building = await AdminService.updateBuilding(getAuth(req), buildingId, req.body);
      return res.status(200).json({ success: true, building });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async deleteBuilding(req: Request, res: Response) {
    try {
      const buildingId = Number(req.params.id);
      const result = await AdminService.deleteBuilding(getAuth(req), buildingId);
      return res.status(200).json({ success: true, result });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async getRooms(req: Request, res: Response) {
    try {
      const rooms = await AdminService.getRooms(getAuth(req), {
        buildingId: req.query.buildingId ? Number(req.query.buildingId) : undefined,
        universityId: req.query.universityId ? Number(req.query.universityId) : undefined,
      });
      return res.status(200).json({ success: true, rooms });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async createRoom(req: Request, res: Response) {
    try {
      const room = await AdminService.createRoom(getAuth(req), req.body);
      return res.status(201).json({ success: true, room });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async updateRoom(req: Request, res: Response) {
    try {
      const roomId = Number(req.params.id);
      const room = await AdminService.updateRoom(getAuth(req), roomId, req.body);
      return res.status(200).json({ success: true, room });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async deleteRoom(req: Request, res: Response) {
    try {
      const roomId = Number(req.params.id);
      const result = await AdminService.deleteRoom(getAuth(req), roomId);
      return res.status(200).json({ success: true, result });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async getUsers(req: Request, res: Response) {
    try {
      const users = await AdminService.getUsers(getAuth(req));
      return res.status(200).json({ success: true, users });
    } catch (error) {
      return handleError(error, res);
    }
  },

  async updateUserRole(req: Request, res: Response) {
    try {
      const userId = Number(req.params.id);
      const user = await AdminService.updateUserRole(getAuth(req), userId, req.body);
      return res.status(200).json({ success: true, user });
    } catch (error) {
      return handleError(error, res);
    }
  },
};
