import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MainboardGrid } from "@/components/dashboard";
import { deriveAlertChipWindow } from "@/components/dashboard/boxes";
import { DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT } from "@/lib/board-layout";
import type { HybridAlertChip, MainboardPayload } from "@/lib/contracts";

function makeAlert(index: number): HybridAlertChip {
  return {
    id: `alert-${index}`,
    triggerId: "appetite_crisis",
    severity: "warning",
    label: `Alert ${index}`,
    message: "Test alert",
    date: `2026-02-${String(index + 10).padStart(2, "0")}`,
    source: "nlp"
  };
}

describe("deriveAlertChipWindow", () => {
  it("caps visible alerts at 6 and returns overflow count", () => {
    const alerts = Array.from({ length: 8 }, (_, index) => makeAlert(index + 1));
    const window = deriveAlertChipWindow(alerts);

    expect(window.visibleAlerts).toHaveLength(6);
    expect(window.hiddenAlertCount).toBe(2);
    expect(window.visibleAlerts[0]?.id).toBe("alert-1");
    expect(window.visibleAlerts[5]?.id).toBe("alert-6");
  });

  it("returns all alerts when below cap", () => {
    const alerts = [makeAlert(1), makeAlert(2)];
    const window = deriveAlertChipWindow(alerts);

    expect(window.visibleAlerts).toHaveLength(2);
    expect(window.hiddenAlertCount).toBe(0);
  });
});

describe("MainboardGrid markup", () => {
  it("renders exactly 10 canonical data-box-id containers", () => {
    const payload: MainboardPayload = {
      range: "30d",
      kpis: {
        latestLogDate: { value: "2026-02-25", badge: "Text-derived" },
        weightDelta: {
          value: "+0.10 lb",
          detail: "+1.2%",
          badge: "Numeric (weight)",
          latestWeightLb: 6.0,
          baselineWeightLb: 5.9,
          deltaLb: 0.1,
          deltaPct: 1.2
        },
        issueBurden: {
          value: "34",
          detail: "Raw 4.20",
          badge: "NLP-derived",
          index: 34,
          rawScore: 4.2,
          referencePeak: 12.4
        },
        loggingConsistency: {
          value: "57%",
          detail: "3/7 assumed stable",
          badge: "Coverage",
          percent: 57,
          loggedDays: 4,
          gapDays: 3,
          rangeDays: 7
        }
      },
      trendSeries: [],
      hybridAlerts: [],
      issueRank: [],
      issueDailyWeightedSeries: [],
      clinicalEventsRecent: [],
      measurementSnapshot: [],
      boardLayout: DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT
    };

    const markup = renderToStaticMarkup(createElement(MainboardGrid, { payload }));
    const boxIds = [
      "box-01",
      "box-02",
      "box-03",
      "box-04",
      "box-05",
      "box-06",
      "box-07",
      "box-08",
      "box-09",
      "box-10"
    ];
    for (const boxId of boxIds) {
      expect(markup).toContain(`data-box-id="${boxId}"`);
    }

    const matches = markup.match(/data-box-id="box-\d{2}"/g) ?? [];
    expect(matches).toHaveLength(10);
  });
});
