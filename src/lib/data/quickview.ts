import { deriveDashboardPayload } from "@/content/derive";
import { DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT } from "@/lib/board-layout";
import type {
  ContentClinicalEvent,
  ContentDailyLifeEntry,
  DashboardVisualPayload,
  DailyLogRecord,
  QuickViewFeedItem,
  QuickViewPayload,
  SelectedLogDetail,
  ThreadLogItem,
  ThreadPagination
} from "@/lib/contracts";

import { loadDerivedContent } from "./content-source";
import {
  clampInteger,
  clipText,
  compactText,
  feedDateTimeFromDate,
  sortClinicalEventsDescending,
  sortDailyLifeEntriesDescending
} from "./shared";

const QUICK_VIEW_SOURCE_PRIORITY: Record<QuickViewFeedItem["type"], number> = {
  clinical_event: 0,
  milestone_log: 1,
  daily_life: 2
};

const THREAD_SOURCE_PRIORITY: Record<ThreadLogItem["type"], number> = {
  milestone_log: 0,
  daily_life: 1
};

const THREAD_PAGE_SIZE = 8;

function toQuickViewFeed(params: {
  clinicalEvents: ContentClinicalEvent[];
  medicalLogs: DailyLogRecord[];
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

  const logItems: QuickViewFeedItem[] = params.medicalLogs.map((medicalLog) => ({
    id: `log-${medicalLog.id}`,
    dateTime: medicalLog.updatedAt || feedDateTimeFromDate(medicalLog.date),
    date: medicalLog.date,
    type: "milestone_log",
    title: `Milestone Log (${medicalLog.mode.replace("_", " ")})`,
    summary: medicalLog.notes?.trim() || "Structured check-in without note text.",
    sourceRef: {
      collection: "logs",
      id: medicalLog.id
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

function sortThreadItemsDescending(items: ThreadLogItem[]): ThreadLogItem[] {
  return [...items].sort((a, b) => {
    const byDateTime = b.dateTime.localeCompare(a.dateTime);
    if (byDateTime !== 0) {
      return byDateTime;
    }

    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) {
      return byDate;
    }

    const bySourcePriority = THREAD_SOURCE_PRIORITY[a.type] - THREAD_SOURCE_PRIORITY[b.type];
    if (bySourcePriority !== 0) {
      return bySourcePriority;
    }

    return a.id.localeCompare(b.id);
  });
}

function toThreadItems(feed: QuickViewFeedItem[]): ThreadLogItem[] {
  const items: ThreadLogItem[] = [];

  for (const item of feed) {
    if (item.type === "daily_life") {
      items.push({
        id: item.id,
        type: "daily_life",
        date: item.date,
        dateTime: item.dateTime,
        title: item.title,
        preview: clipText(compactText(item.summary)),
        tags: item.tags ?? [],
        sourceId: item.sourceRef.id
      });
      continue;
    }

    if (item.type === "milestone_log") {
      items.push({
        id: item.id,
        type: "milestone_log",
        date: item.date,
        dateTime: item.dateTime,
        title: item.title,
        preview: clipText(compactText(item.summary)),
        sourceId: item.sourceRef.id
      });
    }
  }

  return sortThreadItemsDescending(items);
}

function toSelectedDetail(params: {
  selectedItem: ThreadLogItem;
  medicalLogsById: Map<string, DailyLogRecord>;
  dailyLifeById: Map<string, ContentDailyLifeEntry>;
}): SelectedLogDetail | null {
  if (params.selectedItem.type === "daily_life") {
    const entry = params.dailyLifeById.get(params.selectedItem.sourceId);
    if (!entry) {
      return null;
    }

    return {
      id: params.selectedItem.id,
      type: "daily_life",
      date: entry.date,
      dateTime: entry.updatedAt || feedDateTimeFromDate(entry.date),
      title: entry.title,
      notes: entry.notes,
      tags: entry.tags ?? [],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    };
  }

  const medicalLog = params.medicalLogsById.get(params.selectedItem.sourceId);
  if (!medicalLog) {
    return null;
  }

  return {
    id: params.selectedItem.id,
    type: "milestone_log",
    date: medicalLog.date,
    dateTime: medicalLog.updatedAt || feedDateTimeFromDate(medicalLog.date),
    title: params.selectedItem.title,
    mode: medicalLog.mode,
    notes: medicalLog.notes ?? "No note text for this milestone entry.",
    createdBy: medicalLog.createdBy,
    createdAt: medicalLog.createdAt,
    updatedAt: medicalLog.updatedAt,
    medications: medicalLog.medications,
    metrics: {
      waterIntakeOz: medicalLog.waterIntakeOz,
      appetiteScore: medicalLog.appetiteScore,
      energyScore: medicalLog.energyScore,
      vomitingCount: medicalLog.vomitingCount,
      urinationScore: medicalLog.urinationScore,
      stoolScore: medicalLog.stoolScore,
      weightLb: medicalLog.weightLb
    }
  };
}

function paginateThreadItems(
  items: ThreadLogItem[],
  requestedPage: number | undefined
): { visibleItems: ThreadLogItem[]; pagination: ThreadPagination } {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / THREAD_PAGE_SIZE));
  const initialPage = clampInteger(requestedPage, 1);
  const page = Math.min(initialPage, totalPages);
  const start = (page - 1) * THREAD_PAGE_SIZE;
  const visibleItems = items.slice(start, start + THREAD_PAGE_SIZE);

  return {
    visibleItems,
    pagination: {
      page,
      pageSize: THREAD_PAGE_SIZE,
      totalItems,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    }
  };
}

export async function getDashboardVisualPayload(params: {
  range?: "7d" | "30d" | "90d";
  selected?: string | null;
  threadPage?: number;
} = {}): Promise<DashboardVisualPayload> {
  const range = params.range ?? "30d";
  const { medicalLogs, lexiconTerms, dailyLifeEntries, clinicalEvents } = await loadDerivedContent();
  const sortedClinicalEvents = sortClinicalEventsDescending(clinicalEvents);
  const sortedDailyLifeEntries = sortDailyLifeEntriesDescending(dailyLifeEntries);
  const quickViewFeed = toQuickViewFeed({
    clinicalEvents: sortedClinicalEvents,
    medicalLogs,
    dailyLifeEntries: sortedDailyLifeEntries
  });

  const threadItems = toThreadItems(quickViewFeed);
  const { visibleItems: visibleThreadItems, pagination: threadPagination } = paginateThreadItems(threadItems, params.threadPage);
  const selectedItem =
    threadItems.find((item) => item.id === params.selected) ?? visibleThreadItems[0] ?? threadItems[0] ?? null;
  const medicalLogsById = new Map(medicalLogs.map((medicalLog) => [medicalLog.id, medicalLog]));
  const dailyLifeById = new Map(sortedDailyLifeEntries.map((entry) => [entry.id, entry]));
  const inspectorDetail = selectedItem
    ? toSelectedDetail({
        selectedItem,
        medicalLogsById,
        dailyLifeById
      })
    : null;

  return {
    dashboard: deriveDashboardPayload({
      range,
      logs: medicalLogs,
      lexiconTerms
    }),
    clinicalEvents: sortedClinicalEvents,
    threadItems,
    visibleThreadItems,
    threadPagination,
    selectedItem,
    inspectorDetail,
    boardLayout: DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT
  };
}

export async function getQuickViewPayload(range: "7d" | "30d" | "90d" = "30d"): Promise<QuickViewPayload> {
  const { medicalLogs, lexiconTerms, dailyLifeEntries, clinicalEvents } = await loadDerivedContent();
  const sortedClinicalEvents = sortClinicalEventsDescending(clinicalEvents);
  const sortedDailyLifeEntries = sortDailyLifeEntriesDescending(dailyLifeEntries);

  return {
    dashboard: deriveDashboardPayload({
      range,
      logs: medicalLogs,
      lexiconTerms
    }),
    clinicalEvents: sortedClinicalEvents,
    logs: medicalLogs,
    dailyLifeEntries: sortedDailyLifeEntries,
    feed: toQuickViewFeed({
      clinicalEvents: sortedClinicalEvents,
      medicalLogs,
      dailyLifeEntries: sortedDailyLifeEntries
    })
  };
}
