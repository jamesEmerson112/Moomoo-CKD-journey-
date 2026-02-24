import type { IssueInsights } from "@/lib/contracts";

const NEGATION_TOKENS = new Set(["no", "not", "without", "denies", "none"]);

export interface NlpLexiconTerm {
  id: string;
  issueKey: string;
  label: string;
  phrase: string;
  normalizedPhrase: string;
  weight: number;
}

interface MatchedTerm extends NlpLexiconTerm {
  tokenLength: number;
}

export interface ExtractedIssueMention {
  issueKey: string;
  label: string;
  termId: string;
  mentionCount: number;
  weightedScore: number;
  evidenceSnippet: string | null;
}

export interface MentionRowForAggregation {
  dailyLogId: string;
  issueKey: string;
  label: string;
  mentionCount: number;
  weightedScore: number;
  evidenceSnippet: string | null;
  date: string;
}

export const CKD_SEED_ISSUE_TERMS: Array<
  Pick<NlpLexiconTerm, "issueKey" | "label" | "phrase" | "weight">
> = [
  { issueKey: "low-appetite", label: "Low Appetite", phrase: "low appetite", weight: 1.2 },
  { issueKey: "low-appetite", label: "Low Appetite", phrase: "not eating", weight: 1.3 },
  { issueKey: "low-appetite", label: "Low Appetite", phrase: "reduced appetite", weight: 1.1 },
  { issueKey: "vomiting", label: "Vomiting", phrase: "vomiting", weight: 1.5 },
  { issueKey: "vomiting", label: "Vomiting", phrase: "throwing up", weight: 1.6 },
  { issueKey: "nausea", label: "Nausea", phrase: "nausea", weight: 1.2 },
  { issueKey: "lethargy", label: "Lethargy", phrase: "low energy", weight: 1.3 },
  { issueKey: "lethargy", label: "Lethargy", phrase: "very low energy", weight: 1.5 },
  { issueKey: "lethargy", label: "Lethargy", phrase: "lethargic", weight: 1.4 },
  { issueKey: "dehydration-risk", label: "Dehydration Risk", phrase: "not drinking", weight: 1.5 },
  { issueKey: "dehydration-risk", label: "Dehydration Risk", phrase: "dehydrated", weight: 1.6 },
  { issueKey: "urination-change", label: "Urination Change", phrase: "less urine", weight: 1.2 },
  { issueKey: "urination-change", label: "Urination Change", phrase: "increased urination", weight: 1.1 },
  { issueKey: "stool-change", label: "Stool Change", phrase: "diarrhea", weight: 1.3 },
  { issueKey: "stool-change", label: "Stool Change", phrase: "constipation", weight: 1.3 },
  { issueKey: "pain-discomfort", label: "Pain or Discomfort", phrase: "pain", weight: 1.4 },
  { issueKey: "pain-discomfort", label: "Pain or Discomfort", phrase: "uncomfortable", weight: 1.2 }
];

export function normalizePhrase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string): string[] {
  const normalized = normalizePhrase(input);
  if (!normalized) {
    return [];
  }
  return normalized.split(" ");
}

function hasNegationBefore(tokens: string[], startIndex: number): boolean {
  const from = Math.max(0, startIndex - 3);
  for (let index = from; index < startIndex; index += 1) {
    if (NEGATION_TOKENS.has(tokens[index])) {
      return true;
    }
  }
  return false;
}

function createPhraseMap(terms: NlpLexiconTerm[]): Map<string, MatchedTerm[]> {
  const map = new Map<string, MatchedTerm[]>();

  for (const term of terms) {
    const normalizedPhrase = normalizePhrase(term.normalizedPhrase || term.phrase);
    if (!normalizedPhrase) {
      continue;
    }

    const list = map.get(normalizedPhrase) ?? [];
    list.push({
      ...term,
      normalizedPhrase,
      tokenLength: normalizedPhrase.split(" ").length
    });
    map.set(normalizedPhrase, list);
  }

  return map;
}

function pickBestTerm(candidates: MatchedTerm[]): MatchedTerm {
  return [...candidates].sort((a, b) => b.weight - a.weight || a.issueKey.localeCompare(b.issueKey))[0];
}

