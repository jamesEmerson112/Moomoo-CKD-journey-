import type {
  AlertItem,
  BurdenSeriesPoint,
  ContentLexiconTerm,
  DailyLogRecord,
  HybridAlertChip,
  IssueInsights,
  IssueWeightedRankItem,
  IssueWeightedSeriesPoint
} from "@/lib/contracts";
import {
  APPETITE_CRISIS_SCORE_THRESHOLD,
  VOMITING_SPIKE_COUNT_THRESHOLD,
  VOMITING_SPIKE_SCORE_THRESHOLD
} from "@/lib/constants";
import { startDateForRange, toISODate } from "@/lib/date";
import {
  aggregateIssueInsights,
  extractIssueMentionsFromText,
  type MentionRowForAggregation,
  type NlpLexiconTerm
} from "@/lib/nlp";

import {
  buildRangeWindow,
  normalizeIndex,
  type BurdenWindowResult,
  type RangeWindow,
  type WeightedIssueSeriesResult
} from "./shared";

interface IssueRowsResult {
  rows: MentionRowForAggregation[];
  analyzedLogs: number;
}

interface LogAnalysisParams {
  days: number;
  anchorDate?: Date;
  window?: {
    fromDate: string;
    toDate: string;
  };
  logs: DailyLogRecord[];
  lexiconTerms: ContentLexiconTerm[];
}

interface DailyWeightedTotalsResult {
  totalsByDate: Map<string, number>;
  dates: string[];
}

const THRESHOLD_METRIC_LABELS: Record<string, string> = {
  waterIntakeOz: "Low water intake",
  appetiteScore: "Low appetite",
  energyScore: "Low energy",
  vomitingCount: "Vomiting increase",
  urinationScore: "Urination change",
  stoolScore: "Stool change",
  weightLb: "Weight loss"
};

const ORAL_TOKEN_RE = /(oral|mouth|tongue|lip|gum|gingiv|saliva|drool|chin)/i;
const BLOOD_TOKEN_RE = /(blood|bleed|bleeding|bloody)/i;
const ORAL_DYSFUNCTION_RE =
  /(tongue|oral discomfort|kibble avoidance|chew|chewing|pill[^.]{0,20}(refus|spit|intoler|difficult)|pill intolerance|spitting)/i;
