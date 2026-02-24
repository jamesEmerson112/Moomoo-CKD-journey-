import { describe, expect, it } from "vitest";

import { aggregateIssueInsights, extractIssueMentionsFromText, normalizePhrase } from "@/lib/nlp";

describe("NLP extraction", () => {
  const terms = [
    {
      id: "t1",
      issueKey: "low-appetite",
      label: "Low Appetite",
      phrase: "low appetite",
      normalizedPhrase: normalizePhrase("low appetite"),
      weight: 1
    },
    {
      id: "t2",
      issueKey: "vomiting",
      label: "Vomiting",
      phrase: "throwing up",
      normalizedPhrase: normalizePhrase("throwing up"),
      weight: 1.5
    },
    {
      id: "t3",
      issueKey: "lethargy",
      label: "Lethargy",
      phrase: "very low energy",
      normalizedPhrase: normalizePhrase("very low energy"),
      weight: 1.5
    }
  ];

  it("extracts longest phrase matches and scores", () => {
    const results = extractIssueMentionsFromText(
      "Momoo had very low energy and low appetite today.",
      terms
    );

    expect(results.map((r) => r.issueKey)).toEqual(expect.arrayContaining(["lethargy", "low-appetite"]));
    expect(results.find((r) => r.issueKey === "lethargy")?.weightedScore).toBe(1.5);
  });

  it("excludes negated matches", () => {
    const results = extractIssueMentionsFromText("No vomiting and not low appetite today.", terms);
    expect(results).toHaveLength(0);
  });
});

describe("issue insight aggregation", () => {
  it("ranks by weighted score then date and masks snippets for public", () => {
    const insights = aggregateIssueInsights(
      [
        {
          dailyLogId: "d1",
          issueKey: "vomiting",
          label: "Vomiting",
          mentionCount: 2,
          weightedScore: 3,
          evidenceSnippet: "vomiting overnight",
          date: "2026-02-23"
        },
        {
          dailyLogId: "d2",
          issueKey: "low-appetite",
          label: "Low Appetite",
          mentionCount: 2,
          weightedScore: 2,
          evidenceSnippet: "low appetite morning",
          date: "2026-02-24"
        }
      ],
      { windowDays: 7, limit: 5, includeSnippets: false, totalAnalyzedLogs: 2 }
    );

    expect(insights.topIssues[0]?.issueKey).toBe("vomiting");
    expect(insights.topIssues[0]?.latestSnippet).toBeUndefined();
    expect(insights.totalAnalyzedLogs).toBe(2);
  });
});
