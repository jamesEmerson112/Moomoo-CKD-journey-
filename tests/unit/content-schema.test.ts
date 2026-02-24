import { describe, expect, it } from "vitest";

import {
  contentClinicalEventsFileSchema,
  contentDailyLifeFileSchema,
  contentLexiconFileSchema,
  contentLogsFileSchema,
  contentThresholdsFileSchema
} from "@/content/schema";

describe("content logs schema", () => {
  it("rejects duplicate log ids", () => {
    const parsed = contentLogsFileSchema.safeParse({
      logs: [
        {
          id: "dup-id",
          date: "2026-02-23",
          mode: "full",
          waterIntakeOz: 12,
          appetiteScore: 3,
          energyScore: 3,
          vomitingCount: 0,
          urinationScore: 2,
          stoolScore: 2,
          createdBy: "owner",
          createdAt: "2026-02-23T09:00:00.000Z",
          updatedAt: "2026-02-23T09:00:00.000Z"
        },
        {
          id: "dup-id",
          date: "2026-02-24",
          mode: "quick_text",
          notes: "Appetite was lower this morning but she recovered after hydration.",
          createdBy: "owner",
          createdAt: "2026-02-24T09:00:00.000Z",
          updatedAt: "2026-02-24T09:00:00.000Z"
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects quick text logs with short notes", () => {
    const parsed = contentLogsFileSchema.safeParse({
      logs: [
        {
          id: "quick-1",
          date: "2026-02-24",
          mode: "quick_text",
          notes: "too short",
          createdBy: "owner",
          createdAt: "2026-02-24T09:00:00.000Z",
          updatedAt: "2026-02-24T09:00:00.000Z"
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });
});

describe("content lexicon schema", () => {
  it("rejects duplicate normalized phrase for same issue key", () => {
    const parsed = contentLexiconFileSchema.safeParse({
      terms: [
        {
          id: "t1",
          issueKey: "low-appetite",
          label: "Low Appetite",
          phrase: "low appetite",
          weight: 1.2,
          isActive: true
        },
        {
          id: "t2",
          issueKey: "low-appetite",
          label: "Low Appetite",
          phrase: "LOW appetite",
          weight: 1.1,
          isActive: true
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });
});

describe("content thresholds schema", () => {
  it("accepts valid thresholds payload", () => {
    const parsed = contentThresholdsFileSchema.safeParse({
      thresholds: {
        waterIntakeMinOz: 12,
        appetiteMin: 2,
        energyMin: 2,
        vomitingMax: 1,
        urinationMin: 1,
        stoolMin: 1,
        weightLossPctWarn: 5
      }
    });

    expect(parsed.success).toBe(true);
  });
});

describe("clinical events schema", () => {
  it("rejects duplicate event ids", () => {
    const parsed = contentClinicalEventsFileSchema.safeParse({
      events: [
        {
          id: "evt-1",
          date: "2026-02-24",
          category: "lab",
          title: "Lab Event",
          summary: "Summary text for a lab event that is long enough.",
          source: "specialist_summary",
          confidence: "confirmed"
        },
        {
          id: "evt-1",
          date: "2026-02-25",
          category: "er",
          title: "ER Event",
          summary: "Another summary text that should trigger duplicate id validation.",
          source: "specialist_summary",
          confidence: "confirmed"
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts approximate and greater-than structured measurements", () => {
    const parsed = contentClinicalEventsFileSchema.safeParse({
      events: [
        {
          id: "evt-labs",
          date: "2026-01-31",
          category: "er",
          title: "ER severe status",
          summary: "ER event with mixed structured values for plotting.",
          source: "specialist_summary",
          confidence: "confirmed",
          measurements: [
            {
              key: "creatinine",
              label: "Creatinine",
              value: 5.6,
              unit: "mg/dL",
              comparator: "exact",
              confidence: "confirmed"
            },
            {
              key: "phosphorus",
              label: "Phosphorus",
              value: 15,
              unit: "mg/dL",
              comparator: "gt",
              confidence: "confirmed",
              note: "greater than threshold"
            }
          ]
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });
});

describe("daily life schema", () => {
  it("rejects duplicate daily-life ids", () => {
    const parsed = contentDailyLifeFileSchema.safeParse({
      entries: [
        {
          id: "daily-2026-02-24",
          date: "2026-02-24",
          title: "Daily note",
          notes: "A detailed daily note with enough text for validation.",
          createdAt: "2026-02-24T08:00:00.000Z",
          updatedAt: "2026-02-24T08:00:00.000Z"
        },
        {
          id: "daily-2026-02-24",
          date: "2026-02-25",
          title: "Another note",
          notes: "Another daily note entry with enough text for schema checks.",
          createdAt: "2026-02-25T08:00:00.000Z",
          updatedAt: "2026-02-25T08:00:00.000Z"
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts valid obsidian-style daily entry", () => {
    const parsed = contentDailyLifeFileSchema.safeParse({
      entries: [
        {
          id: "daily-2026-02-24",
          date: "2026-02-24",
          title: "Daily quality-of-life note",
          notes: "Spent time resting comfortably and showed interest in routine activities.",
          tags: ["daily-life", "comfort-window"],
          createdAt: "2026-02-24T08:00:00.000Z",
          updatedAt: "2026-02-24T20:00:00.000Z"
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });
});
