import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  db,
  bookingsTable,
  leadActivitiesTable,
  leadsTable,
  paymentsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get(
  "/dashboard/summary",
  requireAuth,
  async (req, res): Promise<void> => {
    const isAgent = req.user?.role === "agent";
    const userId = req.user?.userId;

    // leads filtered by assignment if agent
    const leadsRows = await db.select().from(leadsTable);
    const leads = isAgent && userId
      ? leadsRows.filter((l) => l.assignedTo === userId)
      : leadsRows;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === "New").length;
    const convertedLeads = leads.filter((l) => l.status === "Converted").length;
    const conversionRate =
      totalLeads === 0 ? 0 : Number(((convertedLeads / totalLeads) * 100).toFixed(2));

    const followUpsToday = leads.filter((l) => {
      if (!l.followUpDate) return false;
      const d = new Date(l.followUpDate);
      return d >= startOfDay && d <= endOfDay;
    }).length;
    const overdueFollowUps = leads.filter((l) => {
      if (!l.followUpDate) return false;
      if (l.status === "Converted" || l.status === "Lost") return false;
      const d = new Date(l.followUpDate);
      return d < startOfDay;
    }).length;

    // bookings & payments via joins
    const allBookings = await db
      .select({ b: bookingsTable, leadAssigned: leadsTable.assignedTo })
      .from(bookingsTable)
      .leftJoin(leadsTable, eq(bookingsTable.leadId, leadsTable.id));
    const bookings = isAgent && userId
      ? allBookings.filter((r) => r.leadAssigned === userId)
      : allBookings;
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce(
      (s, r) => s + Number(r.b.salePrice),
      0,
    );
    const totalCost = bookings.reduce((s, r) => s + Number(r.b.costPrice), 0);
    const totalProfit = totalRevenue - totalCost;

    const bookingIds = bookings.map((r) => r.b.id);
    let totalPaid = 0;
    if (bookingIds.length > 0) {
      const payRows = await db
        .select({
          bookingId: paymentsTable.bookingId,
          total: sql<string>`COALESCE(SUM(${paymentsTable.amount}), 0)`,
        })
        .from(paymentsTable)
        .groupBy(paymentsTable.bookingId);
      const map = new Map<number, number>();
      for (const r of payRows) map.set(r.bookingId, Number(r.total));
      for (const id of bookingIds) totalPaid += map.get(id) ?? 0;
    }
    const outstandingBalance = totalRevenue - totalPaid;

    res.json({
      totalLeads,
      newLeads,
      convertedLeads,
      conversionRate,
      totalBookings,
      totalRevenue,
      totalCost,
      totalProfit,
      totalPaid,
      outstandingBalance,
      followUpsToday,
      overdueFollowUps,
    });
  },
);

router.get(
  "/dashboard/pipeline",
  requireAuth,
  async (req, res): Promise<void> => {
    const isAgent = req.user?.role === "agent";
    const userId = req.user?.userId;
    const conditions = isAgent && userId
      ? [eq(leadsTable.assignedTo, userId)]
      : [];
    const rows = await db
      .select({
        status: leadsTable.status,
        count: sql<string>`COUNT(*)`,
      })
      .from(leadsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(leadsTable.status);

    const statuses = [
      "New",
      "Contacted",
      "Interested",
      "Quotation",
      "Follow-up",
      "Converted",
      "Lost",
      "Cold",
    ];
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.status, Number(r.count));
    res.json(statuses.map((s) => ({ status: s, count: map.get(s) ?? 0 })));
  },
);

router.get(
  "/dashboard/sources",
  requireAuth,
  async (req, res): Promise<void> => {
    const isAgent = req.user?.role === "agent";
    const userId = req.user?.userId;
    const conditions = isAgent && userId
      ? [eq(leadsTable.assignedTo, userId)]
      : [];
    const rows = await db
      .select({
        source: leadsTable.source,
        count: sql<string>`COUNT(*)`,
      })
      .from(leadsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(leadsTable.source);
    res.json(
      rows.map((r) => ({ source: r.source, count: Number(r.count) })),
    );
  },
);

router.get(
  "/dashboard/recent-activity",
  requireAuth,
  async (req, res): Promise<void> => {
    const isAgent = req.user?.role === "agent";
    const userId = req.user?.userId;

    const rows = await db
      .select({
        id: leadActivitiesTable.id,
        leadId: leadActivitiesTable.leadId,
        leadName: leadsTable.name,
        leadAssigned: leadsTable.assignedTo,
        type: leadActivitiesTable.type,
        description: leadActivitiesTable.description,
        createdAt: leadActivitiesTable.createdAt,
      })
      .from(leadActivitiesTable)
      .leftJoin(leadsTable, eq(leadActivitiesTable.leadId, leadsTable.id))
      .orderBy(desc(leadActivitiesTable.createdAt))
      .limit(20);

    const filtered = isAgent && userId
      ? rows.filter((r) => r.leadAssigned === userId)
      : rows;

    res.json(
      filtered.map((r) => ({
        id: r.id,
        leadId: r.leadId,
        leadName: r.leadName ?? "Unknown",
        type: r.type,
        description: r.description,
        createdAt: (r.createdAt ?? new Date()).toISOString(),
      })),
    );
  },
);

router.get(
  "/dashboard/top-destinations",
  requireAuth,
  async (req, res): Promise<void> => {
    const isAgent = req.user?.role === "agent";
    const userId = req.user?.userId;

    const rows = await db
      .select({
        b: bookingsTable,
        leadAssigned: leadsTable.assignedTo,
      })
      .from(bookingsTable)
      .leftJoin(leadsTable, eq(bookingsTable.leadId, leadsTable.id));
    const filtered = isAgent && userId
      ? rows.filter((r) => r.leadAssigned === userId)
      : rows;

    const acc = new Map<string, { bookings: number; revenue: number }>();
    for (const r of filtered) {
      const cur = acc.get(r.b.destination) ?? { bookings: 0, revenue: 0 };
      cur.bookings += 1;
      cur.revenue += Number(r.b.salePrice);
      acc.set(r.b.destination, cur);
    }
    const arr = Array.from(acc.entries()).map(([destination, v]) => ({
      destination,
      bookings: v.bookings,
      revenue: v.revenue,
    }));
    arr.sort((a, b) => b.revenue - a.revenue);
    res.json(arr.slice(0, 10));
    void gte; void lte;
  },
);

export default router;
