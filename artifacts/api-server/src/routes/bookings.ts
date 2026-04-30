import { Router, type IRouter } from "express";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  bookingsTable,
  leadsTable,
  paymentsTable,
} from "@workspace/db";
import {
  CreateBookingBody,
  DeleteBookingParams,
  GetBookingParams,
  UpdateBookingBody,
  UpdateBookingParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeBooking, serializePayment } from "../lib/serializers";

const router: IRouter = Router();

function parseDate(value: unknown): Date {
  const d = new Date(value as string | number);
  if (Number.isNaN(d.getTime()))
    throw new Error(`Invalid date: ${String(value)}`);
  return d;
}

async function getPaidByBookingIds(
  ids: number[],
): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      bookingId: paymentsTable.bookingId,
      total: sql<string>`COALESCE(SUM(${paymentsTable.amount}), 0)`,
    })
    .from(paymentsTable)
    .where(inArray(paymentsTable.bookingId, ids))
    .groupBy(paymentsTable.bookingId);
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.bookingId, Number(r.total));
  return map;
}

router.get("/bookings", requireAuth, async (req, res): Promise<void> => {
  const isAgent = req.user?.role === "agent";
  const rows = await db
    .select({ b: bookingsTable, leadName: leadsTable.name, leadAssigned: leadsTable.assignedTo })
    .from(bookingsTable)
    .leftJoin(leadsTable, eq(bookingsTable.leadId, leadsTable.id))
    .orderBy(desc(bookingsTable.createdAt));

  const filtered = isAgent && req.user
    ? rows.filter((r) => r.leadAssigned === req.user!.userId)
    : rows;

  const ids = filtered.map((r) => r.b.id);
  const paidMap = await getPaidByBookingIds(ids);
  res.json(
    filtered.map((r) =>
      serializeBooking(r.b, paidMap.get(r.b.id) ?? 0, r.leadName),
    ),
  );
});

router.post("/bookings", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, data.leadId))
    .limit(1);
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  if (req.user?.role === "agent" && lead.assignedTo !== req.user.userId) {
    res.status(403).json({ error: "Not authorized for this lead" });
    return;
  }

  let startDate: Date;
  let endDate: Date;
  try {
    startDate = parseDate(data.startDate);
    endDate = parseDate(data.endDate);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      leadId: data.leadId,
      packageName: data.packageName,
      destination: data.destination,
      tripType: data.tripType,
      startDate,
      endDate,
      adults: data.adults,
      children: data.children,
      infants: data.infants,
      travelMode: data.travelMode,
      packageServiceType: data.packageServiceType,
      hotelType: data.hotelType ?? null,
      mealPlan: data.mealPlan ?? null,
      costPrice: String(data.costPrice),
      salePrice: String(data.salePrice),
    })
    .returning();
  if (!booking) {
    res.status(500).json({ error: "Failed to create booking" });
    return;
  }

  res.json(serializeBooking(booking, 0, lead.name));
});

router.get("/bookings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({ b: bookingsTable, leadName: leadsTable.name, leadAssigned: leadsTable.assignedTo })
    .from(bookingsTable)
    .leftJoin(leadsTable, eq(bookingsTable.leadId, leadsTable.id))
    .where(eq(bookingsTable.id, params.data.id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (
    req.user?.role === "agent" &&
    row.leadAssigned !== req.user.userId
  ) {
    res.status(403).json({ error: "Not authorized for this booking" });
    return;
  }
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.bookingId, row.b.id))
    .orderBy(asc(paymentsTable.date));
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const ser = serializeBooking(row.b, paid, row.leadName);
  res.json({ ...ser, payments: payments.map(serializePayment) });
});

router.patch("/bookings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;

  const [existing] = await db
    .select({ b: bookingsTable, leadAssigned: leadsTable.assignedTo, leadName: leadsTable.name })
    .from(bookingsTable)
    .leftJoin(leadsTable, eq(bookingsTable.leadId, leadsTable.id))
    .where(eq(bookingsTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (
    req.user?.role === "agent" &&
    existing.leadAssigned !== req.user.userId
  ) {
    res.status(403).json({ error: "Not authorized for this booking" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (data.packageName !== undefined) updates["packageName"] = data.packageName;
  if (data.destination !== undefined) updates["destination"] = data.destination;
  if (data.tripType !== undefined) updates["tripType"] = data.tripType;
  if (data.startDate !== undefined) updates["startDate"] = parseDate(data.startDate);
  if (data.endDate !== undefined) updates["endDate"] = parseDate(data.endDate);
  if (data.adults !== undefined) updates["adults"] = data.adults;
  if (data.children !== undefined) updates["children"] = data.children;
  if (data.infants !== undefined) updates["infants"] = data.infants;
  if (data.travelMode !== undefined) updates["travelMode"] = data.travelMode;
  if (data.packageServiceType !== undefined)
    updates["packageServiceType"] = data.packageServiceType;
  if (data.hotelType !== undefined) updates["hotelType"] = data.hotelType;
  if (data.mealPlan !== undefined) updates["mealPlan"] = data.mealPlan;
  if (data.costPrice !== undefined) updates["costPrice"] = String(data.costPrice);
  if (data.salePrice !== undefined) updates["salePrice"] = String(data.salePrice);

  const [updated] = await db
    .update(bookingsTable)
    .set(updates)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(500).json({ error: "Failed to update booking" });
    return;
  }
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.bookingId, updated.id));
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  res.json(serializeBooking(updated, paid, existing.leadName));
});

router.delete("/bookings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin role required to delete bookings" });
    return;
  }
  const [deleted] = await db
    .delete(bookingsTable)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
