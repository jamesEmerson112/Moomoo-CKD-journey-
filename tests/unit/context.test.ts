import { describe, expect, it } from "vitest";

import type { DailyLogRecord } from "@/lib/contracts";
import { toContextEvents } from "@/lib/context";

describe("toContextEvents", () => {
  it("creates stable chronological context payload", () => {
    const logs: DailyLogRecord[] = [
      {
        id: "l2",
        mode: "quick_text",
        date: "2026-02-24",
        waterIntakeOz: null,
        appetiteScore: null,
        energyScore: null,
        vomitingCount: null,
        urinationScore: null,
        stoolScore: null,
        medications: [{ name: "Renal support", dose: "1 tab", taken: true }],
        weightLb: 11,
        notes: "Good appetite",
        createdBy: "owner@example.com",
        createdAt: "2026-02-24T08:00:00.000Z",
        updatedAt: "2026-02-24T08:00:00.000Z"
      }
    ];

    const events = toContextEvents(logs);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "daily_log",
      date: "2026-02-24"
    });
    expect(events[0].canonicalText).toContain("notes: Good appetite");
  });
});
