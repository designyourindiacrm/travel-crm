import { db, usersTable, leadsTable, leadActivitiesTable, bookingsTable, paymentsTable } from "@workspace/db";
import { hashPassword } from "./lib/auth";
import { sql } from "drizzle-orm";

const logger = {
  info: (...a: unknown[]) => process.stdout.write(JSON.stringify(a) + "\n"),
  error: (...a: unknown[]) => process.stderr.write(JSON.stringify(a) + "\n"),
};

async function seed(): Promise<void> {
  const existing = await db.select().from(usersTable);
  if (existing.length > 0) {
    logger.info("Database already seeded, skipping.");
    process.exit(0);
  }

  logger.info("Seeding database...");

  const adminPwd = await hashPassword("admin123");
  const agentPwd = await hashPassword("agent123");

  const [admin] = await db
    .insert(usersTable)
    .values({
      name: "Aarav Sharma",
      email: "admin@voyagercrm.com",
      passwordHash: adminPwd,
      role: "admin",
    })
    .returning();
  const [agent1] = await db
    .insert(usersTable)
    .values({
      name: "Priya Iyer",
      email: "priya@voyagercrm.com",
      passwordHash: agentPwd,
      role: "agent",
    })
    .returning();
  const [agent2] = await db
    .insert(usersTable)
    .values({
      name: "Rohan Kapoor",
      email: "rohan@voyagercrm.com",
      passwordHash: agentPwd,
      role: "agent",
    })
    .returning();

  if (!admin || !agent1 || !agent2) throw new Error("Failed to seed users");

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const leadsData = [
    { name: "Ananya Mehta", phone: "+919810012345", city: "Mumbai", source: "Instagram" as const, status: "Quotation" as const, assignedTo: agent1.id, followUpDate: new Date(now + day) },
    { name: "Vikram Singh", phone: "+919820012345", city: "Delhi", source: "Website" as const, status: "Interested" as const, assignedTo: agent1.id, followUpDate: new Date(now - day) },
    { name: "Neha Reddy", phone: "+919830012345", city: "Bangalore", source: "Referral" as const, status: "Converted" as const, assignedTo: agent2.id, followUpDate: null },
    { name: "Karan Patel", phone: "+919840012345", city: "Ahmedabad", source: "Facebook" as const, status: "New" as const, assignedTo: agent2.id, followUpDate: new Date(now + 2 * day) },
    { name: "Ishaan Verma", phone: "+919850012345", city: "Pune", source: "Manual" as const, status: "Follow-up" as const, assignedTo: agent1.id, followUpDate: new Date(now) },
    { name: "Saanvi Joshi", phone: "+919860012345", city: "Jaipur", source: "Instagram" as const, status: "Contacted" as const, assignedTo: agent2.id, followUpDate: new Date(now + 3 * day) },
    { name: "Aditya Rao", phone: "+919870012345", city: "Hyderabad", source: "Website" as const, status: "Lost" as const, assignedTo: agent1.id, followUpDate: null },
    { name: "Meera Nair", phone: "+919880012345", city: "Kochi", source: "Referral" as const, status: "Converted" as const, assignedTo: agent2.id, followUpDate: null },
    { name: "Rajat Khanna", phone: "+919890012345", city: "Chandigarh", source: "Instagram" as const, status: "New" as const, assignedTo: agent1.id, followUpDate: new Date(now + day) },
    { name: "Diya Bhatia", phone: "+919800012345", city: "Lucknow", source: "Manual" as const, status: "Cold" as const, assignedTo: agent2.id, followUpDate: null },
  ];

  const insertedLeads = [];
  for (const l of leadsData) {
    const [lead] = await db.insert(leadsTable).values({
      name: l.name,
      phone: l.phone,
      city: l.city,
      source: l.source,
      status: l.status,
      assignedTo: l.assignedTo,
      followUpDate: l.followUpDate,
      notes: `Interested in ${["Goa Beach Holiday", "Kerala Backwaters", "Bali Escape", "Switzerland Tour", "Dubai Weekend"][Math.floor(Math.random() * 5)]}`,
    }).returning();
    if (lead) insertedLeads.push(lead);
  }

  // activities for each lead
  for (const lead of insertedLeads) {
    await db.insert(leadActivitiesTable).values([
      { leadId: lead.id, userId: lead.assignedTo, type: "note", description: `Initial enquiry received from ${lead.source}` },
      { leadId: lead.id, userId: lead.assignedTo, type: "call", description: "Discussed package preferences and budget" },
    ]);
  }

  // bookings only for the leads in advanced stages
  const bookingTemplates: Array<{
    leadId: number;
    packageName: string;
    destination: string;
    tripType: "Domestic" | "International";
    days: number;
    adults: number;
    children: number;
    travelMode: "Self" | "Volvo" | "Train" | "Flight";
    packageServiceType: "Hotel Only" | "Hotel + Cab" | "Complete Package";
    hotelType: "3*" | "4*" | "5*";
    mealPlan: "CP" | "MAP" | "AP";
    cost: number;
    sale: number;
  }> = [];

  for (const lead of insertedLeads) {
    if (["Quotation", "Converted", "Interested"].includes(lead.status)) {
      const opts = [
        { packageName: "Goa Beach Holiday", destination: "Goa", tripType: "Domestic" as const, days: 4, mode: "Flight" as const, hotel: "4*" as const, meal: "CP" as const, cost: 28000, sale: 42000 },
        { packageName: "Kerala Backwaters", destination: "Kerala", tripType: "Domestic" as const, days: 5, mode: "Flight" as const, hotel: "4*" as const, meal: "MAP" as const, cost: 35000, sale: 52000 },
        { packageName: "Bali Escape", destination: "Bali", tripType: "International" as const, days: 6, mode: "Flight" as const, hotel: "5*" as const, meal: "AP" as const, cost: 95000, sale: 145000 },
        { packageName: "Switzerland Alpine Tour", destination: "Switzerland", tripType: "International" as const, days: 8, mode: "Flight" as const, hotel: "5*" as const, meal: "MAP" as const, cost: 180000, sale: 245000 },
        { packageName: "Dubai City Break", destination: "Dubai", tripType: "International" as const, days: 4, mode: "Flight" as const, hotel: "5*" as const, meal: "CP" as const, cost: 65000, sale: 92000 },
      ];
      const o = opts[Math.floor(Math.random() * opts.length)]!;
      bookingTemplates.push({
        leadId: lead.id,
        packageName: o.packageName,
        destination: o.destination,
        tripType: o.tripType,
        days: o.days,
        adults: 2,
        children: Math.random() > 0.5 ? 1 : 0,
        travelMode: o.mode,
        packageServiceType: "Complete Package",
        hotelType: o.hotel,
        mealPlan: o.meal,
        cost: o.cost,
        sale: o.sale,
      });
    }
  }

  for (const t of bookingTemplates) {
    const start = new Date(now + (7 + Math.floor(Math.random() * 30)) * day);
    const end = new Date(start.getTime() + t.days * day);
    const [booking] = await db.insert(bookingsTable).values({
      leadId: t.leadId,
      packageName: t.packageName,
      destination: t.destination,
      tripType: t.tripType,
      startDate: start,
      endDate: end,
      adults: t.adults,
      children: t.children,
      infants: 0,
      travelMode: t.travelMode,
      packageServiceType: t.packageServiceType,
      hotelType: t.hotelType,
      mealPlan: t.mealPlan,
      costPrice: String(t.cost),
      salePrice: String(t.sale),
    }).returning();
    if (!booking) continue;

    // payments: most have an advance, some are fully paid
    const isFullyPaid = Math.random() > 0.6;
    if (isFullyPaid) {
      await db.insert(paymentsTable).values({
        bookingId: booking.id,
        amount: String(t.sale),
        date: new Date(now - 3 * day),
        method: "Bank Transfer",
        type: "Full",
        notes: "Full payment received",
      });
    } else {
      const advance = Math.floor(t.sale * 0.4);
      await db.insert(paymentsTable).values({
        bookingId: booking.id,
        amount: String(advance),
        date: new Date(now - 5 * day),
        method: "UPI",
        type: "Advance",
        notes: "40% advance paid",
      });
    }
  }

  void sql;
  logger.info({ leads: insertedLeads.length, bookings: bookingTemplates.length }, "Seed complete.");
  logger.info("Login: admin@voyagercrm.com / admin123  (admin)");
  logger.info("Login: priya@voyagercrm.com / agent123  (agent)");
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
