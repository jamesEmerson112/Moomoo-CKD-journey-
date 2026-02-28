// Compatibility implementation file for derive logic while public exports are split by domain in `src/content/derive/*`.
import { computeSoftAlerts } from "@/lib/alerts";
import type {
  AlertItem,
  Box01ZoneDefinition,
  Box01LegendItem,
  Box01Series,
  Box01SeriesPoint,
  Box01WorkbenchPayload,
  Box02WorkbenchPayload,
  Box03WorkbenchPayload,
  BurdenSeriesPoint,
  ClinicalMeasurementComparator,
  DirectionalClinicalMetricRow,
  ContentClinicalEvent,
  ContentLexiconTerm,
  ContentLogEntry,
  DailyLogRecord,
  DashboardPayload,
  FullDailyLogInput,
  HybridAlertChip,
  IssueInsights,
  IssueWeightedRankItem,
  IssueWeightedSeriesPoint,
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

interface RangeWindow {
  days: number;
  fromDate: string;
  toDate: string;
  dates: string[];
}

interface IssueRowsResult {
  rows: MentionRowForAggregation[];
  analyzedLogs: number;
}

interface RangeAnchorParams {
  days: number;
  anchorDate?: Date;
  window?: {
    fromDate: string;
    toDate: string;
  };
}

interface LogAnalysisParams extends RangeAnchorParams {
  logs: DailyLogRecord[];
  lexiconTerms: ContentLexiconTerm[];
}

interface DailyWeightedTotalsResult {
  totalsByDate: Map<string, number>;
  dates: string[];
}

export interface WeightDeltaResult {
  latestWeightLb: number | null;
  baselineWeightLb: number | null;
  deltaLb: number | null;
  deltaPct: number | null;
}

export interface ConsistencyResult {
  percent: number;
  loggedDays: number;
  gapDays: number;
  rangeDays: number;
}

export interface BurdenWindowResult {
  rawScore: number;
  index: number;
  referencePeak: number;
  analyzedLogs: number;
}

export interface WeightedIssueSeriesResult {
  rank: IssueWeightedRankItem[];
  dailySeries: IssueWeightedSeriesPoint[];
  analyzedLogs: number;
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

function normalizeAnchorDate(anchorDate?: Date): Date {
  const current = anchorDate ? new Date(anchorDate) : new Date();
  current.setUTCHours(0, 0, 0, 0);
  return current;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function listIsoDates(fromDate: string, toDate: string): string[] {
  const from = toDateOnly(fromDate);
  const to = toDateOnly(toDate);
  const dates: string[] = [];

  for (let current = new Date(from); current <= to; current = addDays(current, 1)) {
    dates.push(toISODate(current));
  }

  return dates;
}

function buildRangeWindow(params: RangeAnchorParams): RangeWindow {
  if (params.window) {
    const fromDate = params.window.fromDate <= params.window.toDate ? params.window.fromDate : params.window.toDate;
    const toDate = params.window.fromDate <= params.window.toDate ? params.window.toDate : params.window.fromDate;
    const dates = listIsoDates(fromDate, toDate);
    return {
      days: dates.length,
      fromDate,
      toDate,
      dates
    };
  }

  const to = normalizeAnchorDate(params.anchorDate);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (params.days - 1));

  const fromDate = toISODate(from);
  const toDate = toISODate(to);

  return {
    days: params.days,
    fromDate,
    toDate,
    dates: listIsoDates(fromDate, toDate)
  };
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

function clampIndex(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
}

function normalizeIndex(value: number, reference: number): number {
  if (reference <= 0 || value <= 0) {
    return 0;
  }

  return clampIndex((value / reference) * 100);
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

function weightLogsByDateAsc(logs: DailyLogRecord[]): DailyLogRecord[] {
  return [...logs]
    .filter((log) => typeof log.weightLb === "number")
    .sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt));
}

export function deriveWeightDelta(params: {
  logs: DailyLogRecord[];
  days: number;
  anchorDate?: Date;
}): WeightDeltaResult {
  const window = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate
  });

  const weightedLogs = weightLogsByDateAsc(params.logs);
  if (weightedLogs.length === 0) {
    return {
      latestWeightLb: null,
      baselineWeightLb: null,
      deltaLb: null,
      deltaPct: null
    };
  }

  const inRange = weightedLogs.filter((log) => log.date >= window.fromDate && log.date <= window.toDate);
  const latest = inRange.length > 0 ? inRange[inRange.length - 1] : null;
  if (!latest || typeof latest.weightLb !== "number") {
    return {
      latestWeightLb: null,
      baselineWeightLb: null,
      deltaLb: null,
      deltaPct: null
    };
  }

  const baselineBeforeStart = [...weightedLogs]
    .reverse()
    .find((log) => log.date <= window.fromDate && typeof log.weightLb === "number");
  const baseline = baselineBeforeStart ?? inRange[0] ?? null;
  if (!baseline || typeof baseline.weightLb !== "number") {
    return {
      latestWeightLb: latest.weightLb,
      baselineWeightLb: null,
      deltaLb: null,
      deltaPct: null
    };
  }

  const deltaLb = Number((latest.weightLb - baseline.weightLb).toFixed(2));
  const deltaPct = baseline.weightLb > 0 ? Number(((deltaLb / baseline.weightLb) * 100).toFixed(1)) : null;

  return {
    latestWeightLb: latest.weightLb,
    baselineWeightLb: baseline.weightLb,
    deltaLb,
    deltaPct
  };
}

