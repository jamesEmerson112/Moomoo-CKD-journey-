import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  ContentClinicalEvent,
  ContentDailyLifeEntry,
  ContentLexiconTerm,
  ContentLogEntry,
  ThresholdSettings
} from "@/lib/contracts";
import { normalizePhrase } from "@/lib/nlp";

import {
  contentClinicalEventsFileSchema,
  contentDailyLifeFileSchema,
  contentLexiconFileSchema,
  contentLogsFileSchema,
  contentThresholdsFileSchema,
  type ContentClinicalEventsFile,
  type ContentDailyLifeFile,
  type ContentLexiconFile,
  type ContentLogsFile,
  type ContentThresholdsFile
} from "@/content/schema";

const CONTENT_DIR = path.join(process.cwd(), "content");
const MEDICAL_LOGS_FILE = path.join(CONTENT_DIR, "medical_logs.json");
const LEXICON_FILE = path.join(CONTENT_DIR, "lexicon.json");
const THRESHOLDS_FILE = path.join(CONTENT_DIR, "thresholds.json");
const DAILY_LIFE_FILE = path.join(CONTENT_DIR, "daily-life.json");
const CLINICAL_EVENTS_FILE = path.join(CONTENT_DIR, "clinical-events.json");

interface RawContent {
  logsFile: ContentLogsFile;
  lexiconFile: ContentLexiconFile;
  thresholdsFile: ContentThresholdsFile;
  dailyLifeFile: ContentDailyLifeFile;
  clinicalEventsFile: ContentClinicalEventsFile;
}

export interface LoadedContent {
  logs: ContentLogEntry[];
  lexiconTerms: ContentLexiconTerm[];
  thresholds: ThresholdSettings;
  dailyLifeEntries: ContentDailyLifeEntry[];
  clinicalEvents: ContentClinicalEvent[];
}

let memoized: LoadedContent | null = null;

function formatParseError(filePath: string, error: unknown): string {
  if (error instanceof Error) {
    return `${filePath}: ${error.message}`;
  }
  return `${filePath}: failed to parse`;
}

async function readJson(filePath: string): Promise<unknown> {
  const raw = await readFile(filePath, "utf8");

  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(formatParseError(filePath, error));
  }
}

async function readRawContent(): Promise<RawContent> {
  const [rawMedicalLogs, rawLexicon, rawThresholds, rawDailyLife, rawClinicalEvents] = await Promise.all([
    readJson(MEDICAL_LOGS_FILE),
    readJson(LEXICON_FILE),
    readJson(THRESHOLDS_FILE),
    readJson(DAILY_LIFE_FILE),
    readJson(CLINICAL_EVENTS_FILE)
  ]);

  const logsFile = contentLogsFileSchema.parse(rawMedicalLogs);
  const lexiconFile = contentLexiconFileSchema.parse(rawLexicon);
  const thresholdsFile = contentThresholdsFileSchema.parse(rawThresholds);
  const dailyLifeFile = contentDailyLifeFileSchema.parse(rawDailyLife);
  const clinicalEventsFile = contentClinicalEventsFileSchema.parse(rawClinicalEvents);

  return { logsFile, lexiconFile, thresholdsFile, dailyLifeFile, clinicalEventsFile };
}

function mapLexiconTerms(file: ContentLexiconFile): ContentLexiconTerm[] {
  return file.terms.map((term) => ({
    ...term,
    normalizedPhrase: normalizePhrase(term.phrase)
  }));
}

export async function loadContent(options?: { fresh?: boolean }): Promise<LoadedContent> {
  if (!options?.fresh && memoized) {
    return memoized;
  }

  const { logsFile, lexiconFile, thresholdsFile, dailyLifeFile, clinicalEventsFile } = await readRawContent();

  const loaded: LoadedContent = {
    logs: logsFile.logs,
    lexiconTerms: mapLexiconTerms(lexiconFile),
    thresholds: thresholdsFile.thresholds,
    dailyLifeEntries: dailyLifeFile.entries,
    clinicalEvents: clinicalEventsFile.events
  };

  memoized = loaded;
  return loaded;
}

export async function validateContentFiles(): Promise<void> {
  await loadContent({ fresh: true });
}

export const contentFiles = {
  medicalLogs: MEDICAL_LOGS_FILE,
  logs: MEDICAL_LOGS_FILE,
  lexicon: LEXICON_FILE,
  thresholds: THRESHOLDS_FILE,
  dailyLife: DAILY_LIFE_FILE,
  clinicalEvents: CLINICAL_EVENTS_FILE
};
