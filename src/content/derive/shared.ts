import type {
  Box01SeriesPoint,
  Box01ZoneDefinition,
  ClinicalMeasurementComparator,
  ContentClinicalEvent,
  IssueWeightedRankItem,
  IssueWeightedSeriesPoint
} from "@/lib/contracts";
import { toISODate } from "@/lib/date";

export interface LogFilter {
  from?: string;
  to?: string;
  limit?: number;
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

export interface RangeWindow {
  days: number;
  fromDate: string;
  toDate: string;
  dates: string[];
}

export interface RangeAnchorParams {
  days: number;
  anchorDate?: Date;
  window?: {
    fromDate: string;
    toDate: string;
  };
}

export type ZoneValue = 0 | 1 | 2 | 3 | 4;

export interface MeasurementPoint {
  date: string;
  rawValue: number;
  source: "log" | "clinical_event";
  contextText?: string;
}

export interface ClinicalObservation {
  date: string;
  rawValue: number;
  comparator: ClinicalMeasurementComparator;
  unit?: string | null;
  source: "clinical_event";
  contextText?: string;
}

export function average(values: Array<number | null>): number | null {
  const usable = values.filter((value): value is number => typeof value === "number");
  if (usable.length === 0) {
    return null;
  }

  const total = usable.reduce((acc, value) => acc + value, 0);
  return Number((total / usable.length).toFixed(2));
}

export function toNullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" ? value : null;
}

export function normalizeAnchorDate(anchorDate?: Date): Date {
  const current = anchorDate ? new Date(anchorDate) : new Date();
  current.setUTCHours(0, 0, 0, 0);
  return current;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function toDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function listIsoDates(fromDate: string, toDate: string): string[] {
  const from = toDateOnly(fromDate);
  const to = toDateOnly(toDate);
  const dates: string[] = [];

  for (let current = new Date(from); current <= to; current = addDays(current, 1)) {
    dates.push(toISODate(current));
  }

  return dates;
}

export function buildRangeWindow(params: RangeAnchorParams): RangeWindow {
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

export function clampIndex(value: number): number {
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

export function normalizeIndex(value: number, reference: number): number {
  if (reference <= 0 || value <= 0) {
    return 0;
  }

  return clampIndex((value / reference) * 100);
}

export function collapsePointsByDate(points: MeasurementPoint[]): MeasurementPoint[] {
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

export function extractClinicalMeasurementPoints(params: {
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

export const ZONE_LABEL_BY_VALUE: Record<ZoneValue, string> = {
  0: "Safe",
  1: "Stage 1",
  2: "Stage 2",
  3: "Stage 3",
  4: "Stage 4"
};

export function buildBox01Zones(): Box01ZoneDefinition[] {
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

export function toSeriesPoints(
  points: MeasurementPoint[],
  mapper: (point: MeasurementPoint) => ZoneValue | null
): Box01SeriesPoint[] {
  return points.map((point) => ({
    date: point.date,
    rawValue: Number(point.rawValue.toFixed(2)),
    zoneValue: mapper(point)
  }));
}

export function comparatorPrefix(comparator: ClinicalMeasurementComparator): string {
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

export function computeRiskPercentile(params: {
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

export function riskPercentileToZone(percentile: number): ZoneValue {
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

export function mapRelativePointToZone(params: {
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

export function matchesEarlyCkdContext(contextText?: string): boolean {
  if (!contextText) {
    return false;
  }

  return /\b(early|initial|possible|suspected)?\s*(ckd|kidney|renal)\b/i.test(contextText);
}

export function mapCreatinineToZone(rawValue: number, contextText?: string): ZoneValue {
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

export function mapSdmaToZone(rawValue: number): ZoneValue {
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

export function sortClinicalEventsAscending(events: ContentClinicalEvent[]): ContentClinicalEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function extractClinicalObservations(params: {
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

export function formatObservationValueText(observation: ClinicalObservation): string {
  const prefix = comparatorPrefix(observation.comparator);
  const unit = observation.unit ? ` ${observation.unit}` : "";
  return `${prefix}${observation.rawValue}${unit}`;
}

export const CLINICAL_METRICS: ReadonlyArray<{ key: string; label: string }> = [
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

export const CLINICAL_METRIC_LABEL_BY_KEY = new Map(CLINICAL_METRICS.map((metric) => [metric.key, metric.label]));