export function deriveConsistencyPct(params: {
  logs: DailyLogRecord[];
  days: number;
  anchorDate?: Date;
}): ConsistencyResult {
  const window = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate
  });

  const loggedDays = new Set(
    params.logs.filter((log) => log.date >= window.fromDate && log.date <= window.toDate).map((log) => log.date)
  ).size;
  const gapDays = Math.max(0, window.days - loggedDays);
  const percent = clampIndex((gapDays / window.days) * 100);

  return {
    percent,
    loggedDays,
    gapDays,
    rangeDays: window.days
  };
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

    if ((vomitingMention?.weightedScore ?? 0) >= 3 || (vomitingMention?.mentionCount ?? 0) >= 2) {
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

    if (APPETITE_CRISIS_RE.test(text) || (appetiteMention?.weightedScore ?? 0) >= 2.3) {
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

type ZoneValue = 0 | 1 | 2 | 3 | 4;

interface MeasurementPoint {
  date: string;
  rawValue: number;
  source: "log" | "clinical_event";
  contextText?: string;
}

interface ClinicalObservation {
  date: string;
  rawValue: number;
  comparator: ClinicalMeasurementComparator;
  unit?: string | null;
  source: "clinical_event";
  contextText?: string;
}

const CLINICAL_METRICS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "creatinine", label: "Creatinine" },
  { key: "sdma", label: "SDMA" },
  { key: "bun", label: "BUN" },
  { key: "phosphorus", label: "Phosphorus" },
  { key: "albumin", label: "Albumin" },
  { key: "hct", label: "Hematocrit" },
  { key: "hemoglobin", label: "Hemoglobin" },
  { key: "pcv", label: "Packed Cell Volume" },
  { key: "upc", label: "UPC" },
  { key: "potassium", label: "Potassium" },
  { key: "total-protein", label: "Total Protein" },
  { key: "t4", label: "Total T4" }
];

const CLINICAL_METRIC_LABEL_BY_KEY = new Map(CLINICAL_METRICS.map((metric) => [metric.key, metric.label]));

const BOX02_HIGHER_WORSE_METRICS = ["bun", "creatinine", "sdma", "phosphorus", "upc", "potassium", "t4"] as const;

const BOX03_LOWER_WORSE_METRICS = ["albumin", "hct", "hemoglobin", "pcv", "total-protein"] as const;

const ZONE_LABEL_BY_VALUE: Record<ZoneValue, string> = {
  0: "Safe",
  1: "Stage 1",
  2: "Stage 2",
  3: "Stage 3",
  4: "Stage 4"
};

function matchesEarlyCkdContext(contextText?: string): boolean {
  if (!contextText) {
    return false;
  }

  return /\b(early|initial|possible|suspected)?\s*(ckd|kidney|renal)\b/i.test(contextText);
}

function mapCreatinineToZone(rawValue: number, contextText?: string): ZoneValue {
  if (rawValue < 1.6) {
    return matchesEarlyCkdContext(contextText) ? 1 : 0;
  }
  if (rawValue <= 2.8) {
    return 2;
  }
  if (rawValue <= 5.0) {
    return 3;
  }
  return 4;
}

