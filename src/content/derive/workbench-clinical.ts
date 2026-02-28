import type {
  Box01SeriesPoint,
  Box02WorkbenchPayload,
  Box03WorkbenchPayload,
  ContentClinicalEvent,
  DirectionalClinicalMetricRow
} from "@/lib/contracts";

import {
  buildBox01Zones,
  buildRangeWindow,
  CLINICAL_METRIC_LABEL_BY_KEY,
  extractClinicalMeasurementPoints,
  extractClinicalObservations,
  formatObservationValueText,
  mapCreatinineToZone,
  mapRelativePointToZone,
  mapSdmaToZone,
  toSeriesPoints,
  ZONE_LABEL_BY_VALUE,
  type ClinicalObservation,
  type MeasurementPoint,
  type RangeWindow,
  type ZoneValue
} from "./shared";

const BOX02_HIGHER_WORSE_METRICS = ["bun", "creatinine", "sdma", "phosphorus", "upc", "potassium", "t4"] as const;

const BOX03_LOWER_WORSE_METRICS = ["albumin", "hct", "hemoglobin", "pcv", "total-protein"] as const;

function resolveLatestClinicalObservation(params: {
  events: ContentClinicalEvent[];
  metricKey: string;
  window: RangeWindow;
}): { observation: ClinicalObservation | null; stale: boolean } {
  const inRange = extractClinicalObservations({
    events: params.events,
    metricKey: params.metricKey,
    fromDate: params.window.fromDate,
    toDate: params.window.toDate
  });
  if (inRange.length > 0) {
    return {
      observation: inRange[inRange.length - 1] ?? null,
      stale: false
    };
  }

  const historical = extractClinicalObservations({
    events: params.events,
    metricKey: params.metricKey,
    toDate: params.window.toDate
  });
  if (historical.length > 0) {
    return {
      observation: historical[historical.length - 1] ?? null,
      stale: true
    };
  }

  return {
    observation: null,
    stale: false
  };
}

function buildClinicalHistoricalValues(params: {
  events: ContentClinicalEvent[];
  metricKey: string;
  toDate: string;
}): number[] {
  return extractClinicalObservations({
    events: params.events,
    metricKey: params.metricKey,
    toDate: params.toDate
  }).map((point) => point.rawValue);
}

function toDirectionalRow(params: {
  metricKey: string;
  direction: "higher_worse" | "lower_worse";
  events: ContentClinicalEvent[];
  window: RangeWindow;
}): DirectionalClinicalMetricRow | null {
  const resolved = resolveLatestClinicalObservation({
    events: params.events,
    metricKey: params.metricKey,
    window: params.window
  });

  if (!resolved.observation) {
    return null;
  }

  const metricLabel = CLINICAL_METRIC_LABEL_BY_KEY.get(params.metricKey) ?? params.metricKey;
  const isIrisMetric = params.metricKey === "creatinine" || params.metricKey === "sdma";

  let severityZone: ZoneValue;
  let mappingKind: DirectionalClinicalMetricRow["mappingKind"];

  if (params.metricKey === "creatinine") {
    severityZone = mapCreatinineToZone(resolved.observation.rawValue, resolved.observation.contextText);
    mappingKind = "iris_staged";
  } else if (params.metricKey === "sdma") {
    severityZone = mapSdmaToZone(resolved.observation.rawValue);
    mappingKind = "iris_staged";
  } else {
    const allValues = buildClinicalHistoricalValues({
      events: params.events,
      metricKey: params.metricKey,
      toDate: params.window.toDate
    });
    severityZone = mapRelativePointToZone({
      point: {
        date: resolved.observation.date,
        rawValue: resolved.observation.rawValue,
        source: resolved.observation.source,
        contextText: resolved.observation.contextText
      },
      allValues: allValues.length > 0 ? allValues : [resolved.observation.rawValue],
      direction: params.direction
    });
    mappingKind = "relative_non_staged";
  }

  return {
    metricKey: params.metricKey,
    metricLabel,
    valueText: formatObservationValueText(resolved.observation),
    date: resolved.observation.date,
    source: resolved.observation.source,
    severityZone,
    severityLabel: ZONE_LABEL_BY_VALUE[severityZone],
    stale: resolved.stale,
    mappingKind: isIrisMetric ? "iris_staged" : mappingKind
  };
}

function deriveDirectionalClinicalRows(params: {
  events: ContentClinicalEvent[];
  metricKeys: readonly string[];
  direction: "higher_worse" | "lower_worse";
  window: RangeWindow;
}): DirectionalClinicalMetricRow[] {
  const rows: DirectionalClinicalMetricRow[] = [];

  for (const metricKey of params.metricKeys) {
    const row = toDirectionalRow({
      metricKey,
      direction: params.direction,
      events: params.events,
      window: params.window
    });
    if (!row) {
      continue;
    }
    rows.push(row);
  }

  return rows;
}