function snippetAround(notes: string, phrase: string): string | null {
  const firstToken = phrase.split(" ")[0];
  const lower = notes.toLowerCase();
  const tokenIndex = lower.indexOf(firstToken);

  if (tokenIndex < 0) {
    return notes.replace(/\s+/g, " ").trim().slice(0, 140) || null;
  }

  const from = Math.max(0, tokenIndex - 40);
  const to = Math.min(notes.length, tokenIndex + 100);
  return notes
    .slice(from, to)
    .replace(/\s+/g, " ")
    .trim();
}

export function extractIssueMentionsFromText(
  notes: string,
  terms: NlpLexiconTerm[]
): ExtractedIssueMention[] {
  const tokens = tokenize(notes);
  if (tokens.length === 0 || terms.length === 0) {
    return [];
  }

  const phraseMap = createPhraseMap(terms);
  const matches: Array<{ issueKey: string; label: string; termId: string; phrase: string; weight: number }> = [];

  let index = 0;
  while (index < tokens.length) {
    let matched = false;

    for (let len = 3; len >= 1; len -= 1) {
      if (index + len > tokens.length) {
        continue;
      }

      const phrase = tokens.slice(index, index + len).join(" ");
      const candidates = phraseMap.get(phrase);
      if (!candidates || candidates.length === 0) {
        continue;
      }

      if (hasNegationBefore(tokens, index)) {
        continue;
      }

      const term = pickBestTerm(candidates);
      matches.push({
        issueKey: term.issueKey,
        label: term.label,
        termId: term.id,
        phrase,
        weight: term.weight
      });
      index += len;
      matched = true;
      break;
    }

    if (!matched) {
      index += 1;
    }
  }

  const byIssue = new Map<string, ExtractedIssueMention>();

  for (const match of matches) {
    const existing = byIssue.get(match.issueKey);
    if (!existing) {
      byIssue.set(match.issueKey, {
        issueKey: match.issueKey,
        label: match.label,
        termId: match.termId,
        mentionCount: 1,
        weightedScore: match.weight,
        evidenceSnippet: snippetAround(notes, match.phrase)
      });
      continue;
    }

    existing.mentionCount += 1;
    existing.weightedScore += match.weight;
  }

  return [...byIssue.values()].sort((a, b) => b.weightedScore - a.weightedScore || a.issueKey.localeCompare(b.issueKey));
}

interface AggregateOptions {
  windowDays: number;
  limit: number;
  includeSnippets: boolean;
  totalAnalyzedLogs: number;
}

export function aggregateIssueInsights(
  rows: MentionRowForAggregation[],
  options: AggregateOptions
): IssueInsights {
  const byIssue = new Map<
    string,
    { label: string; count: number; weightedScore: number; lastSeenDate: string; latestSnippet: string | null }
  >();
  const byDate = new Map<string, Record<string, number>>();

  for (const row of rows) {
    const issue = byIssue.get(row.issueKey) ?? {
      label: row.label,
      count: 0,
      weightedScore: 0,
      lastSeenDate: row.date,
      latestSnippet: null
    };

    issue.count += row.mentionCount;
    issue.weightedScore += row.weightedScore;

    if (row.date > issue.lastSeenDate) {
      issue.lastSeenDate = row.date;
      issue.latestSnippet = row.evidenceSnippet;
    } else if (!issue.latestSnippet && row.evidenceSnippet) {
      issue.latestSnippet = row.evidenceSnippet;
    }

    byIssue.set(row.issueKey, issue);

    const dateCounts = byDate.get(row.date) ?? {};
    dateCounts[row.issueKey] = (dateCounts[row.issueKey] ?? 0) + row.mentionCount;
    byDate.set(row.date, dateCounts);
  }

  const topIssues = [...byIssue.entries()]
    .sort((a, b) => {
      const scoreDiff = b[1].weightedScore - a[1].weightedScore;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return b[1].lastSeenDate.localeCompare(a[1].lastSeenDate);
    })
    .slice(0, options.limit)
    .map(([issueKey, value]) => ({
      issueKey,
      label: value.label,
      count: value.count,
      lastSeenDate: value.lastSeenDate,
      latestSnippet: options.includeSnippets ? value.latestSnippet : undefined
    }));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dailySeries = Array.from({ length: options.windowDays }, (_, idx) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (options.windowDays - 1 - idx));
    const iso = date.toISOString().slice(0, 10);

    return {
      date: iso,
      counts: byDate.get(iso) ?? {}
    };
  });

  return {
    windowDays: options.windowDays,
    topIssues,
    dailySeries,
    totalAnalyzedLogs: options.totalAnalyzedLogs
  };
}
