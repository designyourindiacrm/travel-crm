import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { leadsTable } from "./leads";
import { usersTable } from "./users";

export const leadActivitiesTable = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leadsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  type: text("type", {
    enum: ["call", "note", "whatsapp", "email", "status_change"],
  }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LeadActivity = typeof leadActivitiesTable.$inferSelect;
export type InsertLeadActivity = typeof leadActivitiesTable.$inferInsert;
