import { afterEach, describe, expect, it, vi } from "vitest";

import { DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT } from "@/lib/board-layout";
import {
  getDashboardPayload,
  getDashboardVisualPayload,
  getLabWorkbenchPayload,
  getMainboardPayload,
  getQuickViewPayload,
  getRecentIssues,
  listLogs
} from "@/lib/data";

afterEach(() => {
  vi.useRealTimers();
});

describe("content-backed data layer", () => {
  it("exports canonical 10-box board manifest", () => {
    const boxes = DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT.boxes;
    expect(DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT.preset).toBe("desktop_1440_no_scroll");
    expect(boxes).toHaveLength(10);
    expect(new Set(boxes.map((box) => box.id)).size).toBe(10);
    expect(boxes.map((box) => box.id)).toEqual([
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
    ]);
  });

  it("lists logs in reverse chronological order", async () => {
    const logs = await listLogs({ limit: 20 });
    expect(logs.length).toBeGreaterThan(0);

    for (let index = 1; index < logs.length; index += 1) {
      expect(logs[index - 1].date >= logs[index].date).toBe(true);
    }
  });

  it("returns public issue snippets in dashboard payload", async () => {
    const payload = await getDashboardPayload("7d");
    expect(payload.range).toBe("7d");
    expect(payload.issueInsights.windowDays).toBe(7);
    expect(payload.issueInsights.topIssues.length).toBeGreaterThan(0);
    expect(payload.issueInsights.topIssues[0]?.latestSnippet).toBeTypeOf("string");
  });

  it("returns no-logs fallback for box-01 when selected range is empty", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));

    const payload = await getMainboardPayload("7d");
    expect(payload.kpis.latestLogDate.value).toBe("No logs in range");
  });

  it("returns recent issue list with snippets", async () => {
    const issues = await getRecentIssues({ days: 7, limit: 5 });
    expect(issues.windowDays).toBe(7);
    expect(issues.topIssues.length).toBeGreaterThan(0);
    expect(issues.topIssues[0]?.latestSnippet).toBeTypeOf("string");
  });

  it("builds quick-view payload with unified feed", async () => {
    const payload = await getQuickViewPayload("30d");

    expect(payload.dashboard.range).toBe("30d");
    expect(payload.logs.length).toBeGreaterThan(0);
    expect(payload.dailyLifeEntries.length).toBeGreaterThan(0);
    expect(payload.clinicalEvents.length).toBeGreaterThan(0);
    expect(payload.feed.length).toBeGreaterThan(0);
    expect(payload.feed.some((item) => item.type === "milestone_log")).toBe(true);
    expect(payload.feed.some((item) => item.type === "daily_life")).toBe(true);
    expect(payload.feed.some((item) => item.type === "clinical_event")).toBe(true);

    for (let index = 1; index < payload.feed.length; index += 1) {
      expect(payload.feed[index - 1].dateTime >= payload.feed[index].dateTime).toBe(true);
    }
  });

  it("builds dashboard visual payload with text-log thread only", async () => {
    const payload = await getDashboardVisualPayload({
      range: "30d",
      threadPage: 1
    });

    expect(payload.dashboard.range).toBe("30d");
    expect(payload.threadItems.length).toBeGreaterThan(0);
    expect(payload.threadItems.every((item) => item.type === "daily_life" || item.type === "milestone_log")).toBe(true);
    expect(payload.visibleThreadItems.length).toBeGreaterThan(0);
    expect(payload.selectedItem?.id).toBe(payload.visibleThreadItems[0]?.id);
    expect(payload.inspectorDetail?.id).toBe(payload.selectedItem?.id);
    expect(payload.threadPagination.page).toBe(1);
    expect(payload.boardLayout.boxes).toHaveLength(10);
  });

  it("resolves selected thread item and falls back deterministically", async () => {
    const base = await getDashboardVisualPayload({
      range: "30d",
      threadPage: 1
    });
    const target = base.visibleThreadItems[1] ?? base.visibleThreadItems[0];
    expect(target).toBeDefined();

    const selectedPayload = await getDashboardVisualPayload({
      range: "30d",
      threadPage: 1,
      selected: target?.id
    });
    expect(selectedPayload.selectedItem?.id).toBe(target?.id);
    expect(selectedPayload.inspectorDetail?.id).toBe(target?.id);

    const fallbackPayload = await getDashboardVisualPayload({
      range: "30d",
      threadPage: 1,
      selected: "missing-id"
    });
    expect(fallbackPayload.selectedItem?.id).toBe(fallbackPayload.visibleThreadItems[0]?.id);
  });

  it("clamps thread pagination bounds", async () => {
    const lowPagePayload = await getDashboardVisualPayload({
      range: "30d",
      threadPage: -12
    });
    expect(lowPagePayload.threadPagination.page).toBe(1);

    const highPagePayload = await getDashboardVisualPayload({
      range: "30d",
      threadPage: 9999
    });
    expect(highPagePayload.threadPagination.page).toBe(highPagePayload.threadPagination.totalPages);
    expect(highPagePayload.threadPagination.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("returns lab workbench defaults for /lab", async () => {
    const payload = await getLabWorkbenchPayload();

    expect(payload.activeBoxId).toBe("box-01");
    expect(payload.range).toBe("all");
    expect(payload.tabs).toHaveLength(10);
    expect(payload.tabs.every((tab) => tab.id.startsWith("box-"))).toBe(true);
    expect(payload.tabs.filter((tab) => tab.implemented).map((tab) => tab.id)).toEqual(["box-01", "box-02", "box-03"]);
    expect(payload.box01).toBeDefined();
    expect(payload.box01?.healthyReferenceLb).toBe(8);
    expect(payload.box01?.series.length).toBeGreaterThan(0);
  });

  it("returns directional payloads for implemented lab box-02 and box-03", async () => {
    const box02Payload = await getLabWorkbenchPayload({
      box: "box-02",
      range: "30d"
    });
    expect(box02Payload.activeBoxId).toBe("box-02");
    expect(box02Payload.box02).toBeDefined();
    expect(box02Payload.box02?.rows.length).toBeGreaterThan(0);
    expect(box02Payload.box02?.healthyBaselineZone).toBe(0);
    expect(box02Payload.box02?.rows.some((row) => row.mappingKind === "iris_staged")).toBe(true);
    expect(box02Payload.box02?.legend.some((item) => item.assumed === true)).toBe(true);

    const box03Payload = await getLabWorkbenchPayload({
      box: "box-03",
      range: "30d"
    });
    expect(box03Payload.activeBoxId).toBe("box-03");
    expect(box03Payload.box03).toBeDefined();
    expect(box03Payload.box03?.rows.length).toBeGreaterThan(0);
    expect(box03Payload.box03?.healthyBaselineZone).toBe(0);
    expect(box03Payload.box03?.rows.every((row) => row.metricKey !== "creatinine")).toBe(true);
    expect(box03Payload.box03?.legend.some((item) => item.assumed === true)).toBe(true);
  });

  it("keeps combined implemented boxes present even when active lab tab is unimplemented", async () => {
    const payload = await getLabWorkbenchPayload({
      box: "box-07",
      range: "7d"
    });

    expect(payload.activeBoxId).toBe("box-07");
    expect(payload.range).toBe("7d");
    expect(payload.box01).toBeDefined();
    expect(payload.box02).toBeDefined();
    expect(payload.box03).toBeDefined();
  });

  it("falls back to box-01 when lab box query is invalid", async () => {
    const payload = await getLabWorkbenchPayload({
      box: "box-99",
      range: "30d"
    });

    expect(payload.activeBoxId).toBe("box-01");
    expect(payload.box01).toBeDefined();
  });
});
