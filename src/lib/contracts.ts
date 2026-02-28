export type LogMode = "full" | "quick_text";

export interface MedicationInput {
  name: string;
  dose?: string | null;
  taken: boolean;
}

interface LogBaseInput {
  date: string;
  medications?: MedicationInput[];
  weightLb?: number | null;
  notes?: string | null;
}

export interface FullDailyLogInput extends LogBaseInput {
  mode: "full";
  waterIntakeOz: number;
  appetiteScore: number;
  energyScore: number;
  vomitingCount: number;
  urinationScore: number;
  stoolScore: number;
}

export interface QuickTextLogInput extends Omit<LogBaseInput, "notes"> {
  mode: "quick_text";
  notes: string;
  waterIntakeOz?: number | null;
  appetiteScore?: number | null;
  energyScore?: number | null;
  vomitingCount?: number | null;
  urinationScore?: number | null;
  stoolScore?: number | null;
}

export type DailyLogInput = FullDailyLogInput | QuickTextLogInput;

interface ContentLogMetadata {
  id: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ContentLogEntry = (FullDailyLogInput | QuickTextLogInput) & ContentLogMetadata;

export interface DailyLogRecord {
  id: string;
  date: string;
  mode: LogMode;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  medications: MedicationInput[];
  waterIntakeOz: number | null;
  appetiteScore: number | null;
  energyScore: number | null;
  vomitingCount: number | null;
  urinationScore: number | null;
  stoolScore: number | null;
  weightLb: number | null;
  notes: string | null;
  alerts?: AlertItem[];
}

export interface ThresholdSettings {
  waterIntakeMinOz: number;
  appetiteMin: number;
  energyMin: number;
  vomitingMax: number;
  urinationMin: number;
  stoolMin: number;
  weightLossPctWarn: number;
}

export interface AlertItem {
  severity: "warning" | "critical";
  metric: string;
  message: string;
  date: string;
  source: "threshold-default" | "threshold-override";
}

export interface ContextEvent {
  id: string;
  type: "daily_log";
  date: string;
  canonicalText: string;
  metadata: Record<string, unknown>;
}

export interface IssueInsightItem {
  issueKey: string;
  label: string;
  count: number;
  lastSeenDate: string;
  latestSnippet?: string | null;
}

export interface IssueInsightSeriesPoint {
  date: string;
  counts: Record<string, number>;
}

export interface IssueInsights {
  windowDays: number;
  topIssues: IssueInsightItem[];
  dailySeries: IssueInsightSeriesPoint[];
  totalAnalyzedLogs: number;
}

export interface DashboardPayload {
  range: "7d" | "30d" | "90d";
  latestLog: DailyLogRecord | null;
  alerts: AlertItem[];
  trend: DailyLogRecord[];
  issueInsights: IssueInsights;
  stats: {
    avgWaterIntakeOz: number | null;
    avgAppetiteScore: number | null;
    avgEnergyScore: number | null;
    totalVomitingEvents: number;
  };
}

export type BoardLayoutPreset = "desktop_1440_no_scroll";

export type BoardBoxId =
  | "box-01"
  | "box-02"
  | "box-03"
  | "box-04"
  | "box-05"
  | "box-06"
  | "box-07"
  | "box-08"
  | "box-09"
  | "box-10";

export type BoardBoxKind =
  | "kpi_latest_log"
  | "kpi_weight_delta"
  | "kpi_issue_burden"
  | "kpi_logging_consistency"
  | "trend_metrics"
  | "soft_alerts"
  | "issues_rank"
  | "issues_daily_stack"
  | "clinical_events"
  | "measurement_snapshot";

export interface BoardBoxDefinition {
  id: BoardBoxId;
  title: string;
  kind: BoardBoxKind;
  gridArea: string;
  priority: number;
}

export interface BoardLayout {
  preset: BoardLayoutPreset;
  boxes: BoardBoxDefinition[];
}

export type MainboardKpiBadge = "Text-derived" | "Numeric (weight)" | "NLP-derived" | "Coverage";

export interface MainboardKpiValue {
  value: string;
  detail?: string;
  badge: MainboardKpiBadge;
}

export interface MainboardKpiSet {
  latestLogDate: MainboardKpiValue;
  weightDelta: MainboardKpiValue & {
    latestWeightLb: number | null;
    baselineWeightLb: number | null;
    deltaLb: number | null;
    deltaPct: number | null;
  };
  issueBurden: MainboardKpiValue & {
    index: number;
    rawScore: number;
    referencePeak: number;
  };
  loggingConsistency: MainboardKpiValue & {
    percent: number;
    loggedDays: number;
    gapDays: number;
    rangeDays: number;
  };
}

export interface BurdenSeriesPoint {
  date: string;
  rawScore: number;
  index: number;
}

export interface MainboardTrendPoint {
  date: string;
  weightLb: number | null;
  burdenRaw: number;
  burdenIndex: number;
}

export interface HybridAlertChip {
  id: string;
  triggerId: "oral_bleeding" | "oral_dysfunction" | "vomiting_spike" | "appetite_crisis" | "respiratory_stress" | null;
  severity: "warning" | "critical";
  label: string;
  message: string;
  date: string;
  source: "threshold" | "nlp";
}

export interface IssueWeightedRankItem {
  issueKey: string;
  label: string;
  weightedScore: number;
  mentionCount: number;
  lastSeenDate: string;
}

export interface IssueWeightedSeriesPoint {
  date: string;
  scores: Record<string, number>;
}

export interface MeasurementSnapshotItem {
  key: string;
  label: string;
  valueText: string;
  date: string;
}

export interface MainboardPayload {
  range: "7d" | "30d" | "90d";
  kpis: MainboardKpiSet;
  trendSeries: MainboardTrendPoint[];
  hybridAlerts: HybridAlertChip[];
  issueRank: IssueWeightedRankItem[];
  issueDailyWeightedSeries: IssueWeightedSeriesPoint[];
  clinicalEventsRecent: ContentClinicalEvent[];
  measurementSnapshot: MeasurementSnapshotItem[];
  boardLayout: BoardLayout;
}

export type WorkbenchBoxId = BoardBoxId;

export type LabWorkbenchRange = "all" | "7d" | "30d" | "90d";

export interface LabWorkbenchTab {
  id: WorkbenchBoxId;
  title: string;
  implemented: boolean;
}

export interface Box01ZoneDefinition {
  zone: 0 | 1 | 2 | 3 | 4;
  label: string;
  meaning: string;
  color: string;
}

export type Box01SeriesSource = "log" | "clinical_event" | "merged";

export interface Box01SeriesPoint {
  date: string;
  rawValue: number | null;
  zoneValue: number | null;
}

export interface Box01Series {
  metricKey: string;
  metricLabel: string;
  source: Box01SeriesSource;
  points: Box01SeriesPoint[];
}

export interface Box01LegendItem {
  metricKey: string;
  metricLabel: string;
  source: Box01SeriesSource;
  assumed?: boolean;
  staged: boolean;
  direction?: "higher_worse" | "lower_worse";
}

export interface Box01WeightPoint {
  date: string;
  weightLb: number;
  source: "merged";
}

export interface Box01WorkbenchPayload {
  healthyReferenceLb: number;
  series: Box01WeightPoint[];
  yAxis: {
    min: number;
    max: number;
  };
  notes: {
    stagedPolicyText: string;
    nonStagedPolicyText: string;
  };
}

export type ClinicalSeverityZone = 0 | 1 | 2 | 3 | 4;

export type ClinicalMappingKind = "iris_staged" | "relative_non_staged";

export interface DirectionalClinicalMetricRow {
  metricKey: string;
  metricLabel: string;
  valueText: string;
  date: string;
  source: Box01SeriesSource;
  severityZone: ClinicalSeverityZone;
  severityLabel: string;
  stale: boolean;
  mappingKind: ClinicalMappingKind;
}

export interface Box02WorkbenchPayload {
  rows: DirectionalClinicalMetricRow[];
  zones: Box01ZoneDefinition[];
  healthyBaselineZone: 0;
  series: Box01Series[];
  legend: Box01LegendItem[];
  yAxis: {
    min: 0;
    max: 4;
    ticks: [0, 1, 2, 3, 4];
  };
  notes: {
    stagedPolicyText: string;
    nonStagedPolicyText: string;
  };
}

export interface Box03WorkbenchPayload {
  rows: DirectionalClinicalMetricRow[];
  zones: Box01ZoneDefinition[];
  healthyBaselineZone: 0;
  series: Box01Series[];
  legend: Box01LegendItem[];
  yAxis: {
    min: 0;
    max: 4;
    ticks: [0, 1, 2, 3, 4];
  };
  notes: {
    stagedPolicyText: string;
    nonStagedPolicyText: string;
  };
}

export interface LabWorkbenchPayload {
  activeBoxId: WorkbenchBoxId;
  range: LabWorkbenchRange;
  tabs: LabWorkbenchTab[];
  box01?: Box01WorkbenchPayload;
  box02?: Box02WorkbenchPayload;
  box03?: Box03WorkbenchPayload;
}

export type ThreadLogType = "daily_life" | "milestone_log";

interface ThreadLogBase {
  id: string;
  type: ThreadLogType;
  date: string;
  dateTime: string;
  title: string;
  preview: string;
}

export interface DailyLifeThreadLogItem extends ThreadLogBase {
  type: "daily_life";
  tags: string[];
  sourceId: string;
}

export interface MilestoneThreadLogItem extends ThreadLogBase {
  type: "milestone_log";
  sourceId: string;
}

export type ThreadLogItem = DailyLifeThreadLogItem | MilestoneThreadLogItem;

export interface ThreadPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

interface SelectedLogDetailBase {
  id: string;
  type: ThreadLogType;
  date: string;
  dateTime: string;
  title: string;
}

export interface DailyLifeSelectedLogDetail extends SelectedLogDetailBase {
  type: "daily_life";
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneSelectedLogDetail extends SelectedLogDetailBase {
  type: "milestone_log";
  mode: LogMode;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  medications: MedicationInput[];
  metrics: {
    waterIntakeOz: number | null;
    appetiteScore: number | null;
    energyScore: number | null;
    vomitingCount: number | null;
    urinationScore: number | null;
    stoolScore: number | null;
    weightLb: number | null;
  };
}

export type SelectedLogDetail = DailyLifeSelectedLogDetail | MilestoneSelectedLogDetail;

export interface DashboardVisualPayload {
  dashboard: DashboardPayload;
  clinicalEvents: ContentClinicalEvent[];
  threadItems: ThreadLogItem[];
  visibleThreadItems: ThreadLogItem[];
  threadPagination: ThreadPagination;
  selectedItem: ThreadLogItem | null;
  inspectorDetail: SelectedLogDetail | null;
  boardLayout: BoardLayout;
}

export type QuickViewFeedItemType = "clinical_event" | "milestone_log" | "daily_life";

export interface QuickViewFeedItem {
  id: string;
  dateTime: string;
  date: string;
  type: QuickViewFeedItemType;
  title: string;
  summary: string;
  tags?: string[];
  sourceRef: {
    collection: "clinical-events" | "logs" | "daily-life";
    id: string;
  };
}

export interface QuickViewPayload {
  dashboard: DashboardPayload;
  clinicalEvents: ContentClinicalEvent[];
  logs: DailyLogRecord[];
  dailyLifeEntries: ContentDailyLifeEntry[];
  feed: QuickViewFeedItem[];
}

export interface ContentLexiconTerm {
  id: string;
  issueKey: string;
  label: string;
  phrase: string;
  normalizedPhrase: string;
  weight: number;
  isActive: boolean;
}

export interface ContentThresholds {
  thresholds: ThresholdSettings;
}

export interface ContentDailyLifeEntry {
  id: string;
  date: string;
  title: string;
  notes: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentDailyLife {
  entries: ContentDailyLifeEntry[];
}

export type ClinicalEventCategory = "historical" | "lab" | "exam" | "er" | "treatment_plan" | "home_observation";
export type ClinicalEventSource = "specialist_summary" | "home_log";
export type ClinicalEventConfidence = "confirmed" | "estimated" | "caregiver_report";
export type ClinicalMeasurementComparator = "exact" | "approx" | "gt" | "lt";

export interface ClinicalMeasurement {
  key: string;
  label: string;
  value: number;
  unit?: string | null;
  comparator: ClinicalMeasurementComparator;
  confidence: ClinicalEventConfidence;
  note?: string | null;
}

export interface ContentClinicalEvent {
  id: string;
  date: string;
  category: ClinicalEventCategory;
  title: string;
  summary: string;
  source: ClinicalEventSource;
  confidence: ClinicalEventConfidence;
  measurements?: ClinicalMeasurement[];
}

export interface ContentClinicalEvents {
  events: ContentClinicalEvent[];
}