function mapSdmaToZone(rawValue: number): ZoneValue {
  if (rawValue < 14) {
    return 0;
  }
  if (rawValue <= 17) {
    return 1;
  }
  if (rawValue <= 25) {
    return 2;
  }
  if (rawValue <= 38) {
    return 3;
  }
  return 4;
}

function comparatorPrefix(comparator: ClinicalMeasurementComparator): string {
  if (comparator === "gt") {
    return ">";
  }
  if (comparator === "lt") {
    return "<";
  }
  if (comparator === "approx") {
    return "~";
  }
  return "";
}

function computeRiskPercentile(params: {
  allValues: number[];
  value: number;
  direction: "higher_worse" | "lower_worse";
}): number {
  if (params.allValues.length <= 1) {
    return 0;
  }

  const sorted = [...params.allValues].sort((a, b) => a - b);
  const maxIndex = sorted.length - 1;

  let ascendingIndex = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    if (sorted[index] <= params.value) {
      ascendingIndex = index;
    } else {
      break;
    }
  }

  const ascendingPercentile = ascendingIndex / maxIndex;
  if (params.direction === "higher_worse") {
    return ascendingPercentile;
  }
  return 1 - ascendingPercentile;
}

function riskPercentileToZone(percentile: number): ZoneValue {
  if (percentile < 0.2) {
    return 0;
  }
  if (percentile < 0.4) {
    return 1;
  }
  if (percentile < 0.6) {
    return 2;
  }
  if (percentile < 0.8) {
    return 3;
  }
  return 4;
}

