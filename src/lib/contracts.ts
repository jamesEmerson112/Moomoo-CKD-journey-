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
