import { z } from "zod";

/**
 * Lightweight change log for sensitive records (salary changes, expense
 * edits, loan repayments, archival). Not a full event-sourcing system —
 * just enough to answer "who changed what, and when" per §17 of the spec.
 */
export const auditActionSchema = z.enum(["create", "update", "archive", "unarchive", "delete"]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditLogEntrySchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  action: auditActionSchema,
  summary: z.string(),
  performedBy: z.string(),
  performedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