function collapsePointsByDate(points: MeasurementPoint[]): MeasurementPoint[] {
  const grouped = new Map<
    string,
    {
      sum: number;
      count: number;
      source: MeasurementPoint["source"];
      contexts: Set<string>;
    }
  >();

  for (const point of points) {
    const bucket = grouped.get(point.date) ?? {
      sum: 0,
      count: 0,
      source: point.source,
      contexts: new Set<string>()
    };

    bucket.sum += point.rawValue;
    bucket.count += 1;
    if (point.contextText?.trim()) {
      bucket.contexts.add(point.contextText.trim());
    }

    grouped.set(point.date, bucket);
  }

  return [...grouped.entries()]
    .map(([date, bucket]) => ({
      date,
      rawValue: bucket.sum / bucket.count,
      source: bucket.source,
      contextText: bucket.contexts.size > 0 ? [...bucket.contexts].join(" ") : undefined
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function extractClinicalMeasurementPoints(params: {
  events: ContentClinicalEvent[];
  metricKey: string;
  fromDate: string;
  toDate: string;
}): MeasurementPoint[] {
  const points: MeasurementPoint[] = [];

  for (const event of params.events) {
    if (event.date < params.fromDate || event.date > params.toDate) {
      continue;
    }

    for (const measurement of event.measurements ?? []) {
      if (measurement.key !== params.metricKey) {
        continue;
      }

      points.push({
        date: event.date,
        rawValue: measurement.value,
        source: "clinical_event",
        contextText: `${event.title} ${event.summary}`
      });
    }
  }

  return collapsePointsByDate(points);
}

function sortClinicalEventsAscending(events: ContentClinicalEvent[]): ContentClinicalEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function extractClinicalObservations(params: {
  events: ContentClinicalEvent[];
  metricKey: string;
  fromDate?: string;
  toDate?: string;
}): ClinicalObservation[] {
  const observations: ClinicalObservation[] = [];

  for (const event of sortClinicalEventsAscending(params.events)) {
    if (params.fromDate && event.date < params.fromDate) {
      continue;
    }
    if (params.toDate && event.date > params.toDate) {
      continue;
    }

    for (const measurement of event.measurements ?? []) {
      if (measurement.key !== params.metricKey) {
        continue;
      }

      observations.push({
        date: event.date,
        rawValue: measurement.value,
        comparator: measurement.comparator,
        unit: measurement.unit,
        source: "clinical_event",
        contextText: `${event.title} ${event.summary}`
      });
    }
  }

  return observations;
}

function resolveLatestClinicalObservation(params: {
  events: ContentClinicalEvent[];
  metricKey: string;
  window: RangeWindow;
}): { observation: ClinicalObservation | null; stale: boolean } {
  const inRange = extractClinicalObservations({
    events: params.events,
    metricKey: params.metricKey,
    fromDate: params.window.fromDate,
    toDate: params.window.toDate
  });
  if (inRange.length > 0) {
    return {
      observation: inRange[inRange.length - 1] ?? null,
      stale: false
    };
  }

  const historical = extractClinicalObservations({
    events: params.events,
    metricKey: params.metricKey,
    toDate: params.window.toDate
  });
  if (historical.length > 0) {
    return {
      observation: historical[historical.length - 1] ?? null,
      stale: true
    };
  }

  return {
    observation: null,
    stale: false
  };
}

function formatObservationValueText(observation: ClinicalObservation): string {
  const prefix = comparatorPrefix(observation.comparator);
  const unit = observation.unit ? ` ${observation.unit}` : "";
  return `${prefix}${observation.rawValue}${unit}`;
}

function extractLogWeightPoints(params: {
  logs: DailyLogRecord[];
  fromDate: string;
  toDate: string;
}): MeasurementPoint[] {
  const points = params.logs
    .filter((log) => log.date >= params.fromDate && log.date <= params.toDate && typeof log.weightLb === "number")
    .map((log) => ({
      date: log.date,
      rawValue: log.weightLb as number,
      source: "log" as const,
      contextText: log.notes ?? undefined
    }));

  return collapsePointsByDate(points);
}

function extractMergedWeightTimeline(params: {
  logs: DailyLogRecord[];
  events: ContentClinicalEvent[];
  fromDate: string;
  toDate: string;
}): Box01WorkbenchPayload["series"] {
  const byDate = new Map<
    string,
    {
      value: number;
      source: "log" | "clinical_event";
    }
  >();

  const logPoints = extractLogWeightPoints({
    logs: params.logs,
    fromDate: params.fromDate,
    toDate: params.toDate
  });
  for (const point of logPoints) {
    byDate.set(point.date, {
      value: Number(point.rawValue.toFixed(2)),
      source: "log"
    });
  }

  const clinicalPoints = extractClinicalMeasurementPoints({
    events: params.events,
    metricKey: "weight-lb",
    fromDate: params.fromDate,
    toDate: params.toDate
  });
  for (const point of clinicalPoints) {
    if (byDate.has(point.date)) {
      continue;
    }
    byDate.set(point.date, {
      value: Number(point.rawValue.toFixed(2)),
      source: "clinical_event"
    });
  }

  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, item]) => ({
      date,
      weightLb: item.value,
      source: "merged" as const
    }));
}

function deriveWeightAxisBounds(points: Box01WorkbenchPayload["series"], healthyReferenceLb: number): {
  min: number;
  max: number;
} {
  const values = [...points.map((point) => point.weightLb), healthyReferenceLb];
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const paddedMin = Math.floor((minValue - 0.4) * 10) / 10;
  const paddedMax = Math.ceil((maxValue + 0.4) * 10) / 10;

  if (paddedMin >= paddedMax) {
    return {
      min: paddedMin - 0.5,
      max: paddedMax + 0.5
    };
  }

  return {
    min: paddedMin,
    max: paddedMax
  };
}

function mapRelativePointToZone(params: {
  point: MeasurementPoint;
  allValues: number[];
  direction: "higher_worse" | "lower_worse";
}): ZoneValue {
  const percentile = computeRiskPercentile({
    allValues: params.allValues,
    value: params.point.rawValue,
    direction: params.direction
  });
  return riskPercentileToZone(percentile);
}

function toSeriesPoints(
  points: MeasurementPoint[],
  mapper: (point: MeasurementPoint) => ZoneValue | null
): Box01SeriesPoint[] {
  return points.map((point) => ({
    date: point.date,
    rawValue: Number(point.rawValue.toFixed(2)),
    zoneValue: mapper(point)
  }));
}

function buildBox01Zones(): Box01ZoneDefinition[] {
  return [
    {
      zone: 0,
      label: "Safe",
      meaning: "Operational baseline zone",
      color: "#dbeafe"
    },
    {
      zone: 1,
      label: "Stage 1",
      meaning: "Mild concern / early CKD context",
      color: "#bfdbfe"
    },
    {
      zone: 2,
      label: "Stage 2",
      meaning: "CKD stage 2 band",
      color: "#93c5fd"
    },
    {
      zone: 3,
      label: "Stage 3",
      meaning: "CKD stage 3 band",
      color: "#60a5fa"
    },
    {
      zone: 4,
      label: "Stage 4",
      meaning: "CKD stage 4 / critical band",
      color: "#2563eb"
    }
  ];
}

export function deriveBox01Workbench(params: {
  logs: DailyLogRecord[];
  clinicalEvents: ContentClinicalEvent[];
  days: number;
  anchorDate?: Date;
  window?: {
    fromDate: string;
    toDate: string;
  };
}): Box01WorkbenchPayload {
  const window = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate,
    window: params.window
  });
  const healthyReferenceLb = 8;
  const series = extractMergedWeightTimeline({
    logs: params.logs,
    events: params.clinicalEvents,
    fromDate: window.fromDate,
    toDate: window.toDate
  });
  const yAxis = deriveWeightAxisBounds(series, healthyReferenceLb);

  return {
    healthyReferenceLb,
    series,
    yAxis,
    notes: {
      stagedPolicyText: "Weight is displayed directly in pounds with a fixed healthy reference line at 8 lb.",
      nonStagedPolicyText: "Merged series prefers log weight on same-date collisions and falls back to clinical event weight."
    }
  };
}

