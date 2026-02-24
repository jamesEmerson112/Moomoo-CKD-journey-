import { describe, expect, it } from "vitest";

import { getDashboardPayload, getQuickViewPayload, getRecentIssues, listLogs } from "@/lib/data";

describe("content-backed data layer", () => {
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
});
