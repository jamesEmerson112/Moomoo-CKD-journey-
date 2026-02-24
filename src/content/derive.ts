import { computeSoftAlerts } from "@/lib/alerts";
import type {
  AlertItem,
  ContentLexiconTerm,
  ContentLogEntry,
  DailyLogRecord,
  DashboardPayload,
  FullDailyLogInput,
  IssueInsights,
  ThresholdSettings
} from "@/lib/contracts";
import { parseRangeToDays, startDateForRange, toISODate } from "@/lib/date";
import {
  aggregateIssueInsights,
  extractIssueMentionsFromText,
  type MentionRowForAggregation,
  type NlpLexiconTerm
} from "@/lib/nlp";

export interface LogFilter {
  from?: string;
  to?: string;
  limit?: number;
}

function average(values: Array<number | null>): number | null {
  const usable = values.filter((value): value is number => typeof value === "number");
  if (usable.length === 0) {
    return null;
  }

  const total = usable.reduce((acc, value) => acc + value, 0);
  return Number((total / usable.length).toFixed(2));
}

function toNullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" ? value : null;
}

function normalizeLog(log: ContentLogEntry): DailyLogRecord {
  return {
    id: log.id,
    date: log.date,
    mode: log.mode,
    createdBy: log.createdBy,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
    medications: log.medications ?? [],
    waterIntakeOz: log.mode === "full" ? log.waterIntakeOz : toNullableNumber(log.waterIntakeOz),
    appetiteScore: log.mode === "full" ? log.appetiteScore : toNullableNumber(log.appetiteScore),
    energyScore: log.mode === "full" ? log.energyScore : toNullableNumber(log.energyScore),
    vomitingCount: log.mode === "full" ? log.vomitingCount : toNullableNumber(log.vomitingCount),
    urinationScore: log.mode === "full" ? log.urinationScore : toNullableNumber(log.urinationScore),
    stoolScore: log.mode === "full" ? log.stoolScore : toNullableNumber(log.stoolScore),
    weightLb: toNullableNumber(log.weightLb),
    notes: log.notes ?? null,
    alerts: []
  };
}

function sortLogsDescending(logs: DailyLogRecord[]): DailyLogRecord[] {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
}

function sortLogsAscending(logs: DailyLogRecord[]): DailyLogRecord[] {
  return [...logs].sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt));
}

function toEvaluableLog(log: DailyLogRecord): FullDailyLogInput | null {
  if (
    typeof log.waterIntakeOz !== "number" ||
    typeof log.appetiteScore !== "number" ||
    typeof log.energyScore !== "number" ||
    typeof log.vomitingCount !== "number" ||
    typeof log.urinationScore !== "number" ||
    typeof log.stoolScore !== "number"
  ) {
    return null;
  }

  return {
    mode: "full",
    date: log.date,
    waterIntakeOz: log.waterIntakeOz,
    appetiteScore: log.appetiteScore,
    energyScore: log.energyScore,
    vomitingCount: log.vomitingCount,
    urinationScore: log.urinationScore,
    stoolScore: log.stoolScore,
    medications: log.medications,
    notes: log.notes ?? undefined,
    weightLb: log.weightLb ?? undefined
  };
}

export function deriveLogs(logEntries: ContentLogEntry[], thresholds: ThresholdSettings): DailyLogRecord[] {
  const normalized = logEntries.map(normalizeLog);
  const chronological = sortLogsAscending(normalized);

  let previousWeightLb: number | null = null;

  for (const log of chronological) {
    const evaluable = toEvaluableLog(log);
    log.alerts = evaluable ? computeSoftAlerts(evaluable, thresholds, previousWeightLb, "threshold-default") : [];

    if (typeof log.weightLb === "number") {
      previousWeightLb = log.weightLb;
    }
  }

  return sortLogsDescending(chronological);
}

export function filterLogs(logs: DailyLogRecord[], filter: LogFilter = {}): DailyLogRecord[] {
  const filtered = logs.filter((log) => {
    if (filter.from && log.date < filter.from) {
      return false;
    }
    if (filter.to && log.date > filter.to) {
      return false;
    }
    return true;
  });

  return filtered.slice(0, filter.limit ?? 200);
}

function mapActiveLexiconTerms(terms: ContentLexiconTerm[]): NlpLexiconTerm[] {
  return terms
    .filter((term) => term.isActive)
    .map((term) => ({
      id: term.id,
      issueKey: term.issueKey,
      label: term.label,
      phrase: term.phrase,
      normalizedPhrase: term.normalizedPhrase,
      weight: term.weight
    }));
}

export function deriveIssueInsights(params: {
  logs: DailyLogRecord[];
  lexiconTerms: ContentLexiconTerm[];
  days: number;
  limit: number;
  includeSnippets: boolean;
}): IssueInsights {
  const fromDate = toISODate(startDateForRange(params.days));
  const terms = mapActiveLexiconTerms(params.lexiconTerms);
  const rows: MentionRowForAggregation[] = [];

  let totalAnalyzedLogs = 0;

  for (const log of params.logs) {
    if (log.date < fromDate || !log.notes?.trim()) {
      continue;
    }

    totalAnalyzedLogs += 1;
    const mentions = extractIssueMentionsFromText(log.notes, terms);

    for (const mention of mentions) {
      rows.push({
        dailyLogId: log.id,
        issueKey: mention.issueKey,
        label: mention.label,
        mentionCount: mention.mentionCount,
        weightedScore: mention.weightedScore,
        evidenceSnippet: mention.evidenceSnippet,
        date: log.date
      });
    }
  }

  return aggregateIssueInsights(rows, {
    windowDays: params.days,
    limit: params.limit,
    includeSnippets: params.includeSnippets,
    totalAnalyzedLogs
  });
}

export function deriveCurrentAlerts(logs: DailyLogRecord[], limit = 15): AlertItem[] {
  const flattened = logs.flatMap((log) => log.alerts ?? []);
  const sorted = flattened.sort((a, b) => b.date.localeCompare(a.date));
  return sorted.slice(0, limit);
}

export function deriveDashboardPayload(params: {
  range: "7d" | "30d" | "90d";
  logs: DailyLogRecord[];
  lexiconTerms: ContentLexiconTerm[];
}): DashboardPayload {
  const days = parseRangeToDays(params.range);
  const fromDate = toISODate(startDateForRange(days));
  const logsInRange = filterLogs(params.logs, { from: fromDate, limit: 365 });

  const latestLog = params.logs[0] ?? null;
  const issueInsights = deriveIssueInsights({
    logs: params.logs,
    lexiconTerms: params.lexiconTerms,
    days: 7,
    limit: 5,
    includeSnippets: true
  });

  return {
    range: params.range,
    latestLog,
    alerts: latestLog?.alerts ?? [],
    trend: [...logsInRange].reverse(),
    issueInsights,
    stats: {
      avgWaterIntakeOz: average(logsInRange.map((log) => log.waterIntakeOz)),
      avgAppetiteScore: average(logsInRange.map((log) => log.appetiteScore)),
      avgEnergyScore: average(logsInRange.map((log) => log.energyScore)),
      totalVomitingEvents: logsInRange.reduce((acc, log) => acc + (log.vomitingCount ?? 0), 0)
    }
  };
}
