import { prisma } from "../prisma";
import { mapRoomWithMetrics } from "./roomMappers";

type ReportCategoryValue = "DATA_QUALITY" | "SAFETY" | "ACCESSIBILITY" | "OTHER";

function normaliseCategory(value: unknown): ReportCategoryValue {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "DATA_QUALITY") return "DATA_QUALITY";
  if (raw === "SAFETY") return "SAFETY";
  if (raw === "ACCESSIBILITY") return "ACCESSIBILITY";
  return "OTHER";
}

function ensureMessage(message: unknown): string {
  const cleaned = String(message ?? "").trim();
  if (!cleaned) throw new Error("Report message is required");
  if (cleaned.length > 1200) throw new Error("Report message must be 1200 characters or fewer");
  return cleaned;
}

async function ensureRoomExists(roomId: number) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
  if (!room) throw new Error("Room not found");
}

export const UserRoomService = {
  async getFavouriteRooms(userId: number) {
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        favouritedRooms: {
          include: {
            building: true,
            readings: { orderBy: { time: "desc" }, take: 200 },
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!user) throw new Error("User not found");
    return user.favouritedRooms.map((room) => mapRoomWithMetrics(room));
  },

  async isRoomFavourited(userId: number, roomId: number) {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { favouritedRooms: { where: { id: roomId }, select: { id: true } } },
    });

    if (!user) throw new Error("User not found");
    return user.favouritedRooms.length > 0;
  },

  async addFavouriteRoom(userId: number, roomId: number) {
    await ensureRoomExists(roomId);

    await prisma.user.update({
      where: { userId },
      data: { favouritedRooms: { connect: { id: roomId } } },
    });

    return { roomId, isFavourite: true };
  },

  async removeFavouriteRoom(userId: number, roomId: number) {
    await ensureRoomExists(roomId);

    await prisma.user.update({
      where: { userId },
      data: { favouritedRooms: { disconnect: { id: roomId } } },
    });

    return { roomId, isFavourite: false };
  },

  async createRoomReport(userId: number, roomId: number, payload: { category?: unknown; message?: unknown }) {
    await ensureRoomExists(roomId);

    const roomReport = (prisma as any).roomReport;

    const report = await roomReport.create({
      data: {
        roomId,
        reporterUserId: userId,
        category: normaliseCategory(payload.category),
        message: ensureMessage(payload.message),
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            building: { select: { id: true, name: true } },
          },
        },
      },
    });

    return report;
  },

  async getMyBookings(userId: number) {
    return prisma.roomBooking.findMany({
      where: { bookedByUserId: userId },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            building: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });
  },

  async cancelBooking(bookingId: number, userId: number) {
    const booking = await prisma.roomBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Booking not found");
    if (booking.bookedByUserId !== userId) throw new Error("Not authorised to cancel this booking");
    if (booking.status === "CANCELLED") throw new Error("Booking is already cancelled");

    return prisma.roomBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
  },
};
