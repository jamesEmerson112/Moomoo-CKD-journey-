import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as getAlerts } from "@/app/api/alerts/current/route";
import { GET as getContextEvents } from "@/app/api/context/events/route";
import { GET as getRecentIssues } from "@/app/api/issues/recent/route";
import { GET as getClinicalEvents } from "@/app/api/public/clinical-events/route";
import { GET as getDailyLife } from "@/app/api/public/daily-life/route";
import { GET as getPublicDashboard } from "@/app/api/public/dashboard/route";
import { GET as getPublicLogs } from "@/app/api/public/logs/route";

describe("API validation returns 400 on invalid input", () => {
  it("returns 400 for invalid dashboard range", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/dashboard?range=invalid");
    const response = await getPublicDashboard(req);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 for malformed date in logs", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/logs?from=not-a-date");
    const response = await getPublicLogs(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed date in clinical events", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/clinical-events?from=bad");
    const response = await getClinicalEvents(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed date in daily life", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/daily-life?from=bad");
    const response = await getDailyLife(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid limit in recent issues", async () => {
    const req = new NextRequest("http://localhost:3000/api/issues/recent?limit=-5");
    const response = await getRecentIssues(req);
    expect(response.status).toBe(400);
  });

  it("ignores unknown query params since only known keys are extracted", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/logs?from=2026-01-01&bogus=yes");
    const response = await getPublicLogs(req);
    expect(response.status).toBe(200);
  });

  it("returns 400 for malformed date in context events", async () => {
    const req = new NextRequest("http://localhost:3000/api/context/events?from=xyz");
    const response = await getContextEvents(req);
    expect(response.status).toBe(400);
  });
});

describe("read-only API routes", () => {
  it("returns public dashboard payload with issue insights", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/dashboard?range=7d");
    const response = await getPublicDashboard(req);
    const body = (await response.json()) as { issueInsights: { topIssues: Array<{ latestSnippet?: string }> } };

    expect(response.status).toBe(200);
    expect(body.issueInsights.topIssues.length).toBeGreaterThan(0);
    expect(body.issueInsights.topIssues[0]?.latestSnippet).toBeTypeOf("string");
  });

  it("filters public logs by date range", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/logs?from=2026-02-22&to=2026-02-24");
    const response = await getPublicLogs(req);
    const body = (await response.json()) as { logs: Array<{ date: string }> };

    expect(response.status).toBe(200);
    expect(body.logs.length).toBeGreaterThan(0);
    expect(body.logs.every((log) => log.date >= "2026-02-22" && log.date <= "2026-02-24")).toBe(true);
  });

  it("returns recent issues publicly", async () => {
    const req = new NextRequest("http://localhost:3000/api/issues/recent?range=7d&limit=5");
    const response = await getRecentIssues(req);
    const body = (await response.json()) as { topIssues: Array<{ latestSnippet?: string }> };

    expect(response.status).toBe(200);
    expect(body.topIssues.length).toBeGreaterThan(0);
    expect(body.topIssues[0]?.latestSnippet).toBeTypeOf("string");
  });

  it("returns current alerts", async () => {
    const response = await getAlerts();
    const body = (await response.json()) as { alerts: unknown[] };

    expect(response.status).toBe(200);
    expect(Array.isArray(body.alerts)).toBe(true);
  });

  it("returns context events", async () => {
    const req = new NextRequest("http://localhost:3000/api/context/events?from=2026-02-20&to=2026-02-24");
    const response = await getContextEvents(req);
    const body = (await response.json()) as { events: Array<{ type: string }> };

    expect(response.status).toBe(200);
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.events[0]?.type).toBe("daily_log");
  });

  it("returns structured clinical events for charting", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/clinical-events?from=2025-12-01&to=2026-02-24");
    const response = await getClinicalEvents(req);
    const body = (await response.json()) as {
      events: Array<{ category: string; measurements?: Array<{ key: string; comparator: string }> }>;
    };

    expect(response.status).toBe(200);
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.events.some((event) => event.category === "lab" || event.category === "er")).toBe(true);
    expect(
      body.events.some((event) =>
        (event.measurements ?? []).some((measurement) => measurement.key === "phosphorus" && measurement.comparator === "gt")
      )
    ).toBe(true);
  });

  it("returns separate daily-life entries feed", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/daily-life?from=2026-02-01&to=2026-02-24");
    const response = await getDailyLife(req);
    const body = (await response.json()) as { entries: unknown[] };

    expect(response.status).toBe(200);
    expect(Array.isArray(body.entries)).toBe(true);
  });
});
