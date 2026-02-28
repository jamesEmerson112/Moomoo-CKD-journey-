import { computeSoftAlerts } from "@/lib/alerts";
import type {
  ContentLogEntry,
  DailyLogRecord,
  FullDailyLogInput,
  ThresholdSettings
} from "@/lib/contracts";

import { toNullableNumber } from "./shared";

export type { LogFilter } from "./shared";

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

export function filterLogs(logs: DailyLogRecord[], filter: import("./shared").LogFilter = {}): DailyLogRecord[] {
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
