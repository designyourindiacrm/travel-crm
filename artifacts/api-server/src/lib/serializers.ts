import type {
  Lead,
  Booking,
  Payment,
  LeadActivity,
  User,
} from "@workspace/db";

export function toIso(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  if (typeof d === "string") return d;
  return d.toISOString();
}

export function serializeUser(u: User): {
  id: number;
  name: string;
  email: string;
  role: "admin" | "agent";
  createdAt: string;
} {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: toIso(u.createdAt) ?? new Date().toISOString(),
  };
}

export function serializeLead(
  lead: Lead,
  assignedToName?: string | null,
): Record<string, unknown> {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    city: lead.city,
    source: lead.source,
    status: lead.status,
    assignedTo: lead.assignedTo,
    assignedToName: assignedToName ?? null,
    followUpDate: toIso(lead.followUpDate),
    notes: lead.notes,
    createdAt: toIso(lead.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(lead.updatedAt) ?? new Date().toISOString(),
  };
}

export function serializeActivity(
  a: LeadActivity,
  userName?: string | null,
): Record<string, unknown> {
  return {
    id: a.id,
    leadId: a.leadId,
    userId: a.userId,
    userName: userName ?? null,
    type: a.type,
    description: a.description,
    createdAt: toIso(a.createdAt) ?? new Date().toISOString(),
  };
}

export function serializeBooking(
  b: Booking,
  paid: number,
  leadName?: string | null,
): Record<string, unknown> {
  const cost = Number(b.costPrice);
  const sale = Number(b.salePrice);
  return {
    id: b.id,
    leadId: b.leadId,
    leadName: leadName ?? null,
    packageName: b.packageName,
    destination: b.destination,
    tripType: b.tripType,
    startDate: toIso(b.startDate) ?? new Date().toISOString(),
    endDate: toIso(b.endDate) ?? new Date().toISOString(),
    adults: b.adults,
    children: b.children,
    infants: b.infants,
    totalPersons: b.adults + b.children,
    travelMode: b.travelMode,
    packageServiceType: b.packageServiceType,
    hotelType: b.hotelType,
    mealPlan: b.mealPlan,
    costPrice: cost,
    salePrice: sale,
    profit: sale - cost,
    paid,
    balance: sale - paid,
    createdAt: toIso(b.createdAt) ?? new Date().toISOString(),
  };
}

export function serializePayment(p: Payment): Record<string, unknown> {
  return {
    id: p.id,
    bookingId: p.bookingId,
    amount: Number(p.amount),
    date: toIso(p.date) ?? new Date().toISOString(),
    method: p.method,
    type: p.type,
    notes: p.notes,
    createdAt: toIso(p.createdAt) ?? new Date().toISOString(),
  };
}
