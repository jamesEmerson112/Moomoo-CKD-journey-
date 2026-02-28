"use client";

import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { MainboardTrendPoint } from "@/lib/contracts";

interface Box05TrendMetricsProps {
  points: MainboardTrendPoint[];
}

export function Box05TrendMetrics({ points }: Box05TrendMetricsProps) {
  if (points.length === 0) {
    return (
      <section id="trend-card" data-box-id="box-05" className="panel board-box board-chart-box" aria-label="Metric trend chart">
        <h2 className="board-heading">Trend Metrics</h2>
        <div className="chart-empty-state">
          <p className="text-sm text-slate-500">No trend data available in this range.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="trend-card" data-box-id="box-05" className="panel board-box board-chart-box" aria-label="Metric trend chart">
      <h2 className="board-heading">Trend Metrics</h2>
      <div className="chart-slot">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe2ec" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} tickMargin={4} minTickGap={16} />
            <YAxis yAxisId="weight" tick={{ fill: "#64748b", fontSize: 9 }} width={28} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748b", fontSize: 9 }} width={28} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                borderColor: "#cbd5e1",
                borderRadius: "0.5rem",
                fontSize: "0.72rem",
                padding: "0.35rem 0.45rem"
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 2 }} iconSize={7} height={18} />
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey="weightLb"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              name="Weight (lb)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="burdenIndex"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="Burden Index"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
