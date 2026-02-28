import type {
  AlertItem,
  ContentLexiconTerm,
  DailyLogRecord,
  DashboardPayload
} from "@/lib/contracts";
import { parseRangeToDays, startDateForRange, toISODate } from "@/lib/date";

import {
  average,
  buildRangeWindow,
  clampIndex,
  type ConsistencyResult,
  type WeightDeltaResult
} from "./shared";
import { filterLogs } from "./logs";
import { deriveIssueInsights } from "./issues";

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
