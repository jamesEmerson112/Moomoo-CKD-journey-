import { describe, expect, it } from "vitest";

import { computeSoftAlerts } from "@/lib/alerts";
import type { FullDailyLogInput, ThresholdSettings } from "@/lib/contracts";

const thresholds: ThresholdSettings = {
  waterIntakeMinOz: 12,
  appetiteMin: 2,
  energyMin: 2,
  vomitingMax: 1,
  urinationMin: 1,
  stoolMin: 1,
  weightLossPctWarn: 5
};

describe("computeSoftAlerts", () => {
  it("returns no alerts for healthy values", () => {
    const log: FullDailyLogInput = {
      mode: "full",
      date: "2026-02-23",
      waterIntakeOz: 15,
      appetiteScore: 4,
      energyScore: 4,
      vomitingCount: 0,
      urinationScore: 2,
      stoolScore: 2,
      medications: []
    };

    const alerts = computeSoftAlerts(log, thresholds, 12);

    expect(alerts).toHaveLength(0);
  });

  it("flags threshold violations including weight change", () => {
    const log: FullDailyLogInput = {
      mode: "full",
      date: "2026-02-24",
      waterIntakeOz: 6,
      appetiteScore: 1,
      energyScore: 1,
      vomitingCount: 3,
      urinationScore: 0,
      stoolScore: 0,
      medications: [],
      weightLb: 10.8
    };

    const alerts = computeSoftAlerts(log, thresholds, 12);

    expect(alerts.map((a) => a.metric)).toEqual(
      expect.arrayContaining([
        "waterIntakeOz",
        "appetiteScore",
        "energyScore",
        "vomitingCount",
        "urinationScore",
        "stoolScore",
        "weightLb"
      ])
    );
  });
});
