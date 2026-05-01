/**
 * Excel Upload Route
 * POST /api/upload/excel — uploads an .xlsx file and bulk-imports leads.
 *
 * Expected columns (case-insensitive):
 *   name, phone, city, source, status, notes
 * Required: name + phone. Everything else is optional and defaults to "Manual" / "New".
 */
import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, leadsTable, leadActivitiesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

// Store uploaded file in RAM (no temp files on disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
});

const VALID_SOURCES = ["Instagram", "Facebook", "Website", "Manual", "Referral"] as const;
const VALID_STATUSES = [
  "New", "Contacted", "Interested", "Quotation",
  "Follow-up", "Converted", "Lost", "Cold",
] as const;

type Source = typeof VALID_SOURCES[number];
type Status = typeof VALID_STATUSES[number];

const router: IRouter = Router();

router.post(
  "/upload/excel",
  requireAuth,
  upload.single("file"), // "file" = the form-data field name
  async (req, res): Promise<void> => {

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded. Attach an .xlsx file using field name \"file\"." });
      return;
    }

    // Parse the workbook from the in-memory buffer
    let rows: Record<string, unknown>[];
    try {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        res.status(400).json({ error: "Excel file has no sheets." });
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet!, {
        defval: "", // empty cells → ""
        raw: false, // keep everything as strings
      });
    } catch {
      res.status(400).json({ error: "Could not parse file. Make sure it is a valid .xlsx or .xls file." });
      return;
    }

    if (rows.length === 0) {
      res.status(400).json({ error: "Excel file has no data rows (first row should be headers)." });
      return;
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [i, row] of rows.entries()) {
      const rowNum = i + 2; // +2 because row 1 is header

      // Accept multiple column-name variations
      const name = String(row["name"] ?? row["Name"] ?? row["NAME"] ?? "").trim();
      const phone = String(
        row["phone"] ?? row["Phone"] ?? row["PHONE"] ??
        row["mobile"] ?? row["Mobile"] ?? ""
      ).trim();

      if (!name || !phone) {
        errors.push(`Row ${rowNum}: skipped — name or phone is missing.`);
        skipped++;
        continue;
      }

      const rawSource = String(row["source"] ?? row["Source"] ?? "").trim();
      const source: Source = (VALID_SOURCES as readonly string[]).includes(rawSource)
        ? (rawSource as Source)
        : "Manual";

      const rawStatus = String(row["status"] ?? row["Status"] ?? "").trim();
      const status: Status = (VALID_STATUSES as readonly string[]).includes(rawStatus)
        ? (rawStatus as Status)
        : "New";

      const city = String(row["city"] ?? row["City"] ?? "").trim() || null;
      const notes = String(row["notes"] ?? row["Notes"] ?? "").trim() || null;

      try {
        const [lead] = await db
          .insert(leadsTable)
          .values({ name, phone, city, source, status, notes, assignedTo: null })
          .returning();

        if (lead) {
          await db.insert(leadActivitiesTable).values({
            leadId: lead.id,
            userId: req.user?.userId ?? null,
            type: "note",
            description: `Imported from Excel — row ${rowNum}`,
          });
          imported++;
        }
      } catch (err) {
        logger.error({ err, rowNum }, "Excel import: DB insert failed");
        errors.push(`Row ${rowNum}: database error — skipped.`);
        skipped++;
      }
    }

    req.log.info({ imported, skipped }, "Excel import complete");
    res.json({ imported, skipped, errors });
  },
);

export default router;
