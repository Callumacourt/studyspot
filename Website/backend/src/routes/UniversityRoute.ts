import { Router } from "express";
import { prisma } from "../prisma";

/**
 * Router: /universities
 * GET /
 * - Returns a simple list of universities for frontend dropdowns/search.
 * - Responds with { success: true, universities: [{ id, name }, ...] } ordered by name.
 * - On unexpected errors returns 500.
 */
const router = Router();

router.get("/", async (_req, res) => {
  try {
    const universities = await prisma.university.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }, // return only fields needed by clients
    });
    return res.status(200).json({ success: true, universities });
  } catch {
    // Generic server error for unexpected failures
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

export default router;
