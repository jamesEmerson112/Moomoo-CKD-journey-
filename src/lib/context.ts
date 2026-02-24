import type { ContextEvent, DailyLogRecord } from "@/lib/contracts";

function toCanonicalText(log: DailyLogRecord): string {
  const meds =
    log.medications.length === 0
      ? "no meds"
      : log.medications
          .map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.taken ? " taken" : " skipped"}`)
          .join(", ");

  return [
    `On ${log.date}, mode ${log.mode}`,
    typeof log.waterIntakeOz === "number" ? `water intake ${log.waterIntakeOz} oz` : undefined,
    typeof log.appetiteScore === "number" ? `appetite ${log.appetiteScore}/5` : undefined,
    typeof log.energyScore === "number" ? `energy ${log.energyScore}/5` : undefined,
    typeof log.vomitingCount === "number" ? `vomiting ${log.vomitingCount}` : undefined,
    typeof log.urinationScore === "number" ? `urination ${log.urinationScore}/3` : undefined,
    typeof log.stoolScore === "number" ? `stool ${log.stoolScore}/3` : undefined,
    typeof log.weightLb === "number" ? `weight ${log.weightLb} lb` : undefined,
    `medications: ${meds}`,
    log.notes ? `notes: ${log.notes}` : undefined
  ]
    .filter(Boolean)
    .join("; ");
}

export function toContextEvents(logs: DailyLogRecord[]): ContextEvent[] {
  return [...logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((log) => ({
      id: `daily-log:${log.id}`,
      type: "daily_log",
      date: log.date,
      canonicalText: toCanonicalText(log),
      metadata: {
        createdBy: log.createdBy,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
        metrics: {
          waterIntakeOz: log.waterIntakeOz,
          appetiteScore: log.appetiteScore,
          energyScore: log.energyScore,
          vomitingCount: log.vomitingCount,
          urinationScore: log.urinationScore,
          stoolScore: log.stoolScore,
          weightLb: log.weightLb ?? null
        },
        medications: log.medications,
        notes: log.notes ?? null
      }
    }));
}
