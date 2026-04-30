import { Router, type IRouter } from "express";
import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import {
  db,
  leadsTable,
  usersTable,
  leadActivitiesTable,
} from "@workspace/db";
import {
  CreateLeadBody,
  GetLeadParams,
  UpdateLeadBody,
  UpdateLeadParams,
  DeleteLeadParams,
  ListLeadsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeLead } from "../lib/serializers";

const router: IRouter = Router();

function parseDate(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (value === undefined || value === "") return undefined;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d;
  }
  return undefined;
}

router.get("/leads/pending-followups", requireAuth, async (req, res): Promise<void> => {
  const now = new Date();
  const isAgent = req.user?.role === "agent";
  const conditions = [
    sql`${leadsTable.followUpDate} IS NOT NULL`,
    lte(leadsTable.followUpDate, now),
    sql`${leadsTable.status} NOT IN ('Converted', 'Lost')`,
  ];
  if (isAgent && req.user) {
    conditions.push(eq(leadsTable.assignedTo, req.user.userId));
  }
  const rows = await db
    .select({
      lead: leadsTable,
      assignedToName: usersTable.name,
    })
    .from(leadsTable)
    .leftJoin(usersTable, eq(leadsTable.assignedTo, usersTable.id))
    .where(and(...conditions))
    .orderBy(asc(leadsTable.followUpDate));

  res.json(rows.map((r) => serializeLead(r.lead, r.assignedToName)));
});

router.get("/leads", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { status, source, assignedTo } = parsed.data;
  const conditions = [];
  if (status)
    conditions.push(
      eq(
        leadsTable.status,
        status as
          | "New"
          | "Contacted"
          | "Interested"
          | "Quotation"
          | "Follow-up"
          | "Converted"
          | "Lost"
          | "Cold",
      ),
    );
  if (source)
    conditions.push(
      eq(
        leadsTable.source,
        source as
          | "Instagram"
          | "Facebook"
          | "Website"
          | "Manual"
          | "Referral",
      ),
    );
  if (assignedTo) conditions.push(eq(leadsTable.assignedTo, assignedTo));

  if (req.user?.role === "agent") {
    conditions.push(eq(leadsTable.assignedTo, req.user.userId));
  }

  const rows = await db
    .select({ lead: leadsTable, assignedToName: usersTable.name })
    .from(leadsTable)
    .leftJoin(usersTable, eq(leadsTable.assignedTo, usersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leadsTable.createdAt));

  res.json(rows.map((r) => serializeLead(r.lead, r.assignedToName)));
});

router.post("/leads", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const followUpDate = parseDate(data.followUpDate);

  const assignedTo =
    data.assignedTo ??
    (req.user?.role === "agent" ? req.user.userId : null);

  const [lead] = await db
    .insert(leadsTable)
    .values({
      name: data.name,
      phone: data.phone,
      city: data.city ?? null,
      source: data.source,
      status: data.status ?? "New",
      assignedTo: assignedTo ?? null,
      followUpDate: followUpDate ?? null,
      notes: data.notes ?? null,
    })
    .returning();

  if (!lead) {
    res.status(500).json({ error: "Failed to create lead" });
    return;
  }

  // log creation activity
  await db.insert(leadActivitiesTable).values({
    leadId: lead.id,
    userId: req.user?.userId ?? null,
    type: "note",
    description: `Lead created (${lead.source})`,
  });

  let assignedToName: string | null = null;
  if (lead.assignedTo) {
    const [u] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, lead.assignedTo))
      .limit(1);
    assignedToName = u?.name ?? null;
  }
  res.json(serializeLead(lead, assignedToName));
});

router.get("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({ lead: leadsTable, assignedToName: usersTable.name })
    .from(leadsTable)
    .leftJoin(usersTable, eq(leadsTable.assignedTo, usersTable.id))
    .where(eq(leadsTable.id, params.data.id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  if (
    req.user?.role === "agent" &&
    row.lead.assignedTo !== req.user.userId
  ) {
    res.status(403).json({ error: "Not authorized for this lead" });
    return;
  }
  res.json(serializeLead(row.lead, row.assignedToName));
});

router.patch("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;

  const [existing] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  if (
    req.user?.role === "agent" &&
    existing.assignedTo !== req.user.userId
  ) {
    res.status(403).json({ error: "Not authorized for this lead" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates["name"] = data.name;
  if (data.phone !== undefined) updates["phone"] = data.phone;
  if (data.city !== undefined) updates["city"] = data.city;
  if (data.source !== undefined) updates["source"] = data.source;
  if (data.status !== undefined) updates["status"] = data.status;
  if (data.assignedTo !== undefined) updates["assignedTo"] = data.assignedTo;
  if (data.notes !== undefined) updates["notes"] = data.notes;
  if (data.followUpDate !== undefined) {
    const fd = parseDate(data.followUpDate);
    updates["followUpDate"] = fd ?? null;
  }

  const [updated] = await db
    .update(leadsTable)
    .set(updates)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(500).json({ error: "Failed to update lead" });
    return;
  }

  // log status change
  if (
    data.status !== undefined &&
    data.status !== existing.status
  ) {
    await db.insert(leadActivitiesTable).values({
      leadId: updated.id,
      userId: req.user?.userId ?? null,
      type: "status_change",
      description: `Status changed: ${existing.status} → ${data.status}`,
    });
  }

  let assignedToName: string | null = null;
  if (updated.assignedTo) {
    const [u] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, updated.assignedTo))
      .limit(1);
    assignedToName = u?.name ?? null;
  }
  res.json(serializeLead(updated, assignedToName));
});

router.delete("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin role required to delete leads" });
    return;
  }
  const [deleted] = await db
    .delete(leadsTable)
    .where(eq(leadsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
