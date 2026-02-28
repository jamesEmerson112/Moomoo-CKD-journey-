import { describe, expect, it } from "vitest";

import {
  deriveBox01Workbench,
  deriveBox02Workbench,
  deriveBox03Workbench,
  deriveBurdenWindow,
  deriveConsistencyPct,
  deriveDailyBurdenSeries,
  deriveHybridAlertsFromNotes,
  deriveWeightDelta,
  deriveWeightedIssueSeries
} from "@/content/derive";
import { getMainboardPayload } from "@/lib/data";
import type { ContentClinicalEvent, ContentLexiconTerm, DailyLogRecord } from "@/lib/contracts";

function makeLog(input: {
  id: string;
  date: string;
  notes?: string | null;
  weightLb?: number | null;
  alerts?: DailyLogRecord["alerts"];
}): DailyLogRecord {
  return {
    id: input.id,
    date: input.date,
    mode: "quick_text",
    createdBy: "test",
    createdAt: `${input.date}T09:00:00.000Z`,
    updatedAt: `${input.date}T09:00:00.000Z`,
    medications: [],
    waterIntakeOz: null,
    appetiteScore: null,
    energyScore: null,
    vomitingCount: null,
    urinationScore: null,
    stoolScore: null,
    weightLb: input.weightLb ?? null,
    notes: input.notes ?? null,
    alerts: input.alerts ?? []
  };
}

const LEXICON: ContentLexiconTerm[] = [
  {
    id: "term-vomit",
    issueKey: "vomiting",
    label: "Vomiting",
    phrase: "vomiting",
    normalizedPhrase: "vomiting",
    weight: 1.5,
    isActive: true
  },
  {
    id: "term-low-appetite",
    issueKey: "low-appetite",
    label: "Low Appetite",
    phrase: "low appetite",
    normalizedPhrase: "low appetite",
    weight: 1.2,
    isActive: true
  }
];

const ANCHOR_DATE = new Date("2026-02-25T00:00:00.000Z");

