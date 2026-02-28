import { startDateForRange, toISODate } from "@/lib/date";
import type { ClinicalMeasurementComparator, ContentClinicalEvent, ContentDailyLifeEntry } from "@/lib/contracts";

export function formatSignedValue(value: number, digits: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
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

export function sortClinicalEventsDescending(events: ContentClinicalEvent[]): ContentClinicalEvent[] {
  return [...events].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function sortDailyLifeEntriesDescending(entries: ContentDailyLifeEntry[]): ContentDailyLifeEntry[] {
  return [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id)
  );
}

export function sortLogsWindowStart(days: 7 | 30 | 90): string {
  return toISODate(startDateForRange(days));
}

export function mainboardRangeWindow(days: 7 | 30 | 90): { fromDate: string; toDate: string } {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  return {
    fromDate: sortLogsWindowStart(days),
    toDate: toISODate(now)
  };
}

export function feedDateTimeFromDate(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function clipText(value: string, maxLength = 120): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function clampInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value as number);
  if (normalized < 1) {
    return fallback;
  }

  return normalized;
}
