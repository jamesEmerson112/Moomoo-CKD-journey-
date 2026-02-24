import type { AlertItem, FullDailyLogInput, ThresholdSettings } from "@/lib/contracts";

function severityByDelta(delta: number): "warning" | "critical" {
  return delta >= 0.5 ? "critical" : "warning";
}

export function computeSoftAlerts(
  log: FullDailyLogInput,
  thresholds: ThresholdSettings,
  previousWeightLb?: number | null,
  source: AlertItem["source"] = "threshold-override"
): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (log.waterIntakeOz < thresholds.waterIntakeMinOz) {
    const gap = (thresholds.waterIntakeMinOz - log.waterIntakeOz) / Math.max(thresholds.waterIntakeMinOz, 1);
    alerts.push({
      severity: severityByDelta(gap),
      metric: "waterIntakeOz",
      message: `Water intake ${log.waterIntakeOz} oz is below ${thresholds.waterIntakeMinOz} oz threshold.`,
      date: log.date,
      source
    });
  }

  if (log.appetiteScore < thresholds.appetiteMin) {
    alerts.push({
      severity: log.appetiteScore <= 1 ? "critical" : "warning",
      metric: "appetiteScore",
      message: `Appetite score ${log.appetiteScore} is below ${thresholds.appetiteMin}.`,
      date: log.date,
      source
    });
  }

  if (log.energyScore < thresholds.energyMin) {
    alerts.push({
      severity: log.energyScore <= 1 ? "critical" : "warning",
      metric: "energyScore",
      message: `Energy score ${log.energyScore} is below ${thresholds.energyMin}.`,
      date: log.date,
      source
    });
  }

  if (log.vomitingCount > thresholds.vomitingMax) {
    alerts.push({
      severity: log.vomitingCount >= thresholds.vomitingMax + 2 ? "critical" : "warning",
      metric: "vomitingCount",
      message: `Vomiting count ${log.vomitingCount} exceeds ${thresholds.vomitingMax}.`,
      date: log.date,
      source
    });
  }

  if (log.urinationScore < thresholds.urinationMin) {
    alerts.push({
      severity: "warning",
      metric: "urinationScore",
      message: `Urination score ${log.urinationScore} is below ${thresholds.urinationMin}.`,
      date: log.date,
      source
    });
  }

  if (log.stoolScore < thresholds.stoolMin) {
    alerts.push({
      severity: "warning",
      metric: "stoolScore",
      message: `Stool score ${log.stoolScore} is below ${thresholds.stoolMin}.`,
      date: log.date,
      source
    });
  }

  if (typeof previousWeightLb === "number" && typeof log.weightLb === "number") {
    const lossPct = ((previousWeightLb - log.weightLb) / previousWeightLb) * 100;
    if (lossPct >= thresholds.weightLossPctWarn) {
      alerts.push({
        severity: lossPct >= thresholds.weightLossPctWarn * 1.5 ? "critical" : "warning",
        metric: "weightLb",
        message: `Weight dropped by ${lossPct.toFixed(1)}% compared with prior log.`,
        date: log.date,
        source
      });
    }
  }

  return alerts;
}
