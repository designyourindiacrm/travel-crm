import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import {
  db,
  bookingsTable,
  leadsTable,
  paymentsTable,
} from "@workspace/db";
import {
  CreateBookingPaymentBody,
  CreateBookingPaymentParams,
  ListBookingPaymentsParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializePayment } from "../lib/serializers";

const router: IRouter = Router();

router.get(
  "/bookings/:id/payments",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListBookingPaymentsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [row] = await db
      .select({ b: bookingsTable, leadAssigned: leadsTable.assignedTo })
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
      .where(eq(paymentsTable.bookingId, params.data.id))
      .orderBy(asc(paymentsTable.date));
    res.json(payments.map(serializePayment));
  },
);

router.post(
  "/bookings/:id/payments",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateBookingPaymentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateBookingPaymentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .select({ b: bookingsTable, leadAssigned: leadsTable.assignedTo })
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

    const date = new Date(parsed.data.date);
    const dateValid = Number.isNaN(date.getTime()) ? new Date() : date;

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        bookingId: params.data.id,
        amount: String(parsed.data.amount),
        date: dateValid,
        method: parsed.data.method,
        type: parsed.data.type,
        notes: parsed.data.notes ?? null,
      })
      .returning();
    if (!payment) {
      res.status(500).json({ error: "Failed to create payment" });
      return;
    }
    res.json(serializePayment(payment));
  },
);

router.get("/payments", requireAuth, async (req, res): Promise<void> => {
  const isAgent = req.user?.role === "agent";
  const rows = await db
    .select({ p: paymentsTable, leadAssigned: leadsTable.assignedTo })
    .from(paymentsTable)
    .leftJoin(bookingsTable, eq(paymentsTable.bookingId, bookingsTable.id))
    .leftJoin(leadsTable, eq(bookingsTable.leadId, leadsTable.id))
    .orderBy(desc(paymentsTable.date));
  const filtered = isAgent && req.user
    ? rows.filter((r) => r.leadAssigned === req.user!.userId)
    : rows;
  res.json(filtered.map((r) => serializePayment(r.p)));
});

export default router;
