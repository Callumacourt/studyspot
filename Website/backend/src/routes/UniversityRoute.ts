import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const universities = await prisma.university.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return res.status(200).json({ success: true, universities });
  } catch {
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

export default router;
