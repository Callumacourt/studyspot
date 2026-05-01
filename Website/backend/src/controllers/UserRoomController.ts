import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { UserRoomService } from "../services/UserRoomService";

function getUserId(req: Request): number {
  return (req as AuthenticatedRequest).auth!.userId;
}

function parseRoomId(req: Request): number {
  const roomId = Number(req.params.id);
  if (!Number.isInteger(roomId) || roomId <= 0) {
    throw new Error("Invalid room id");
  }
  return roomId;
}

function toStatus(error: unknown): number {
  const message = String((error as Error)?.message ?? "").toLowerCase();
  if (message.includes("not found")) return 404;
  if (message.includes("required") || message.includes("invalid") || message.includes("fewer")) return 400;
  return 500;
}

function respondError(error: unknown, res: Response) {
  const status = toStatus(error);
  const fallback = status === 500 ? "Internal Server Error" : (error as Error).message;
  return res.status(status).json({ success: false, error: fallback });
}

export const UserRoomController = {
  async getFavouriteRooms(req: Request, res: Response) {
    try {
      const rooms = await UserRoomService.getFavouriteRooms(getUserId(req));
      return res.status(200).json({ success: true, rooms });
    } catch (error) {
      return respondError(error, res);
    }
  },

  async getFavouriteStatus(req: Request, res: Response) {
    try {
      const isFavourite = await UserRoomService.isRoomFavourited(getUserId(req), parseRoomId(req));
      return res.status(200).json({ success: true, isFavourite });
    } catch (error) {
      return respondError(error, res);
    }
  },

  async addFavourite(req: Request, res: Response) {
    try {
      const result = await UserRoomService.addFavouriteRoom(getUserId(req), parseRoomId(req));
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return respondError(error, res);
    }
  },

  async removeFavourite(req: Request, res: Response) {
    try {
      const result = await UserRoomService.removeFavouriteRoom(getUserId(req), parseRoomId(req));
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return respondError(error, res);
    }
  },

  async reportRoom(req: Request, res: Response) {
    try {
      const report = await UserRoomService.createRoomReport(getUserId(req), parseRoomId(req), req.body ?? {});
      return res.status(201).json({ success: true, report });
    } catch (error) {
      return respondError(error, res);
    }
  },
};
