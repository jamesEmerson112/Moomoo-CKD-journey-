import type {
  Box01WorkbenchPayload,
  ContentClinicalEvent,
  DailyLogRecord
} from "@/lib/contracts";

import {
  buildRangeWindow,
  collapsePointsByDate,
  extractClinicalMeasurementPoints,
  type MeasurementPoint
} from "./shared";

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
