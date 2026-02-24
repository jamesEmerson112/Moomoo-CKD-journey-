import { z } from "zod";

import { normalizePhrase } from "@/lib/nlp";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const issueKeyRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const measurementKeyRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dailyLifeTagRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidDateString(value: string): boolean {
  if (!dateRegex.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const medicationSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    dose: z.string().trim().max(80).optional().nullable(),
    taken: z.boolean()
  })
  .strict();

const logBaseSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    date: z
      .string()
      .trim()
      .refine((value) => isValidDateString(value), "Invalid date format. Use YYYY-MM-DD"),
    createdBy: z.string().trim().min(1).max(120),
    createdAt: z
      .string()
      .trim()
      .regex(isoDateTimeRegex, "createdAt must be an ISO UTC datetime"),
    updatedAt: z
      .string()
      .trim()
      .regex(isoDateTimeRegex, "updatedAt must be an ISO UTC datetime"),
    medications: z.array(medicationSchema).max(64).optional(),
    weightLb: z.number().min(0).max(80).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable()
  })
  .strict();

const fullLogSchema = logBaseSchema.extend({
  mode: z.literal("full"),
  waterIntakeOz: z.number().min(0).max(300),
  appetiteScore: z.number().int().min(1).max(5),
  energyScore: z.number().int().min(1).max(5),
  vomitingCount: z.number().int().min(0).max(20),
  urinationScore: z.number().int().min(0).max(3),
  stoolScore: z.number().int().min(0).max(3)
});

const quickTextLogSchema = logBaseSchema
  .extend({
    mode: z.literal("quick_text"),
    notes: z.string().trim().min(15).max(5000),
    waterIntakeOz: z.number().min(0).max(300).optional().nullable(),
    appetiteScore: z.number().int().min(1).max(5).optional().nullable(),
    energyScore: z.number().int().min(1).max(5).optional().nullable(),
    vomitingCount: z.number().int().min(0).max(20).optional().nullable(),
    urinationScore: z.number().int().min(0).max(3).optional().nullable(),
    stoolScore: z.number().int().min(0).max(3).optional().nullable()
  })
  .strict();

export const contentLogEntrySchema = z.discriminatedUnion("mode", [fullLogSchema, quickTextLogSchema]);

export const contentLogsFileSchema = z
  .object({
    logs: z.array(contentLogEntrySchema)
  })
  .strict()
  .superRefine((value, ctx) => {
    const seenIds = new Set<string>();

    value.logs.forEach((log, index) => {
      if (seenIds.has(log.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate log id \"${log.id}\"`,
          path: ["logs", index, "id"]
        });
      }
      seenIds.add(log.id);
    });
  });

export const contentLexiconTermSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    issueKey: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(issueKeyRegex, "issueKey must be kebab-case"),
    label: z.string().trim().min(1).max(120),
    phrase: z.string().trim().min(2).max(80),
    weight: z.number().min(0.5).max(3),
    isActive: z.boolean()
  })
  .strict();

export const contentLexiconFileSchema = z
  .object({
    terms: z.array(contentLexiconTermSchema).max(1000)
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>();

    value.terms.forEach((term, index) => {
      const normalizedPhrase = normalizePhrase(term.phrase);
      if (!normalizedPhrase) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phrase becomes empty after normalization",
          path: ["terms", index, "phrase"]
        });
        return;
      }

      const key = `${term.issueKey}::${normalizedPhrase}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate phrase for issue key \"${term.issueKey}\"`,
          path: ["terms", index, "phrase"]
        });
        return;
      }

      seen.add(key);
    });
  });

const thresholdsSchema = z
  .object({
    waterIntakeMinOz: z.number().min(0).max(300),
    appetiteMin: z.number().int().min(1).max(5),
    energyMin: z.number().int().min(1).max(5),
    vomitingMax: z.number().int().min(0).max(20),
    urinationMin: z.number().int().min(0).max(3),
    stoolMin: z.number().int().min(0).max(3),
    weightLossPctWarn: z.number().min(0).max(100)
  })
  .strict();

export const contentThresholdsFileSchema = z
  .object({
    thresholds: thresholdsSchema
  })
  .strict();

const dailyLifeEntrySchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    date: z
      .string()
      .trim()
      .refine((value) => isValidDateString(value), "Invalid date format. Use YYYY-MM-DD"),
    title: z.string().trim().min(3).max(140),
    notes: z.string().trim().min(10).max(10000),
    tags: z.array(z.string().trim().min(1).max(40).regex(dailyLifeTagRegex, "Tag must be kebab-case")).max(24).optional(),
    createdAt: z
      .string()
      .trim()
      .regex(isoDateTimeRegex, "createdAt must be an ISO UTC datetime"),
    updatedAt: z
      .string()
      .trim()
      .regex(isoDateTimeRegex, "updatedAt must be an ISO UTC datetime")
  })
  .strict();

export const contentDailyLifeFileSchema = z
  .object({
    entries: z.array(dailyLifeEntrySchema).max(5000)
  })
  .strict()
  .superRefine((value, ctx) => {
    const seenIds = new Set<string>();
    value.entries.forEach((entry, index) => {
      if (seenIds.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate daily life entry id \"${entry.id}\"`,
          path: ["entries", index, "id"]
        });
      }
      seenIds.add(entry.id);
    });
  });

const clinicalMeasurementSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(measurementKeyRegex, "measurement key must be kebab-case"),
    label: z.string().trim().min(1).max(120),
    value: z.number(),
    unit: z.string().trim().min(1).max(40).optional().nullable(),
    comparator: z.enum(["exact", "approx", "gt", "lt"]),
    confidence: z.enum(["confirmed", "estimated", "caregiver_report"]),
    note: z.string().trim().max(300).optional().nullable()
  })
  .strict();

const clinicalEventSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    date: z
      .string()
      .trim()
      .refine((value) => isValidDateString(value), "Invalid date format. Use YYYY-MM-DD"),
    category: z.enum(["historical", "lab", "exam", "er", "treatment_plan", "home_observation"]),
    title: z.string().trim().min(3).max(180),
    summary: z.string().trim().min(10).max(1500),
    source: z.enum(["specialist_summary", "home_log"]),
    confidence: z.enum(["confirmed", "estimated", "caregiver_report"]),
    measurements: z.array(clinicalMeasurementSchema).max(120).optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.measurements || value.measurements.length === 0) {
      return;
    }

    const seen = new Set<string>();
    value.measurements.forEach((measurement, index) => {
      if (seen.has(measurement.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate measurement key \"${measurement.key}\" in event`,
          path: ["measurements", index, "key"]
        });
        return;
      }
      seen.add(measurement.key);
    });
  });

export const contentClinicalEventsFileSchema = z
  .object({
    events: z.array(clinicalEventSchema).max(1000)
  })
  .strict()
  .superRefine((value, ctx) => {
    const seenIds = new Set<string>();
    value.events.forEach((event, index) => {
      if (seenIds.has(event.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate clinical event id \"${event.id}\"`,
          path: ["events", index, "id"]
        });
      }
      seenIds.add(event.id);
    });
  });

export type ContentLogsFile = z.infer<typeof contentLogsFileSchema>;
export type ContentLexiconFile = z.infer<typeof contentLexiconFileSchema>;
export type ContentThresholdsFile = z.infer<typeof contentThresholdsFileSchema>;
export type ContentDailyLifeFile = z.infer<typeof contentDailyLifeFileSchema>;
export type ContentClinicalEventsFile = z.infer<typeof contentClinicalEventsFileSchema>;
