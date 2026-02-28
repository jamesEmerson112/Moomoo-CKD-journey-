"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { Box01LegendItem, Box03WorkbenchPayload } from "@/lib/contracts";

interface Box03LowerWorseTableProps {
  payload: Box03WorkbenchPayload;
}

interface ChartRecord {
  date: string;
  [key: string]: string | number | null;
}

const METRIC_COLORS: Record<string, string> = {
  albumin: "#16a34a",
  hct: "#9333ea",
  hemoglobin: "#be185d",
  pcv: "#a16207",
  "total-protein": "#475569"
};

function seriesKey(item: Pick<Box01LegendItem, "metricKey" | "source">): string {
  return `${item.metricKey}__${item.source}`;
}

function zoneKey(item: Pick<Box01LegendItem, "metricKey" | "source">): string {
  return `zone__${seriesKey(item)}`;
}

function rawKey(item: Pick<Box01LegendItem, "metricKey" | "source">): string {
  return `raw__${seriesKey(item)}`;
}

function sourceLabel(source: Box01LegendItem["source"]): string {
  if (source === "clinical_event") {
    return "clinical";
  }
  if (source === "merged") {
    return "assumed";
  }
  return "log";
}

function Box03Tooltip(params: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; payload?: ChartRecord }>;
  label?: string;
  legendByZoneKey: Map<string, Box01LegendItem>;
}) {
  if (!params.active || !params.payload || params.payload.length === 0) {
    return null;
  }

  return (
    <section className="box01-tooltip">
      <p className="box01-tooltip-date">{params.label}</p>
      <ul className="box01-tooltip-list">
        {params.payload.map((entry) => {
          const zoneDataKey = typeof entry.dataKey === "string" ? entry.dataKey : "";
          const meta = params.legendByZoneKey.get(zoneDataKey);
          if (!meta) {
            return null;
          }

          const rowPayload = entry.payload ?? { date: "" };
          const rawValue = rowPayload[rawKey(meta)];

          return (
            <li key={zoneDataKey} className="box01-tooltip-item">
              <strong>
                {meta.metricLabel} ({sourceLabel(meta.source)})
              </strong>
              <span>
                {meta.assumed
                  ? "assumed healthy baseline | zone: 0"
                  : `raw: ${typeof rawValue === "number" ? rawValue : "N/A"} | zone: ${
                      typeof entry.value === "number" ? entry.value : "N/A"
                    } | ${meta.staged ? "IRIS-staged" : "Relative"}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Box03LowerWorseTable({ payload }: Box03LowerWorseTableProps) {
  if (payload.series.length === 0) {
    return (
      <section className="box01-zone-chart panel" aria-label="Box 03 lower-worse clinical metrics chart">
        <h2 className="board-heading">box-03 · Lower-is-Worse Clinicals (Trend)</h2>
        <p className="board-muted">No lower-is-worse clinical measurements are available.</p>
      </section>
    );
  }

  const dates = [...new Set(payload.series.flatMap((series) => series.points.map((point) => point.date)))].sort((a, b) =>
    a.localeCompare(b)
  );

  const chartData: ChartRecord[] = dates.map((date) => ({ date }));
  const chartDataByDate = new Map(chartData.map((entry) => [entry.date, entry]));

  const legend = payload.legend.filter((item) =>
    payload.series.some((series) => series.metricKey === item.metricKey && series.source === item.source)
  );

  const legendByZoneKey = new Map<string, Box01LegendItem>();
  for (const item of legend) {
    legendByZoneKey.set(zoneKey(item), item);
  }

  for (const series of payload.series) {
    const keySeed = { metricKey: series.metricKey, source: series.source };
    const zKey = zoneKey(keySeed);
    const rKey = rawKey(keySeed);

    for (const point of series.points) {
      const record = chartDataByDate.get(point.date);
      if (!record) {
        continue;
      }
      record[zKey] = point.zoneValue;
      record[rKey] = point.rawValue;
    }
  }

  return (
    <section className="box01-zone-chart panel" aria-label="Box 03 lower-worse clinical metrics chart">
      <header className="box01-zone-header">
        <h2 className="board-heading">box-03 · Lower-is-Worse Clinicals (Trend)</h2>
        <div className="box01-badges">
          <span className="box01-badge">Line chart</span>
          <span className="box01-badge">Y-axis reversed: 0 top, 4 bottom</span>
          <span className="box01-badge">Relative mapping (lower worse)</span>
          <span className="box01-badge">Assumed healthy baseline</span>
        </div>
      </header>

      <div className="box01-zone-canvas">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 2 }}>
            {payload.zones.map((zone) => (
              <ReferenceArea
                key={zone.zone}
                y1={zone.zone - 0.5}
                y2={zone.zone + 0.5}
                ifOverflow="visible"
                fill={zone.color}
                fillOpacity={0.18}
                strokeOpacity={0}
              />
            ))}
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe2ec" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} minTickGap={20} />
            <YAxis
              domain={[payload.yAxis.min, payload.yAxis.max]}
              ticks={payload.yAxis.ticks}
              tick={{ fill: "#64748b", fontSize: 11 }}
              width={28}
              reversed
              allowDecimals={false}
            />
            <Tooltip content={<Box03Tooltip legendByZoneKey={legendByZoneKey} />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
            {legend.map((item) => (
              <Line
                key={seriesKey(item)}
                type="linear"
                dataKey={zoneKey(item)}
                connectNulls={false}
                stroke={METRIC_COLORS[item.metricKey] ?? "#334155"}
                strokeWidth={1.9}
                strokeOpacity={item.assumed ? 0.45 : 1}
                strokeDasharray={item.assumed ? "3 3" : undefined}
                dot={{ r: 2.7, stroke: "#ffffff", strokeWidth: 1 }}
                activeDot={{ r: 4 }}
                name={
                  item.assumed
                    ? `${item.metricLabel} [assumed healthy]`
                    : `${item.metricLabel} ${item.staged ? "[staged]" : "[relative]"}`
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <footer className="box01-zone-notes">
        <p>{payload.notes.stagedPolicyText}</p>
        <p>{payload.notes.nonStagedPolicyText}</p>
      </footer>
    </section>
  );
}