const APPETITE_CRISIS_RE = /(not eating|won't eat|wont eat|refus(?:ing|ed)? to eat|stopped eating|no appetite|low appetite)/i;
const RESPIRATORY_RE = /(respir|breath|tachypnea|rr\b|rapid breathing)/i;
const RESPIRATORY_STRESS_RE = /(spike|high|rapid|labored|stress|4[0-9])/i;

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

function logWithinWindow(logDate: string, window: RangeWindow): boolean {
  return logDate >= window.fromDate && logDate <= window.toDate;
}

function collectIssueRows(params: {
  logs: DailyLogRecord[];
  terms: NlpLexiconTerm[];
  window: RangeWindow;
}): IssueRowsResult {
  const rows: MentionRowForAggregation[] = [];
  let analyzedLogs = 0;

  for (const log of params.logs) {
    if (!logWithinWindow(log.date, params.window) || !log.notes?.trim()) {
      continue;
    }

    analyzedLogs += 1;
    const mentions = extractIssueMentionsFromText(log.notes, params.terms);
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

  return {
    rows,
    analyzedLogs
  };
}

function buildDailyWeightedTotals(rows: MentionRowForAggregation[], dates: string[]): DailyWeightedTotalsResult {
  const totalsByDate = new Map<string, number>();
  for (const date of dates) {
    totalsByDate.set(date, 0);
  }

  for (const row of rows) {
    totalsByDate.set(row.date, (totalsByDate.get(row.date) ?? 0) + row.weightedScore);
  }

  return {
    totalsByDate,
    dates
  };
}

function rollingWindowPeak(values: number[], windowSize: number): number {
  if (values.length === 0 || windowSize <= 0) {
    return 0;
  }

  if (windowSize >= values.length) {
    return values.reduce((acc, value) => acc + value, 0);
  }

  let sum = 0;
  for (let index = 0; index < windowSize; index += 1) {
    sum += values[index];
  }

  let peak = sum;
  for (let index = windowSize; index < values.length; index += 1) {
    sum += values[index];
    sum -= values[index - windowSize];
    if (sum > peak) {
      peak = sum;
    }
  }

  return peak;
}

function thresholdMetricLabel(metric: string): string {
  return THRESHOLD_METRIC_LABELS[metric] ?? metric;
}

function latestByMetric(alerts: AlertItem[]): HybridAlertChip[] {
  const byMetric = new Map<string, AlertItem>();
  for (const alert of alerts) {
    const current = byMetric.get(alert.metric);
    if (!current || alert.date > current.date || (alert.date === current.date && alert.severity === "critical")) {
      byMetric.set(alert.metric, alert);
    }
  }

  return [...byMetric.values()].map((alert) => ({
    id: `threshold-${alert.metric}-${alert.date}`,
    triggerId: null,
    severity: alert.severity,
    label: thresholdMetricLabel(alert.metric),
    message: alert.message,
    date: alert.date,
    source: "threshold"
  }));
}

function triggerChip(params: {
  triggerId: Exclude<HybridAlertChip["triggerId"], null>;
  severity: HybridAlertChip["severity"];
  label: string;
  message: string;
  date: string;
}): HybridAlertChip {
  return {
    id: `nlp-${params.triggerId}-${params.date}`,
    triggerId: params.triggerId,
    severity: params.severity,
    label: params.label,
    message: params.message,
    date: params.date,
    source: "nlp"
  };
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

export function deriveBurdenWindow(params: LogAnalysisParams): BurdenWindowResult {
  const selectedWindow = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate
  });
  const ninetyDayWindow = buildRangeWindow({
    days: 90,
    anchorDate: params.anchorDate
  });

  const terms = mapActiveLexiconTerms(params.lexiconTerms);
  const selectedRows = collectIssueRows({
    logs: params.logs,
    terms,
    window: selectedWindow
  });
  const windowRaw = selectedRows.rows.reduce((acc, row) => acc + row.weightedScore, 0);

  const ninetyRows = collectIssueRows({
    logs: params.logs,
    terms,
    window: ninetyDayWindow
  }).rows;
  const ninetyDailyTotals = buildDailyWeightedTotals(ninetyRows, ninetyDayWindow.dates);
  const ninetyValues = ninetyDailyTotals.dates.map((date) => ninetyDailyTotals.totalsByDate.get(date) ?? 0);
  const referencePeak = rollingWindowPeak(ninetyValues, params.days);

  return {
    rawScore: Number(windowRaw.toFixed(2)),
    index: normalizeIndex(windowRaw, referencePeak),
    referencePeak: Number(referencePeak.toFixed(2)),
    analyzedLogs: selectedRows.analyzedLogs
  };
}

export function deriveDailyBurdenSeries(params: LogAnalysisParams): BurdenSeriesPoint[] {
  const selectedWindow = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate
  });
  const ninetyDayWindow = buildRangeWindow({
    days: 90,
    anchorDate: params.anchorDate
  });
  const terms = mapActiveLexiconTerms(params.lexiconTerms);

  const selectedRows = collectIssueRows({
    logs: params.logs,
    terms,
    window: selectedWindow
  }).rows;
  const ninetyRows = collectIssueRows({
    logs: params.logs,
    terms,
    window: ninetyDayWindow
  }).rows;

  const selectedTotals = buildDailyWeightedTotals(selectedRows, selectedWindow.dates);
  const ninetyTotals = buildDailyWeightedTotals(ninetyRows, ninetyDayWindow.dates);
  const dailyPeak = Math.max(0, ...ninetyTotals.dates.map((date) => ninetyTotals.totalsByDate.get(date) ?? 0));

  return selectedTotals.dates.map((date) => {
    const rawScore = Number((selectedTotals.totalsByDate.get(date) ?? 0).toFixed(2));
    return {
      date,
      rawScore,
      index: normalizeIndex(rawScore, dailyPeak)
    };
  });
}

export function deriveWeightedIssueSeries(params: LogAnalysisParams & { limit: number }): WeightedIssueSeriesResult {
  const window = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate
  });
  const terms = mapActiveLexiconTerms(params.lexiconTerms);
  const collected = collectIssueRows({
    logs: params.logs,
    terms,
    window
  });

  const rankMap = new Map<string, IssueWeightedRankItem>();
  const scoresByDate = new Map<string, Record<string, number>>();

  for (const date of window.dates) {
    scoresByDate.set(date, {});
  }

  for (const row of collected.rows) {
    const rank = rankMap.get(row.issueKey) ?? {
      issueKey: row.issueKey,
      label: row.label,
      weightedScore: 0,
      mentionCount: 0,
      lastSeenDate: row.date
    };
    rank.weightedScore += row.weightedScore;
    rank.mentionCount += row.mentionCount;
    if (row.date > rank.lastSeenDate) {
      rank.lastSeenDate = row.date;
    }
    rankMap.set(row.issueKey, rank);

    const dateScores = scoresByDate.get(row.date) ?? {};
    dateScores[row.issueKey] = Number(((dateScores[row.issueKey] ?? 0) + row.weightedScore).toFixed(2));
    scoresByDate.set(row.date, dateScores);
  }

  const rank = [...rankMap.values()]
    .sort((a, b) => {
      const weightedDiff = b.weightedScore - a.weightedScore;
      if (weightedDiff !== 0) {
        return weightedDiff;
      }
      return b.lastSeenDate.localeCompare(a.lastSeenDate);
    })
    .slice(0, params.limit)
    .map((item) => ({
      ...item,
      weightedScore: Number(item.weightedScore.toFixed(2))
    }));

  const activeKeys = new Set(rank.map((item) => item.issueKey));
  const dailySeries: IssueWeightedSeriesPoint[] = window.dates.map((date) => {
    const allScores = scoresByDate.get(date) ?? {};
    const scores: Record<string, number> = {};
    for (const key of activeKeys) {
      scores[key] = Number((allScores[key] ?? 0).toFixed(2));
    }
    return {
      date,
      scores
    };
  });

  return {
    rank,
    dailySeries,
    analyzedLogs: collected.analyzedLogs
  };
}

