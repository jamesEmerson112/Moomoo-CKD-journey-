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

describe("NLP edge cases", () => {
  const terms = [
    {
      id: "t1",
      issueKey: "vomiting",
      label: "Vomiting",
      phrase: "vomiting",
      normalizedPhrase: normalizePhrase("vomiting"),
      weight: 1.5
    }
  ];

  it("returns empty for empty string", () => {
    expect(extractIssueMentionsFromText("", terms)).toEqual([]);
  });

  it("returns empty for whitespace-only string", () => {
    expect(extractIssueMentionsFromText("   \n\t  ", terms)).toEqual([]);
  });

  it("returns empty when all matches are negated", () => {
    expect(extractIssueMentionsFromText("no vomiting today", terms)).toEqual([]);
    expect(extractIssueMentionsFromText("not vomiting at all", terms)).toEqual([]);
    expect(extractIssueMentionsFromText("denies vomiting", terms)).toEqual([]);
  });

  it("produces snippet from notes shorter than context window", () => {
    const results = extractIssueMentionsFromText("vomiting", terms);
    expect(results).toHaveLength(1);
    expect(results[0]?.evidenceSnippet).toBe("vomiting");
  });

  it("returns fallback snippet when phrase token not found in original casing", () => {
    const unicodeTerms = [
      {
        id: "t-special",
        issueKey: "test-issue",
        label: "Test Issue",
        phrase: "café pain",
        normalizedPhrase: normalizePhrase("café pain"),
        weight: 1
      }
    ];
    const results = extractIssueMentionsFromText("Had café pain this morning after food", unicodeTerms);
    expect(results).toHaveLength(1);
    expect(results[0]?.evidenceSnippet).toBeTruthy();
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