describe("mainboard derivation helpers", () => {
  it("derives weight delta with nearest-earlier baseline and in-range fallback", () => {
    const logs = [
      makeLog({ id: "a", date: "2026-01-20", weightLb: 10 }),
      makeLog({ id: "b", date: "2026-02-10", weightLb: 9.5 }),
      makeLog({ id: "c", date: "2026-02-20", weightLb: 9.0 })
    ];

    const withEarlierBaseline = deriveWeightDelta({
      logs,
      days: 30,
      anchorDate: ANCHOR_DATE
    });
    expect(withEarlierBaseline.baselineWeightLb).toBe(10);
    expect(withEarlierBaseline.latestWeightLb).toBe(9);
    expect(withEarlierBaseline.deltaLb).toBeCloseTo(-1);

    const inRangeOnly = deriveWeightDelta({
      logs: logs.filter((log) => log.date >= "2026-02-01"),
      days: 30,
      anchorDate: ANCHOR_DATE
    });
    expect(inRangeOnly.baselineWeightLb).toBe(9.5);
    expect(inRangeOnly.latestWeightLb).toBe(9);
    expect(inRangeOnly.deltaLb).toBeCloseTo(-0.5);
  });

  it("derives burden window and daily burden series with zero-safe normalization", () => {
    const logs = [
      makeLog({ id: "l1", date: "2026-02-22", notes: "vomiting and low appetite today" }),
      makeLog({ id: "l2", date: "2026-02-23", notes: "vomiting again" }),
      makeLog({ id: "l3", date: "2026-02-24", notes: "rested better" })
    ];

    const window = deriveBurdenWindow({
      logs,
      lexiconTerms: LEXICON,
      days: 7,
      anchorDate: ANCHOR_DATE
    });
    expect(window.rawScore).toBeGreaterThan(0);
    expect(window.index).toBeGreaterThanOrEqual(0);
    expect(window.index).toBeLessThanOrEqual(100);

    const series = deriveDailyBurdenSeries({
      logs,
      lexiconTerms: LEXICON,
      days: 7,
      anchorDate: ANCHOR_DATE
    });
    expect(series).toHaveLength(7);
    expect(series.some((point) => point.rawScore > 0)).toBe(true);
    expect(series.every((point) => point.index >= 0 && point.index <= 100)).toBe(true);
  });

  it("computes routine stability from gap days in range", () => {
    const logs = [
      makeLog({ id: "d1", date: "2026-02-21" }),
      makeLog({ id: "d2", date: "2026-02-23" }),
      makeLog({ id: "d3", date: "2026-02-24" })
    ];

    const consistency = deriveConsistencyPct({
      logs,
      days: 7,
      anchorDate: ANCHOR_DATE
    });

    expect(consistency.loggedDays).toBe(3);
    expect(consistency.gapDays).toBe(4);
    expect(consistency.rangeDays).toBe(7);
    expect(consistency.percent).toBe(57);
  });

  it("derives curated hybrid alerts and de-duplicates trigger spam", () => {
    const logs = [
      makeLog({
        id: "h1",
        date: "2026-02-24",
        notes: "faint blood on lip and oral discomfort with tongue use reduction"
      }),
      makeLog({
        id: "h2",
        date: "2026-02-24",
        notes: "blood around mouth persisted and kibble chewing was hard"
      }),
      makeLog({
        id: "h3",
        date: "2026-02-23",
        notes: "respiratory spike and rapid breathing after stress"
      })
    ];

    const alerts = deriveHybridAlertsFromNotes({
      logs,
      lexiconTerms: LEXICON,
      days: 7,
      anchorDate: ANCHOR_DATE
    });

    expect(alerts.some((alert) => alert.triggerId === "oral_bleeding" && alert.severity === "critical")).toBe(true);
    expect(alerts.some((alert) => alert.triggerId === "oral_dysfunction" && alert.severity === "warning")).toBe(true);
    expect(alerts.some((alert) => alert.triggerId === "respiratory_stress" && alert.severity === "critical")).toBe(true);
    expect(alerts.filter((alert) => alert.triggerId === "oral_bleeding")).toHaveLength(1);
  });

  it("builds weighted issue ranking and daily weighted series", () => {
    const logs = [
      makeLog({ id: "w1", date: "2026-02-22", notes: "vomiting low appetite vomiting" }),
      makeLog({ id: "w2", date: "2026-02-23", notes: "low appetite" })
    ];

    const issueData = deriveWeightedIssueSeries({
      logs,
      lexiconTerms: LEXICON,
      days: 7,
      anchorDate: ANCHOR_DATE,
      limit: 5
    });

    expect(issueData.rank.length).toBeGreaterThan(0);
    expect(issueData.rank[0]?.weightedScore).toBeGreaterThan(0);
    expect(issueData.dailySeries).toHaveLength(7);
    expect(issueData.dailySeries.some((point) => Object.values(point.scores).some((value) => value > 0))).toBe(true);
  });

  it("builds a merged box-01 weight series in pounds", () => {
    const logs = [
      makeLog({ id: "w0", date: "2026-02-01", weightLb: 10 }),
      makeLog({ id: "w1", date: "2026-02-20", weightLb: 9.4 }),
      makeLog({ id: "w2", date: "2026-02-24", weightLb: 8.1 })
    ];

    const result = deriveBox01Workbench({
      logs,
      clinicalEvents: [],
      days: 7,
      anchorDate: ANCHOR_DATE
    });

    expect(result.healthyReferenceLb).toBe(8);
    expect(result.series.map((point) => point.date)).toEqual(["2026-02-20", "2026-02-24"]);
    expect(result.series.map((point) => point.weightLb)).toEqual([9.4, 8.1]);
    expect(result.series.every((point) => point.source === "merged")).toBe(true);
  });

  it("prefers log weight over clinical event on same-day collisions", () => {
    const logs = [makeLog({ id: "w-log", date: "2026-02-24", weightLb: 8.6 })];
    const events: ContentClinicalEvent[] = [
      {
        id: "e-a",
        date: "2026-01-10",
        category: "lab",
        title: "Panel",
        summary: "Panel",
        source: "specialist_summary",
        confidence: "confirmed",
        measurements: [
          { key: "weight-lb", label: "Body Weight", value: 8.7, comparator: "approx", confidence: "confirmed", unit: "lb" }
        ]
      },
      {
        id: "e-b",
        date: "2026-02-24",
        category: "lab",
        title: "Panel",
        summary: "Panel",
        source: "specialist_summary",
        confidence: "confirmed",
        measurements: [
          { key: "weight-lb", label: "Body Weight", value: 8.5, comparator: "approx", confidence: "confirmed", unit: "lb" }
        ]
      }
    ];

    const result = deriveBox01Workbench({
      logs,
      clinicalEvents: events,
      days: 30,
      anchorDate: ANCHOR_DATE
    });

    expect(result.series).toEqual([
      {
        date: "2026-02-24",
        source: "merged",
        weightLb: 8.6
      }
    ]);
  });

  it("maps box-02 higher-worse metrics with IRIS + relative severity", () => {
    const events: ContentClinicalEvent[] = [
      {
        id: "b2-a",
        date: "2026-01-20",
        category: "lab",
        title: "Panel",
        summary: "Panel",
        source: "specialist_summary",
        confidence: "confirmed",
        measurements: [
          { key: "creatinine", label: "Creatinine", value: 2.4, comparator: "exact", confidence: "confirmed", unit: "mg/dL" },
          { key: "sdma", label: "SDMA", value: 30, comparator: "exact", confidence: "confirmed", unit: "ug/dL" },
          { key: "bun", label: "BUN", value: 60, comparator: "exact", confidence: "confirmed", unit: "mg/dL" }
        ]
      },
      {
        id: "b2-b",
        date: "2026-02-24",
        category: "lab",
        title: "Panel",
        summary: "Panel",
        source: "specialist_summary",
        confidence: "confirmed",
        measurements: [
          { key: "creatinine", label: "Creatinine", value: 5.6, comparator: "exact", confidence: "confirmed", unit: "mg/dL" },
          { key: "bun", label: "BUN", value: 120, comparator: "gt", confidence: "confirmed", unit: "mg/dL" }
        ]
      }
    ];

    const result = deriveBox02Workbench({
      clinicalEvents: events,
      days: 30,
      anchorDate: ANCHOR_DATE
    });

    const creatinine = result.rows.find((row) => row.metricKey === "creatinine");
    const bun = result.rows.find((row) => row.metricKey === "bun");
    expect(creatinine?.mappingKind).toBe("iris_staged");
    expect(creatinine?.severityZone).toBe(4);
    expect(bun?.mappingKind).toBe("relative_non_staged");
    expect(bun?.valueText.startsWith(">")).toBe(true);
  });

  it("maps box-03 lower-worse metrics with stale fallback when range is empty", () => {
    const events: ContentClinicalEvent[] = [
      {
        id: "b3-a",
        date: "2026-02-24",
        category: "lab",
        title: "Panel",
        summary: "Panel",
        source: "specialist_summary",
        confidence: "confirmed",
        measurements: [
          { key: "albumin", label: "Albumin", value: 1.6, comparator: "exact", confidence: "confirmed", unit: "g/dL" },
          { key: "hct", label: "Hematocrit", value: 14, comparator: "exact", confidence: "confirmed", unit: "%" }
        ]
      },
      {
        id: "b3-b",
        date: "2026-01-10",
        category: "lab",
        title: "Panel",
        summary: "Panel",
        source: "specialist_summary",
        confidence: "confirmed",
        measurements: [{ key: "albumin", label: "Albumin", value: 2.5, comparator: "exact", confidence: "confirmed", unit: "g/dL" }]
      }
    ];

    const result = deriveBox03Workbench({
      clinicalEvents: events,
      days: 7,
      anchorDate: new Date("2026-03-10T00:00:00.000Z")
    });

    const albumin = result.rows.find((row) => row.metricKey === "albumin");
    expect(albumin?.stale).toBe(true);
    expect(albumin?.mappingKind).toBe("relative_non_staged");
    expect(albumin?.severityZone).toBeGreaterThanOrEqual(1);
  });
});

describe("mainboard payload", () => {
  it("returns text-first payload contracts for mainboard boxes", async () => {
    const payload = await getMainboardPayload("30d");

    expect(payload.range).toBe("30d");
    expect(payload.kpis.latestLogDate.badge).toBe("Text-derived");
    expect(payload.kpis.issueBurden.badge).toBe("NLP-derived");
    expect(payload.kpis.loggingConsistency.badge).toBe("Coverage");
    expect(payload.trendSeries.length).toBe(30);
    expect(payload.hybridAlerts.length).toBeGreaterThan(0);
    expect(payload.issueRank.length).toBeGreaterThan(0);
    expect(payload.issueDailyWeightedSeries.length).toBe(30);
    expect(payload.clinicalEventsRecent.length).toBeLessThanOrEqual(6);
    expect(payload.measurementSnapshot.length).toBeLessThanOrEqual(6);
    expect(payload.boardLayout.boxes).toHaveLength(10);
  });
});