export function deriveHybridAlertsFromNotes(params: LogAnalysisParams): HybridAlertChip[] {
  const window = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate
  });
  const terms = mapActiveLexiconTerms(params.lexiconTerms);
  const rangeLogs = params.logs.filter((log) => logWithinWindow(log.date, window));

  const thresholdAlerts = latestByMetric(
    rangeLogs
      .flatMap((log) => log.alerts ?? [])
      .filter((alert) => alert.date >= window.fromDate && alert.date <= window.toDate)
  );

  const triggerPerDay = new Map<string, HybridAlertChip>();

  for (const log of rangeLogs) {
    if (!log.notes?.trim()) {
      continue;
    }

    const text = log.notes.toLowerCase();
    const mentions = extractIssueMentionsFromText(log.notes, terms);
    const vomitingMention = mentions.find((mention) => mention.issueKey === "vomiting");
    const appetiteMention = mentions.find((mention) => mention.issueKey === "low-appetite");

    const chips: HybridAlertChip[] = [];

    if (BLOOD_TOKEN_RE.test(text) && ORAL_TOKEN_RE.test(text)) {
      chips.push(
        triggerChip({
          triggerId: "oral_bleeding",
          severity: "critical",
          label: "Oral bleeding",
          message: "Blood and oral-area signs were detected in notes.",
          date: log.date
        })
      );
    }

    if (ORAL_DYSFUNCTION_RE.test(text)) {
      chips.push(
        triggerChip({
          triggerId: "oral_dysfunction",
          severity: "warning",
          label: "Oral dysfunction",
          message: "Oral discomfort or chewing/pill-tolerance issues were detected.",
          date: log.date
        })
      );
    }

    if ((vomitingMention?.weightedScore ?? 0) >= VOMITING_SPIKE_SCORE_THRESHOLD || (vomitingMention?.mentionCount ?? 0) >= VOMITING_SPIKE_COUNT_THRESHOLD) {
      chips.push(
        triggerChip({
          triggerId: "vomiting_spike",
          severity: "critical",
          label: "Vomiting spike",
          message: "Vomiting burden exceeded curated spike threshold.",
          date: log.date
        })
      );
    }

    if (APPETITE_CRISIS_RE.test(text) || (appetiteMention?.weightedScore ?? 0) >= APPETITE_CRISIS_SCORE_THRESHOLD) {
      chips.push(
        triggerChip({
          triggerId: "appetite_crisis",
          severity: "warning",
          label: "Appetite crisis",
          message: "High appetite concern signals were detected in notes.",
          date: log.date
        })
      );
    }

    if (RESPIRATORY_RE.test(text) && RESPIRATORY_STRESS_RE.test(text)) {
      chips.push(
        triggerChip({
          triggerId: "respiratory_stress",
          severity: "critical",
          label: "Respiratory stress",
          message: "Respiratory stress pattern detected in notes.",
          date: log.date
        })
      );
    }

    for (const chip of chips) {
      triggerPerDay.set(`${chip.triggerId}:${chip.date}`, chip);
    }
  }

  const latestPerTrigger = new Map<Exclude<HybridAlertChip["triggerId"], null>, HybridAlertChip>();
  for (const chip of triggerPerDay.values()) {
    if (!chip.triggerId) {
      continue;
    }
    const existing = latestPerTrigger.get(chip.triggerId);
    if (!existing || chip.date > existing.date) {
      latestPerTrigger.set(chip.triggerId, chip);
    }
  }

  const combined = [...latestPerTrigger.values(), ...thresholdAlerts];
  return combined.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) {
      return byDate;
    }
    if (a.severity !== b.severity) {
      return a.severity === "critical" ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });
}
