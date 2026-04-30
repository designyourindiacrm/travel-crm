import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { leadsTable } from "./leads";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leadsTable.id, { onDelete: "cascade" }),
  packageName: text("package_name").notNull(),
  destination: text("destination").notNull(),
  tripType: text("trip_type", { enum: ["Domestic", "International"] }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  adults: integer("adults").notNull().default(1),
  children: integer("children").notNull().default(0),
  infants: integer("infants").notNull().default(0),
  travelMode: text("travel_mode", {
    enum: ["Self", "Volvo", "Train", "Flight"],
  }).notNull(),
  packageServiceType: text("package_service_type", {
    enum: ["Hotel Only", "Hotel + Cab", "Complete Package"],
  }).notNull(),
  hotelType: text("hotel_type", { enum: ["3*", "4*", "5*"] }),
  mealPlan: text("meal_plan", { enum: ["CP", "MAP", "AP"] }),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  salePrice: numeric("sale_price", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Booking = typeof bookingsTable.$inferSelect;
export type InsertBooking = typeof bookingsTable.$inferInsert;
