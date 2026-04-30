import { Router, type IRouter } from "express";
import { and, eq, lte, sql } from "drizzle-orm";
import {
  db,
  bookingsTable,
  leadActivitiesTable,
  leadsTable,
  paymentsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post(
  "/automation/run",
  requireAuth,
  async (req, res): Promise<void> => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Mark leads cold if no activity in 3 days and still active (not Converted/Lost/Cold)
    const stale = await db
      .select()
      .from(leadsTable)
      .where(
        and(
          lte(leadsTable.updatedAt, threeDaysAgo),
          sql`${leadsTable.status} NOT IN ('Converted', 'Lost', 'Cold')`,
        ),
      );

    let markedCold = 0;
    for (const lead of stale) {
      await db
        .update(leadsTable)
        .set({ status: "Cold" })
        .where(eq(leadsTable.id, lead.id));
      await db.insert(leadActivitiesTable).values({
        leadId: lead.id,
        userId: null,
        type: "status_change",
        description: "Auto-marked Cold (no activity for 3+ days)",
      });
      markedCold += 1;
    }

    // Today's followups + overdue
    const allLeads = await db.select().from(leadsTable);
    const followUpsToday = allLeads.filter((l) => {
      if (!l.followUpDate) return false;
      const d = new Date(l.followUpDate);
      return d >= startOfDay && d <= endOfDay;
    }).length;
    const overdueFollowUps = allLeads.filter((l) => {
      if (!l.followUpDate) return false;
      if (l.status === "Converted" || l.status === "Lost") return false;
      const d = new Date(l.followUpDate);
      return d < startOfDay;
    }).length;

    // Pending payments
    const bookings = await db.select().from(bookingsTable);
    const payRows = await db
      .select({
        bookingId: paymentsTable.bookingId,
        total: sql<string>`COALESCE(SUM(${paymentsTable.amount}), 0)`,
      })
      .from(paymentsTable)
      .groupBy(paymentsTable.bookingId);
    const paid = new Map<number, number>();
    for (const r of payRows) paid.set(r.bookingId, Number(r.total));
    const pendingPayments = bookings.filter((b) => {
      const sale = Number(b.salePrice);
      const p = paid.get(b.id) ?? 0;
      return sale - p > 0.01;
    }).length;

    req.log.info(
      { markedCold, followUpsToday, overdueFollowUps, pendingPayments },
      "Automation run complete",
    );

    res.json({
      markedCold,
      followUpsToday,
      overdueFollowUps,
      pendingPayments,
    });
  },
);

router.get(
  "/automation/pending-payments",
  requireAuth,
  async (req, res): Promise<void> => {
    const isAgent = req.user?.role === "agent";
    const userId = req.user?.userId;
    const rows = await db
      .select({
        b: bookingsTable,
        leadName: leadsTable.name,
        leadAssigned: leadsTable.assignedTo,
      })
      .from(bookingsTable)
      .leftJoin(leadsTable, eq(bookingsTable.leadId, leadsTable.id));
    const filtered = isAgent && userId
      ? rows.filter((r) => r.leadAssigned === userId)
      : rows;
    const payRows = await db
      .select({
        bookingId: paymentsTable.bookingId,
        total: sql<string>`COALESCE(SUM(${paymentsTable.amount}), 0)`,
      })
      .from(paymentsTable)
      .groupBy(paymentsTable.bookingId);
    const paidMap = new Map<number, number>();
    for (const r of payRows) paidMap.set(r.bookingId, Number(r.total));
    const out = filtered
      .map((r) => {
        const sale = Number(r.b.salePrice);
        const paid = paidMap.get(r.b.id) ?? 0;
        return {
          bookingId: r.b.id,
          leadId: r.b.leadId,
          leadName: r.leadName ?? "Unknown",
          packageName: r.b.packageName,
          salePrice: sale,
          paid,
          balance: sale - paid,
        };
      })
      .filter((p) => p.balance > 0.01)
      .sort((a, b) => b.balance - a.balance);
    res.json(out);
  },
);

export default router;
