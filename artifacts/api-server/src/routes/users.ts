import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { serializeUser } from "../lib/serializers";

const router: IRouter = Router();

router.get("/users", requireAuth, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.name);
  res.json(users.map(serializeUser));
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  if (req.user?.userId === id) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (existing.role === "admin") {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));

    if ((result?.count ?? 0) <= 1) {
      res.status(400).json({ error: "At least one admin account must remain" });
      return;
    }
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ success: true });
});

export default router;
