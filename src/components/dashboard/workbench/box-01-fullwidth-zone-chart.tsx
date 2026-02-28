"use client";

import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { Box01WorkbenchPayload } from "@/lib/contracts";

interface Box01FullwidthZoneChartProps {
  payload: Box01WorkbenchPayload;
}

interface ChartRecord {
  date: string;
  weightLb: number;
}

function Box01Tooltip(params: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!params.active || !params.payload || params.payload.length === 0) {
    return null;
  }

  const weightValue = params.payload[0]?.value;

  return (
    <section className="box01-tooltip">
      <p className="box01-tooltip-date">{params.label}</p>
      <ul className="box01-tooltip-list">
        <li className="box01-tooltip-item">
          <strong>Weight</strong>
          <span>{typeof weightValue === "number" ? `${weightValue.toFixed(2)} lb` : "N/A"}</span>
        </li>
      </ul>
    </section>
  );
}

export function Box01FullwidthZoneChart({ payload }: Box01FullwidthZoneChartProps) {
  if (payload.series.length === 0) {
    return (
      <section className="box01-zone-chart panel">
        <h2 className="board-heading">box-01 · Weight Trend</h2>
        <p className="board-muted">No data points found for this range.</p>
      </section>
    );
  }

  const chartData: ChartRecord[] = payload.series.map((point) => ({
    date: point.date,
    weightLb: point.weightLb
  }));

  return (
    <section className="box01-zone-chart panel" aria-label="Box 01 full-width zone chart">
      <header className="box01-zone-header">
        <h2 className="board-heading">box-01 · Weight Trend (lb)</h2>
        <div className="box01-badges">
          <span className="box01-badge">Merged weight line</span>
          <span className="box01-badge">Healthy reference: {payload.healthyReferenceLb} lb</span>
          <span className="box01-badge">No staging zones</span>
        </div>
      </header>

      <div className="box01-zone-canvas">
        <ResponsiveContainer width="100%" height={480}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe2ec" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} minTickGap={20} />
            <YAxis
              domain={[payload.yAxis.min, payload.yAxis.max]}
              tick={{ fill: "#64748b", fontSize: 11 }}
              width={28}
              tickFormatter={(value) => `${value}`}
            />
            <ReferenceLine
              y={payload.healthyReferenceLb}
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth={1.3}
              ifOverflow="extendDomain"
              label={{
                value: "Healthy 8 lb",
                position: "insideTopRight",
                fill: "#475569",
                fontSize: 11
              }}
            />
            <Tooltip content={<Box01Tooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
            <Line
              type="linear"
              dataKey="weightLb"
              connectNulls={false}
              stroke="#1d4ed8"
              strokeWidth={2}
              dot={{ r: 2.8, stroke: "#ffffff", strokeWidth: 1 }}
              activeDot={{ r: 4 }}
              name="Weight (lb)"
            />
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
