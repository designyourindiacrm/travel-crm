/**
 * Instagram / Meta Lead Ads Webhook
 *
 * Meta calls this endpoint in two ways:
 *
 * 1. GET /api/webhook/meta-leads  — one-time verification when you register the webhook in
 *    Meta Business Manager. Meta sends hub.mode, hub.verify_token, hub.challenge.
 *    We confirm the token matches our secret and reply with the challenge string.
 *
 * 2. POST /api/webhook/meta-leads — real-time lead notifications whenever someone submits
 *    an Instagram / Facebook Lead Ad form. We extract their name, phone, email, and save
 *    them as a new lead with source = "Instagram".
 *
 * ENV variable: META_WEBHOOK_VERIFY_TOKEN (set this in Replit Secrets).
 * It must exactly match the Verify Token you enter in Meta Business Manager.
 */
import { Router, type IRouter } from "express";
import { db, leadsTable, leadActivitiesTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Step 1: Webhook verification (GET) ────────────────────────────────────────
// No auth required — Meta calls this publicly to verify the URL.
router.get("/webhook/meta-leads", (req, res): void => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // The token you set in Meta Business Manager must match this env var
  const VERIFY_TOKEN =
    process.env.META_WEBHOOK_VERIFY_TOKEN ?? "designyourindia_verify_2024";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("Meta webhook verified successfully");
    res.status(200).send(challenge);        // Echo the challenge back to Meta
  } else {
    logger.warn({ mode, token }, "Meta webhook verification failed — token mismatch");
    res.status(403).json({ error: "Forbidden: verify token does not match." });
  }
});

// ─── Step 2: Receive lead data (POST) ─────────────────────────────────────────
// No auth required — Meta posts lead data publicly to this URL.
// We always respond 200 so Meta does not retry the request repeatedly.
router.post("/webhook/meta-leads", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  // Meta always sends object: "page" for Lead Ads
  if (!body || body["object"] !== "page") {
    res.status(200).json({ status: "ignored", reason: "not a page event" });
    return;
  }

  let processed = 0;

  // Meta sends an array of entries (pages), each with an array of changes
  const entries = (body["entry"] as Record<string, unknown>[]) ?? [];

  for (const entry of entries) {
    const changes = (entry["changes"] as Record<string, unknown>[]) ?? [];

    for (const change of changes) {
      // We only care about leadgen field changes
      if (change["field"] !== "leadgen") continue;

      const value = change["value"] as Record<string, unknown> | undefined;
      const fieldData = (value?.["field_data"] as Array<{ name: string; values: string[] }>) ?? [];

      // Helper to get a field value by name from Meta's field_data array
      const get = (fieldName: string): string =>
        fieldData.find((f) => f.name === fieldName)?.values?.[0]?.trim() ?? "";

      // Map Meta field names → our lead fields
      const name  = get("full_name") || get("name")         || "Unknown Lead";
      const phone = get("phone_number") || get("phone")      || get("mobile") || "";
      const email = get("email")                             || "";
      const city  = get("city")                             || null;

      // Build a readable notes string from Meta metadata
      const metaNotes = [
        value?.["leadgen_id"] ? `Meta Lead ID: ${value["leadgen_id"]}` : null,
        value?.["form_id"]    ? `Form ID: ${value["form_id"]}`         : null,
        email                 ? `Email: ${email}`                      : null,
      ]
        .filter(Boolean)
        .join(" | ");

      try {
        const [lead] = await db
          .insert(leadsTable)
          .values({
            name,
            phone: phone || "N/A",
            city,
            source: "Instagram",  // Mark source as Instagram for all webhook leads
            status: "New",
            assignedTo: null,
            notes: metaNotes || null,
          })
          .returning();

        if (lead) {
          await db.insert(leadActivitiesTable).values({
            leadId: lead.id,
            userId: null,
            type: "note",
            description: "Lead received automatically via Instagram / Meta Lead Ads webhook",
          });
          processed++;
        }
      } catch (err) {
        logger.error({ err, name, phone }, "Webhook: failed to insert Meta lead into DB");
      }
    }
  }

  logger.info({ processed }, "Meta webhook POST processed");

  // Always 200 — if we return anything else Meta will retry for 24 hours
  res.status(200).json({ status: "ok", processed });
});

export default router;
