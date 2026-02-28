import { deriveLogs } from "@/content/derive";
import { loadContent } from "@/content/load";
import type { ContentClinicalEvent, ContentDailyLifeEntry, ContentLexiconTerm, DailyLogRecord } from "@/lib/contracts";

export interface DerivedContent {
  medicalLogs: DailyLogRecord[];
  lexiconTerms: ContentLexiconTerm[];
  dailyLifeEntries: ContentDailyLifeEntry[];
  clinicalEvents: ContentClinicalEvent[];
}

export async function loadDerivedContent(): Promise<DerivedContent> {
  const content = await loadContent();

  return {
    medicalLogs: deriveLogs(content.logs, content.thresholds),
    lexiconTerms: content.lexiconTerms,
    dailyLifeEntries: content.dailyLifeEntries,
    clinicalEvents: content.clinicalEvents
  };
}