function buildAssumedHealthyBaselinePoints(window: RangeWindow): Box01SeriesPoint[] {
  if (window.fromDate === window.toDate) {
    return [
      {
        date: window.fromDate,
        rawValue: null,
        zoneValue: 0
      }
    ];
  }

  return [
    {
      date: window.fromDate,
      rawValue: null,
      zoneValue: 0
    },
    {
      date: window.toDate,
      rawValue: null,
      zoneValue: 0
    }
  ];
}

function deriveDirectionalClinicalSeries(params: {
  events: ContentClinicalEvent[];
  metricKeys: readonly string[];
  direction: "higher_worse" | "lower_worse";
  window: RangeWindow;
}): Pick<Box02WorkbenchPayload, "series" | "legend"> {
  const series: Box02WorkbenchPayload["series"] = [];
  const legend: Box02WorkbenchPayload["legend"] = [];

  for (const metricKey of params.metricKeys) {
    const points = extractClinicalMeasurementPoints({
      events: params.events,
      metricKey,
      fromDate: params.window.fromDate,
      toDate: params.window.toDate
    });

    const isIrisMetric = metricKey === "creatinine" || metricKey === "sdma";
    const metricLabel = CLINICAL_METRIC_LABEL_BY_KEY.get(metricKey) ?? metricKey;
    const allValues = isIrisMetric
      ? []
      : buildClinicalHistoricalValues({
          events: params.events,
          metricKey,
          toDate: params.window.toDate
        });

    if (points.length > 0) {
      series.push({
        metricKey,
        metricLabel,
        source: "clinical_event",
        points: toSeriesPoints(points, (point) => {
          if (metricKey === "creatinine") {
            return mapCreatinineToZone(point.rawValue, point.contextText);
          }
          if (metricKey === "sdma") {
            return mapSdmaToZone(point.rawValue);
          }
          return mapRelativePointToZone({
            point,
            allValues: allValues.length > 0 ? allValues : points.map((entry) => entry.rawValue),
            direction: params.direction
          });
        })
      });

      legend.push({
        metricKey,
        metricLabel,
        source: "clinical_event",
        staged: isIrisMetric,
        direction: params.direction
      });
    }

    series.push({
      metricKey,
      metricLabel,
      source: "merged",
      points: buildAssumedHealthyBaselinePoints(params.window)
    });

    legend.push({
      metricKey,
      metricLabel,
      source: "merged",
      assumed: true,
      staged: false,
      direction: params.direction
    });
  }

  return {
    series,
    legend
  };
}

export function deriveBox02Workbench(params: {
  clinicalEvents: ContentClinicalEvent[];
  days: number;
  anchorDate?: Date;
  window?: {
    fromDate: string;
    toDate: string;
  };
}): Box02WorkbenchPayload {
  const window = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate,
    window: params.window
  });
  const chart = deriveDirectionalClinicalSeries({
    events: params.clinicalEvents,
    metricKeys: BOX02_HIGHER_WORSE_METRICS,
    direction: "higher_worse",
    window
  });

  return {
    zones: buildBox01Zones(),
    healthyBaselineZone: 0,
    rows: deriveDirectionalClinicalRows({
      events: params.clinicalEvents,
      metricKeys: BOX02_HIGHER_WORSE_METRICS,
      direction: "higher_worse",
      window
    }),
    series: chart.series,
    legend: chart.legend,
    yAxis: {
      min: 0,
      max: 4,
      ticks: [0, 1, 2, 3, 4]
    },
    notes: {
      stagedPolicyText: "Creatinine and SDMA lines are IRIS-staged in Box-02.",
      nonStagedPolicyText: "Other Box-02 metrics use relative percentile risk zones (higher is worse)."
    }
  };
}

export function deriveBox03Workbench(params: {
  clinicalEvents: ContentClinicalEvent[];
  days: number;
  anchorDate?: Date;
  window?: {
    fromDate: string;
    toDate: string;
  };
}): Box03WorkbenchPayload {
  const window = buildRangeWindow({
    days: params.days,
    anchorDate: params.anchorDate,
    window: params.window
  });
  const chart = deriveDirectionalClinicalSeries({
    events: params.clinicalEvents,
    metricKeys: BOX03_LOWER_WORSE_METRICS,
    direction: "lower_worse",
    window
  });

  return {
    zones: buildBox01Zones(),
    healthyBaselineZone: 0,
    rows: deriveDirectionalClinicalRows({
      events: params.clinicalEvents,
      metricKeys: BOX03_LOWER_WORSE_METRICS,
      direction: "lower_worse",
      window
    }),
    series: chart.series,
    legend: chart.legend,
    yAxis: {
      min: 0,
      max: 4,
      ticks: [0, 1, 2, 3, 4]
    },
    notes: {
      stagedPolicyText: "Box-03 uses an inverted y-axis (0 top, 4 bottom) to match lower-is-worse interpretation.",
      nonStagedPolicyText: "Box-03 uses relative percentile risk zones (lower is worse)."
    }
  };
}
