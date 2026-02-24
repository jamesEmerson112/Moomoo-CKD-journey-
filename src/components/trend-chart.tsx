"use client";

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

import type { DailyLogRecord } from "@/lib/contracts";

interface TrendChartProps {
  logs: DailyLogRecord[];
}

export function TrendChart({ logs }: TrendChartProps) {
  if (logs.length === 0) {
    return (
      <div className="panel flex h-72 items-center justify-center">
        <p className="text-sm text-slate-300">No data yet. Add a daily log to start tracking trends.</p>
      </div>
    );
  }

  return (
    <div className="panel h-80 w-full" aria-label="Metric trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={logs} margin={{ top: 20, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f3742" />
          <XAxis dataKey="date" tick={{ fill: "#cde7ee", fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fill: "#cde7ee", fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#f9d2b2", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#22404d",
              borderRadius: "0.75rem"
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="waterIntakeOz"
            stroke="#67e8f9"
            strokeWidth={2}
            dot={false}
            name="Water (oz)"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="appetiteScore"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
            name="Appetite"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="energyScore"
            stroke="#fbbf24"
            strokeWidth={2}
            dot={false}
            name="Energy"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="vomitingCount"
            stroke="#fb923c"
            strokeWidth={2}
            dot={false}
            name="Vomiting"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
