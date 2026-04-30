import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  leadActivitiesTable,
  leadsTable,
  usersTable,
} from "@workspace/db";
import {
  CreateLeadActivityBody,
  CreateLeadActivityParams,
  ListLeadActivitiesParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeActivity } from "../lib/serializers";

const router: IRouter = Router();

router.get(
  "/leads/:id/activities",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListLeadActivitiesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [lead] = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.id, params.data.id))
      .limit(1);
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    if (req.user?.role === "agent" && lead.assignedTo !== req.user.userId) {
      res.status(403).json({ error: "Not authorized for this lead" });
      return;
    }

    const rows = await db
      .select({ a: leadActivitiesTable, userName: usersTable.name })
      .from(leadActivitiesTable)
      .leftJoin(usersTable, eq(leadActivitiesTable.userId, usersTable.id))
      .where(eq(leadActivitiesTable.leadId, params.data.id))
      .orderBy(asc(leadActivitiesTable.createdAt));

    res.json(rows.map((r) => serializeActivity(r.a, r.userName)));
  },
);

router.post(
  "/leads/:id/activities",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateLeadActivityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateLeadActivityBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [lead] = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.id, params.data.id))
      .limit(1);
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    if (req.user?.role === "agent" && lead.assignedTo !== req.user.userId) {
      res.status(403).json({ error: "Not authorized for this lead" });
      return;
    }

    const [activity] = await db
      .insert(leadActivitiesTable)
      .values({
        leadId: params.data.id,
        userId: req.user?.userId ?? null,
        type: parsed.data.type,
        description: parsed.data.description,
      })
      .returning();
    if (!activity) {
      res.status(500).json({ error: "Failed to create activity" });
      return;
    }

    let userName: string | null = null;
    if (activity.userId) {
      const [u] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, activity.userId))
        .limit(1);
      userName = u?.name ?? null;
    }
    res.json(serializeActivity(activity, userName));
  },
);

export default router;
