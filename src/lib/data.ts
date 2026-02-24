import { deriveCurrentAlerts, deriveDashboardPayload, deriveIssueInsights, deriveLogs, filterLogs } from "@/content/derive";
import { loadContent } from "@/content/load";
import type {
  AlertItem,
  ContentClinicalEvent,
  ContentDailyLifeEntry,
  DailyLogRecord,
  DashboardPayload,
  IssueInsightItem,
  QuickViewFeedItem,
  QuickViewPayload
} from "@/lib/contracts";

interface LogFilter {
  from?: string;
  to?: string;
  limit?: number;
}

const QUICK_VIEW_SOURCE_PRIORITY: Record<QuickViewFeedItem["type"], number> = {
  clinical_event: 0,
  milestone_log: 1,
  daily_life: 2
};

async function loadDerivedContent(): Promise<{
  logs: DailyLogRecord[];
  lexiconTerms: Awaited<ReturnType<typeof loadContent>>["lexiconTerms"];
  dailyLifeEntries: ContentDailyLifeEntry[];
  clinicalEvents: ContentClinicalEvent[];
}> {
  const content = await loadContent();

  return {
    logs: deriveLogs(content.logs, content.thresholds),
    lexiconTerms: content.lexiconTerms,
    dailyLifeEntries: content.dailyLifeEntries,
    clinicalEvents: content.clinicalEvents
  };
}

export async function listLogs(filter: LogFilter = {}): Promise<DailyLogRecord[]> {
  const { logs } = await loadDerivedContent();
  return filterLogs(logs, filter);
}

export async function getDashboardPayload(range: "7d" | "30d" | "90d" = "30d"): Promise<DashboardPayload> {
  const { logs, lexiconTerms } = await loadDerivedContent();

  return deriveDashboardPayload({
    range,
    logs,
    lexiconTerms
  });
}

export async function getCurrentAlerts(limit = 15): Promise<AlertItem[]> {
  const { logs } = await loadDerivedContent();
  return deriveCurrentAlerts(logs, limit);
}

export async function listClinicalEvents(filter: { from?: string; to?: string; limit?: number } = {}): Promise<ContentClinicalEvent[]> {
  const { clinicalEvents } = await loadDerivedContent();

  const filtered = sortClinicalEventsDescending(clinicalEvents).filter((event) => {
    if (filter.from && event.date < filter.from) {
      return false;
    }
    if (filter.to && event.date > filter.to) {
      return false;
    }
    return true;
  });

  return filtered.slice(0, filter.limit ?? 200);
}

export async function listDailyLifeEntries(filter: { from?: string; to?: string; limit?: number } = {}): Promise<ContentDailyLifeEntry[]> {
  const { dailyLifeEntries } = await loadDerivedContent();

  const filtered = sortDailyLifeEntriesDescending(dailyLifeEntries).filter((entry) => {
    if (filter.from && entry.date < filter.from) {
      return false;
    }
    if (filter.to && entry.date > filter.to) {
      return false;
    }
    return true;
  });

  return filtered.slice(0, filter.limit ?? 200);
}

export async function getRecentIssues(params: {
  days: number;
  limit: number;
}): Promise<{ windowDays: number; topIssues: IssueInsightItem[]; totalAnalyzedLogs: number }> {
  const { logs, lexiconTerms } = await loadDerivedContent();

  const insights = deriveIssueInsights({
    logs,
    lexiconTerms,
    days: params.days,
    limit: params.limit,
    includeSnippets: true
  });

  return {
    windowDays: insights.windowDays,
    topIssues: insights.topIssues,
    totalAnalyzedLogs: insights.totalAnalyzedLogs
  };
}

function sortClinicalEventsDescending(events: ContentClinicalEvent[]): ContentClinicalEvent[] {
  return [...events].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function sortDailyLifeEntriesDescending(entries: ContentDailyLifeEntry[]): ContentDailyLifeEntry[] {
  return [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id)
  );
}

function feedDateTimeFromDate(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function toQuickViewFeed(params: {
  clinicalEvents: ContentClinicalEvent[];
  logs: DailyLogRecord[];
  dailyLifeEntries: ContentDailyLifeEntry[];
}): QuickViewFeedItem[] {
  const eventItems: QuickViewFeedItem[] = params.clinicalEvents.map((event) => ({
    id: `clinical-${event.id}`,
    dateTime: feedDateTimeFromDate(event.date),
    date: event.date,
    type: "clinical_event",
    title: event.title,
    summary: event.summary,
    sourceRef: {
      collection: "clinical-events",
      id: event.id
    }
  }));

  const logItems: QuickViewFeedItem[] = params.logs.map((log) => ({
    id: `log-${log.id}`,
    dateTime: log.updatedAt || feedDateTimeFromDate(log.date),
    date: log.date,
    type: "milestone_log",
    title: `Milestone Log (${log.mode.replace("_", " ")})`,
    summary: log.notes?.trim() || "Structured check-in without note text.",
    sourceRef: {
      collection: "logs",
      id: log.id
    }
  }));

  const dailyItems: QuickViewFeedItem[] = params.dailyLifeEntries.map((entry) => ({
    id: `daily-${entry.id}`,
    dateTime: entry.updatedAt || feedDateTimeFromDate(entry.date),
    date: entry.date,
    type: "daily_life",
    title: entry.title,
    summary: entry.notes,
    tags: entry.tags,
    sourceRef: {
      collection: "daily-life",
      id: entry.id
    }
  }));

  return [...eventItems, ...logItems, ...dailyItems].sort((a, b) => {
    const byDateTime = b.dateTime.localeCompare(a.dateTime);
    if (byDateTime !== 0) {
      return byDateTime;
    }

    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) {
      return byDate;
    }

    const bySourcePriority = QUICK_VIEW_SOURCE_PRIORITY[a.type] - QUICK_VIEW_SOURCE_PRIORITY[b.type];
    if (bySourcePriority !== 0) {
      return bySourcePriority;
    }

    return a.id.localeCompare(b.id);
  });
}

export async function getQuickViewPayload(range: "7d" | "30d" | "90d" = "30d"): Promise<QuickViewPayload> {
  const { logs, lexiconTerms, dailyLifeEntries, clinicalEvents } = await loadDerivedContent();
  const sortedClinicalEvents = sortClinicalEventsDescending(clinicalEvents);
  const sortedDailyLifeEntries = sortDailyLifeEntriesDescending(dailyLifeEntries);

  return {
    dashboard: deriveDashboardPayload({
      range,
      logs,
      lexiconTerms
    }),
    clinicalEvents: sortedClinicalEvents,
    logs,
    dailyLifeEntries: sortedDailyLifeEntries,
    feed: toQuickViewFeed({
      clinicalEvents: sortedClinicalEvents,
      logs,
      dailyLifeEntries: sortedDailyLifeEntries
    })
  };
}
