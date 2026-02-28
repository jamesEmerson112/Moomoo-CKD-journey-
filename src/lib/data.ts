import {
  deriveBox01Workbench,
  deriveBox02Workbench,
  deriveBox03Workbench,
  deriveBurdenWindow,
  deriveConsistencyPct,
  deriveCurrentAlerts,
  deriveDailyBurdenSeries,
  deriveDashboardPayload,
  deriveHybridAlertsFromNotes,
  deriveIssueInsights,
  deriveLogs,
  deriveWeightDelta,
  deriveWeightedIssueSeries,
  filterLogs
} from "@/content/derive";
import { loadContent } from "@/content/load";
import { DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT } from "@/lib/board-layout";
import { parseRangeToDays, startDateForRange, toISODate } from "@/lib/date";
import type {
  AlertItem,
  BoardBoxId,
  ClinicalMeasurementComparator,
  ContentClinicalEvent,
  ContentDailyLifeEntry,
  DashboardVisualPayload,
  DailyLogRecord,
  DashboardPayload,
  IssueInsightItem,
  LabWorkbenchRange,
  LabWorkbenchPayload,
  LabWorkbenchTab,
  MainboardPayload,
  MeasurementSnapshotItem,
  QuickViewFeedItem,
  QuickViewPayload,
  SelectedLogDetail,
  ThreadLogItem,
  ThreadPagination,
  WorkbenchBoxId
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

const THREAD_SOURCE_PRIORITY: Record<ThreadLogItem["type"], number> = {
  milestone_log: 0,
  daily_life: 1
};

const THREAD_PAGE_SIZE = 8;
const WORKBENCH_BOX_IDS: ReadonlyArray<WorkbenchBoxId> = [
  "box-01",
  "box-02",
  "box-03",
  "box-04",
  "box-05",
  "box-06",
  "box-07",
  "box-08",
  "box-09",
  "box-10"
];

const WORKBENCH_IMPLEMENTED_BOXES = new Set<WorkbenchBoxId>(["box-01", "box-02", "box-03"]);

const WORKBENCH_TITLE_OVERRIDES: Partial<Record<WorkbenchBoxId, string>> = {
  "box-01": "Weight Trend",
  "box-02": "Higher-is-Worse Clinicals",
  "box-03": "Lower-is-Worse Clinicals"
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

function formatSignedValue(value: number, digits: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
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

function buildLatestWeightByDate(logs: DailyLogRecord[]): Map<string, number> {
  const latestWeightByDate = new Map<string, number>();

  for (const log of [...logs].sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt))) {
    if (typeof log.weightLb === "number") {
      latestWeightByDate.set(log.date, log.weightLb);
    }
  }

  return latestWeightByDate;
}

function buildMainboardTrendSeries(params: {
  burdenSeries: ReturnType<typeof deriveDailyBurdenSeries>;
  logs: DailyLogRecord[];
}): MainboardPayload["trendSeries"] {
  const latestWeightByDate = buildLatestWeightByDate(params.logs);

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
  const { logs, lexiconTerms, clinicalEvents } = await loadDerivedContent();
  const days = parseRangeToDays(range);
  const rangeWindow = mainboardRangeWindow(days);
  const sortedClinicalEvents = sortClinicalEventsDescending(clinicalEvents);
  const logsInRange = filterLogs(logs, {
    from: rangeWindow.fromDate,
    to: rangeWindow.toDate,
    limit: 365
  });

  const weightDelta = deriveWeightDelta({
    logs,
    days
  });
  const burdenWindow = deriveBurdenWindow({
    logs,
    lexiconTerms,
    days
  });
  const burdenSeries = deriveDailyBurdenSeries({
    logs,
    lexiconTerms,
    days
  });
  const consistency = deriveConsistencyPct({
    logs,
    days
  });
  const issueSeries = deriveWeightedIssueSeries({
    logs,
    lexiconTerms,
    days,
    limit: 5
  });
  const hybridAlerts = deriveHybridAlertsFromNotes({
    logs,
    lexiconTerms,
    days
  });

  const trendSeries = buildMainboardTrendSeries({
    burdenSeries,
    logs
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

function isWorkbenchBoxId(value: string | null | undefined): value is WorkbenchBoxId {
  if (!value) {
    return false;
  }
  return WORKBENCH_BOX_IDS.includes(value as WorkbenchBoxId);
}

function resolveWorkbenchBoxId(value: string | null | undefined): WorkbenchBoxId {
  if (isWorkbenchBoxId(value)) {
    return value;
  }
  return "box-01";
}

function isLabWorkbenchRange(value: string | null | undefined): value is LabWorkbenchRange {
  return value === "all" || value === "7d" || value === "30d" || value === "90d";
}

function resolveLabWorkbenchRange(value: string | null | undefined): LabWorkbenchRange {
  if (isLabWorkbenchRange(value)) {
    return value;
  }
  return "all";
}

function rangeToDaysForLab(range: LabWorkbenchRange): number {
  if (range === "7d") {
    return 7;
  }
  if (range === "90d") {
    return 90;
  }
  return 30;
}

function resolveAllTimeWindow(logs: DailyLogRecord[], clinicalEvents: ContentClinicalEvent[]): { fromDate: string; toDate: string } {
  const allDates = [...logs.map((log) => log.date), ...clinicalEvents.map((event) => event.date)].sort((a, b) => a.localeCompare(b));

  if (allDates.length === 0) {
    const today = toISODate(new Date());
    return {
      fromDate: today,
      toDate: today
    };
  }

  return {
    fromDate: allDates[0],
    toDate: allDates[allDates.length - 1]
  };
}

function buildLabWorkbenchTabs(): LabWorkbenchTab[] {
  const titleById = new Map<BoardBoxId, string>(
    DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT.boxes.map((box) => [box.id, box.title])
  );

  return WORKBENCH_BOX_IDS.map((id) => ({
    id,
    title: WORKBENCH_TITLE_OVERRIDES[id] ?? titleById.get(id) ?? id,
    implemented: WORKBENCH_IMPLEMENTED_BOXES.has(id)
  }));
}

export async function getLabWorkbenchPayload(params: {
  range?: LabWorkbenchRange;
  box?: string | null;
} = {}): Promise<LabWorkbenchPayload> {
  const range = resolveLabWorkbenchRange(params.range);
  const activeBoxId = resolveWorkbenchBoxId(params.box);
  const tabs = buildLabWorkbenchTabs();
  const { logs, clinicalEvents } = await loadDerivedContent();
  const allTimeWindow = resolveAllTimeWindow(logs, clinicalEvents);
  const days = rangeToDaysForLab(range);
  const explicitWindow =
    range === "all"
      ? {
          fromDate: allTimeWindow.fromDate,
          toDate: allTimeWindow.toDate
        }
      : undefined;

  return {
    activeBoxId,
    range,
    tabs,
    box01: deriveBox01Workbench({
      logs,
      clinicalEvents,
      days,
      window: explicitWindow
    }),
    box02: deriveBox02Workbench({
      clinicalEvents,
      days,
      window: explicitWindow
    }),
    box03: deriveBox03Workbench({
      clinicalEvents,
      days,
      window: explicitWindow
    })
  };
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

function sortLogsWindowStart(days: 7 | 30 | 90): string {
  return toISODate(startDateForRange(days));
}

function mainboardRangeWindow(days: 7 | 30 | 90): { fromDate: string; toDate: string } {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  return {
    fromDate: sortLogsWindowStart(days),
    toDate: toISODate(now)
  };
}

function sortDailyLifeEntriesDescending(entries: ContentDailyLifeEntry[]): ContentDailyLifeEntry[] {
  return [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id)
  );
}

function feedDateTimeFromDate(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clipText(value: string, maxLength = 120): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
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
  logsById: Map<string, DailyLogRecord>;
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

  const log = params.logsById.get(params.selectedItem.sourceId);
  if (!log) {
    return null;
  }

  return {
    id: params.selectedItem.id,
    type: "milestone_log",
    date: log.date,
    dateTime: log.updatedAt || feedDateTimeFromDate(log.date),
    title: params.selectedItem.title,
    mode: log.mode,
    notes: log.notes ?? "No note text for this milestone entry.",
    createdBy: log.createdBy,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
    medications: log.medications,
    metrics: {
      waterIntakeOz: log.waterIntakeOz,
      appetiteScore: log.appetiteScore,
      energyScore: log.energyScore,
      vomitingCount: log.vomitingCount,
      urinationScore: log.urinationScore,
      stoolScore: log.stoolScore,
      weightLb: log.weightLb
    }
  };
}

function clampInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value as number);
  if (normalized < 1) {
    return fallback;
  }

  return normalized;
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
  const { logs, lexiconTerms, dailyLifeEntries, clinicalEvents } = await loadDerivedContent();
  const sortedClinicalEvents = sortClinicalEventsDescending(clinicalEvents);
  const sortedDailyLifeEntries = sortDailyLifeEntriesDescending(dailyLifeEntries);
  const quickViewFeed = toQuickViewFeed({
    clinicalEvents: sortedClinicalEvents,
    logs,
    dailyLifeEntries: sortedDailyLifeEntries
  });

  const threadItems = toThreadItems(quickViewFeed);
  const { visibleItems: visibleThreadItems, pagination: threadPagination } = paginateThreadItems(threadItems, params.threadPage);
  const selectedItem =
    threadItems.find((item) => item.id === params.selected) ?? visibleThreadItems[0] ?? threadItems[0] ?? null;
  const logsById = new Map(logs.map((log) => [log.id, log]));
  const dailyLifeById = new Map(sortedDailyLifeEntries.map((entry) => [entry.id, entry]));
  const inspectorDetail = selectedItem
    ? toSelectedDetail({
        selectedItem,
        logsById,
        dailyLifeById
      })
    : null;

  return {
    dashboard: deriveDashboardPayload({
      range,
      logs,
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
