import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const dashboardRangeSchema = z.enum(["7d", "30d", "90d"]).default("30d");

export const dateRangeQuerySchema = z
  .object({
    from: z.string().regex(isoDateRegex).optional(),
    to: z.string().regex(isoDateRegex).optional()
  })
  .strict();

export const recentIssuesQuerySchema = z
  .object({
    range: z.enum(["7d"]).default("7d"),
    limit: z.coerce.number().int().min(1).max(20).default(5)
  })
  .strict();
