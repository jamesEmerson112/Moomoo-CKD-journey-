import {
  deriveBurdenWindow,
  deriveConsistencyPct,
  deriveDailyBurdenSeries,
  deriveHybridAlertsFromNotes,
  deriveWeightDelta,
  deriveWeightedIssueSeries,
  filterLogs
} from "@/content/derive";
import { DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT } from "@/lib/board-layout";
import { parseRangeToDays } from "@/lib/date";
import type { ContentClinicalEvent, DailyLogRecord, MainboardPayload, MeasurementSnapshotItem } from "@/lib/contracts";

import { loadDerivedContent } from "./content-source";
import { comparatorPrefix, formatSignedValue, mainboardRangeWindow, sortClinicalEventsDescending } from "./shared";

function buildMeasurementSnapshot(events: ContentClinicalEvent[], limit = 6): MeasurementSnapshotItem[] {
  const byKey = new Map<string, MeasurementSnapshotItem>();

  for (const event of events) {
    for (const measurement of event.measurements ?? []) {
      if (byKey.has(measurement.key)) {
        continue;
      }

      const prefix = comparatorPrefix(measurement.comparator);
      const unit = measurement.unit ? ` ${measurement.unit}` : "";
      byKey.set(measurement.key, {
        key: measurement.key,
        label: measurement.label,
        valueText: `${prefix}${measurement.value}${unit}`,
        date: event.date
      });
    }
  }

  return [...byKey.values()].slice(0, limit);
}

function buildLatestWeightByDate(medicalLogs: DailyLogRecord[]): Map<string, number> {
  const latestWeightByDate = new Map<string, number>();

  for (const medicalLog of [...medicalLogs].sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt))) {
    if (typeof medicalLog.weightLb === "number") {
      latestWeightByDate.set(medicalLog.date, medicalLog.weightLb);
    }
  }

  return latestWeightByDate;
}

function buildMainboardTrendSeries(params: {
  burdenSeries: ReturnType<typeof deriveDailyBurdenSeries>;
  medicalLogs: DailyLogRecord[];
}): MainboardPayload["trendSeries"] {
  const latestWeightByDate = buildLatestWeightByDate(params.medicalLogs);

  return params.burdenSeries.map((point) => ({
    date: point.date,
    weightLb: latestWeightByDate.get(point.date) ?? null,
    burdenRaw: point.rawScore,
    burdenIndex: point.index
  }));
}

function toWeightDeltaDisplay(weightDelta: {
  deltaLb: number | null;
  deltaPct: number | null;
}): { value: string; detail: string } {
  const value = weightDelta.deltaLb === null ? "N/A" : `${formatSignedValue(weightDelta.deltaLb, 2)} lb`;
  const detail = weightDelta.deltaPct === null ? "No baseline" : `${formatSignedValue(weightDelta.deltaPct, 1)}%`;

  return { value, detail };
}

export async function getMainboardPayload(range: "7d" | "30d" | "90d" = "30d"): Promise<MainboardPayload> {
  const { medicalLogs, lexiconTerms, clinicalEvents } = await loadDerivedContent();
  const days = parseRangeToDays(range);
  const rangeWindow = mainboardRangeWindow(days);
  const sortedClinicalEvents = sortClinicalEventsDescending(clinicalEvents);
  const logsInRange = filterLogs(medicalLogs, {
    from: rangeWindow.fromDate,
    to: rangeWindow.toDate,
    limit: 365
  });

  const weightDelta = deriveWeightDelta({
    logs: medicalLogs,
    days
  });
  const burdenWindow = deriveBurdenWindow({
    logs: medicalLogs,
    lexiconTerms,
    days
  });
  const burdenSeries = deriveDailyBurdenSeries({
    logs: medicalLogs,
    lexiconTerms,
    days
  });
  const consistency = deriveConsistencyPct({
    logs: medicalLogs,
    days
  });
  const issueSeries = deriveWeightedIssueSeries({
    logs: medicalLogs,
    lexiconTerms,
    days,
    limit: 5
  });
  const hybridAlerts = deriveHybridAlertsFromNotes({
    logs: medicalLogs,
    lexiconTerms,
    days
  });

  const trendSeries = buildMainboardTrendSeries({
    burdenSeries,
    medicalLogs
  });

  const latestDateValue = logsInRange[0]?.date ?? "No logs in range";
  const weightDisplay = toWeightDeltaDisplay(weightDelta);

  return {
    range,
    kpis: {
      latestLogDate: {
        value: latestDateValue,
        badge: "Text-derived"
      },
      weightDelta: {
        value: weightDisplay.value,
        detail: weightDisplay.detail,
        badge: "Numeric (weight)",
        latestWeightLb: weightDelta.latestWeightLb,
        baselineWeightLb: weightDelta.baselineWeightLb,
        deltaLb: weightDelta.deltaLb,
        deltaPct: weightDelta.deltaPct
      },
      issueBurden: {
        value: `${burdenWindow.index}`,
        detail: `Raw ${burdenWindow.rawScore.toFixed(2)}`,
        badge: "NLP-derived",
        index: burdenWindow.index,
        rawScore: burdenWindow.rawScore,
        referencePeak: burdenWindow.referencePeak
      },
      loggingConsistency: {
        value: `${consistency.percent}%`,
        detail: `${consistency.gapDays}/${consistency.rangeDays} assumed stable`,
        badge: "Coverage",
        percent: consistency.percent,
        loggedDays: consistency.loggedDays,
        gapDays: consistency.gapDays,
        rangeDays: consistency.rangeDays
      }
    },
    trendSeries,
    hybridAlerts,
    issueRank: issueSeries.rank,
    issueDailyWeightedSeries: issueSeries.dailySeries,
    clinicalEventsRecent: sortedClinicalEvents.slice(0, 6),
    measurementSnapshot: buildMeasurementSnapshot(sortedClinicalEvents, 6),
    boardLayout: DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT
  };
}
