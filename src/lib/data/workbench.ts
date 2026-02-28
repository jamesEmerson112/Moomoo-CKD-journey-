import { deriveBox01Workbench, deriveBox02Workbench, deriveBox03Workbench } from "@/content/derive";
import { DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT } from "@/lib/board-layout";
import { toISODate } from "@/lib/date";
import type { BoardBoxId, ContentClinicalEvent, DailyLogRecord, LabWorkbenchPayload, LabWorkbenchRange, LabWorkbenchTab, WorkbenchBoxId } from "@/lib/contracts";

import { loadDerivedContent } from "./content-source";

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

function resolveAllTimeWindow(medicalLogs: DailyLogRecord[], clinicalEvents: ContentClinicalEvent[]): { fromDate: string; toDate: string } {
  const allDates = [...medicalLogs.map((medicalLog) => medicalLog.date), ...clinicalEvents.map((event) => event.date)].sort((a, b) =>
    a.localeCompare(b)
  );

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
  const { medicalLogs, clinicalEvents } = await loadDerivedContent();
  const allTimeWindow = resolveAllTimeWindow(medicalLogs, clinicalEvents);
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
      logs: medicalLogs,
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