function buildClinicalHistoricalValues(params: {
  events: ContentClinicalEvent[];
  metricKey: string;
  toDate: string;
}): number[] {
  return extractClinicalObservations({
    events: params.events,
    metricKey: params.metricKey,
    toDate: params.toDate
  }).map((point) => point.rawValue);
}

function toDirectionalRow(params: {
  metricKey: string;
  direction: "higher_worse" | "lower_worse";
  events: ContentClinicalEvent[];
  window: RangeWindow;
}): DirectionalClinicalMetricRow | null {
  const resolved = resolveLatestClinicalObservation({
    events: params.events,
    metricKey: params.metricKey,
    window: params.window
  });

  if (!resolved.observation) {
    return null;
  }

  const metricLabel = CLINICAL_METRIC_LABEL_BY_KEY.get(params.metricKey) ?? params.metricKey;
  const isIrisMetric = params.metricKey === "creatinine" || params.metricKey === "sdma";

  let severityZone: ZoneValue;
  let mappingKind: DirectionalClinicalMetricRow["mappingKind"];

  if (params.metricKey === "creatinine") {
    severityZone = mapCreatinineToZone(resolved.observation.rawValue, resolved.observation.contextText);
    mappingKind = "iris_staged";
  } else if (params.metricKey === "sdma") {
    severityZone = mapSdmaToZone(resolved.observation.rawValue);
    mappingKind = "iris_staged";
  } else {
    const allValues = buildClinicalHistoricalValues({
      events: params.events,
      metricKey: params.metricKey,
      toDate: params.window.toDate
    });
    severityZone = mapRelativePointToZone({
      point: {
        date: resolved.observation.date,
        rawValue: resolved.observation.rawValue,
        source: resolved.observation.source,
        contextText: resolved.observation.contextText
      },
      allValues: allValues.length > 0 ? allValues : [resolved.observation.rawValue],
      direction: params.direction
    });
    mappingKind = "relative_non_staged";
  }

  return {
    metricKey: params.metricKey,
    metricLabel,
    valueText: formatObservationValueText(resolved.observation),
    date: resolved.observation.date,
    source: resolved.observation.source,
    severityZone,
    severityLabel: ZONE_LABEL_BY_VALUE[severityZone],
    stale: resolved.stale,
    mappingKind: isIrisMetric ? "iris_staged" : mappingKind
  };
}

function deriveDirectionalClinicalRows(params: {
  events: ContentClinicalEvent[];
  metricKeys: readonly string[];
  direction: "higher_worse" | "lower_worse";
  window: RangeWindow;
}): DirectionalClinicalMetricRow[] {
  const rows: DirectionalClinicalMetricRow[] = [];

  for (const metricKey of params.metricKeys) {
    const row = toDirectionalRow({
      metricKey,
      direction: params.direction,
      events: params.events,
      window: params.window
    });
    if (!row) {
      continue;
    }
    rows.push(row);
  }

  return rows;
}

function buildAssumedHealthyBaselinePoints(window: RangeWindow): Box01SeriesPoint[] {
  if (window.fromDate === window.toDate) {
    return [
      {
        date: window.fromDate,
        rawValue: null,
        zoneValue: 0
      }
    ];
  }

  return [
    {
      date: window.fromDate,
      rawValue: null,
      zoneValue: 0
    },
    {
      date: window.toDate,
      rawValue: null,
      zoneValue: 0
    }
  ];
}

