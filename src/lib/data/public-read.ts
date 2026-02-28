import {
  deriveCurrentAlerts as deriveCurrentAlertsFromThresholds,
  deriveDashboardPayload,
  deriveIssueInsights,
  filterLogs
} from "@/content/derive";
import type { AlertItem, ContentClinicalEvent, ContentDailyLifeEntry, DashboardPayload, DailyLogRecord, IssueInsightItem } from "@/lib/contracts";

import { loadDerivedContent } from "./content-source";
import { sortClinicalEventsDescending, sortDailyLifeEntriesDescending } from "./shared";

export interface LogFilter {
  from?: string;
  to?: string;
  limit?: number;
}

export async function listLogs(filter: LogFilter = {}): Promise<DailyLogRecord[]> {
  const { medicalLogs } = await loadDerivedContent();
  return filterLogs(medicalLogs, filter);
}

export async function getDashboardPayload(range: "7d" | "30d" | "90d" = "30d"): Promise<DashboardPayload> {
  const { medicalLogs, lexiconTerms } = await loadDerivedContent();

  return deriveDashboardPayload({
    range,
    logs: medicalLogs,
    lexiconTerms
  });
}

export async function getCurrentAlerts(limit = 15): Promise<AlertItem[]> {
  const { medicalLogs } = await loadDerivedContent();
  return deriveCurrentAlertsFromThresholds(medicalLogs, limit);
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

export async function listDailyLifeEntries(filter: {
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<ContentDailyLifeEntry[]> {
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
  const { medicalLogs, lexiconTerms } = await loadDerivedContent();

  const insights = deriveIssueInsights({
    logs: medicalLogs,
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