function deriveDirectionalClinicalSeries(params: {
  events: ContentClinicalEvent[];
  metricKeys: readonly string[];
  direction: "higher_worse" | "lower_worse";
  window: RangeWindow;
}): Pick<Box02WorkbenchPayload, "series" | "legend"> {
  const series: Box02WorkbenchPayload["series"] = [];
  const legend: Box02WorkbenchPayload["legend"] = [];

  for (const metricKey of params.metricKeys) {
    const points = extractClinicalMeasurementPoints({
      events: params.events,
      metricKey,
      fromDate: params.window.fromDate,
      toDate: params.window.toDate
    });

    const isIrisMetric = metricKey === "creatinine" || metricKey === "sdma";
    const metricLabel = CLINICAL_METRIC_LABEL_BY_KEY.get(metricKey) ?? metricKey;
    const allValues = isIrisMetric
      ? []
      : buildClinicalHistoricalValues({
          events: params.events,
          metricKey,
          toDate: params.window.toDate
        });

    if (points.length > 0) {
      series.push({
        metricKey,
        metricLabel,
        source: "clinical_event",
        points: toSeriesPoints(points, (point) => {
          if (metricKey === "creatinine") {
            return mapCreatinineToZone(point.rawValue, point.contextText);
          }
          if (metricKey === "sdma") {
            return mapSdmaToZone(point.rawValue);
          }
          return mapRelativePointToZone({
            point,
            allValues: allValues.length > 0 ? allValues : points.map((entry) => entry.rawValue),
            direction: params.direction
          });
        })
      });

      legend.push({
        metricKey,
        metricLabel,
        source: "clinical_event",
        staged: isIrisMetric,
        direction: params.direction
      });
    }

    series.push({
      metricKey,
      metricLabel,
      source: "merged",
      points: buildAssumedHealthyBaselinePoints(params.window)
    });

    legend.push({
      metricKey,
      metricLabel,
      source: "merged",
      assumed: true,
      staged: false,
      direction: params.direction
    });
  }

  return {
    series,
    legend
  };
}

export function deriveBox02Workbench(params: {
  clinicalEvents: ContentClinicalEvent[];
  days: number;
  anchorDate?: Date;
  window?: {
    fromDate: string;
    toDate: string;
  };
}): Box02WorkbenchPayload {
  const window = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate,
    window: params.window
  });
  const chart = deriveDirectionalClinicalSeries({
    events: params.clinicalEvents,
    metricKeys: BOX02_HIGHER_WORSE_METRICS,
    direction: "higher_worse",
    window
  });

  return {
    zones: buildBox01Zones(),
    healthyBaselineZone: 0,
    rows: deriveDirectionalClinicalRows({
      events: params.clinicalEvents,
      metricKeys: BOX02_HIGHER_WORSE_METRICS,
      direction: "higher_worse",
      window
    }),
    series: chart.series,
    legend: chart.legend,
    yAxis: {
      min: 0,
      max: 4,
      ticks: [0, 1, 2, 3, 4]
    },
    notes: {
      stagedPolicyText: "Creatinine and SDMA lines are IRIS-staged in Box-02.",
      nonStagedPolicyText: "Other Box-02 metrics use relative percentile risk zones (higher is worse)."
    }
  };
}

export function deriveBox03Workbench(params: {
  clinicalEvents: ContentClinicalEvent[];
  days: number;
  anchorDate?: Date;
  window?: {
    fromDate: string;
    toDate: string;
  };
}): Box03WorkbenchPayload {
  const window = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate,
    window: params.window
  });
  const chart = deriveDirectionalClinicalSeries({
    events: params.clinicalEvents,
    metricKeys: BOX03_LOWER_WORSE_METRICS,
    direction: "lower_worse",
    window
  });

  return {
    zones: buildBox01Zones(),
    healthyBaselineZone: 0,
    rows: deriveDirectionalClinicalRows({
      events: params.clinicalEvents,
      metricKeys: BOX03_LOWER_WORSE_METRICS,
      direction: "lower_worse",
      window
    }),
    series: chart.series,
    legend: chart.legend,
    yAxis: {
      min: 0,
      max: 4,
      ticks: [0, 1, 2, 3, 4]
    },
    notes: {
      stagedPolicyText: "Box-03 uses an inverted y-axis (0 top, 4 bottom) to match lower-is-worse interpretation.",
      nonStagedPolicyText: "Box-03 uses relative percentile risk zones (lower is worse)."
    }
  };
}
