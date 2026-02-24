"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { IssueInsights } from "@/lib/contracts";

interface IssueTrendChartProps {
  issueInsights: IssueInsights;
}

const ISSUE_COLORS = ["#38bdf8", "#34d399", "#f59e0b", "#f97316", "#f472b6", "#818cf8"];

export function IssueTrendChart({ issueInsights }: IssueTrendChartProps) {
  if (issueInsights.topIssues.length === 0 || issueInsights.dailySeries.length === 0) {
    return (
      <div className="panel flex h-72 items-center justify-center">
        <p className="text-sm text-slate-300">No issue mentions detected in the last 7 days.</p>
      </div>
    );
  }

  const issueKeys = issueInsights.topIssues.map((issue) => issue.issueKey);
  const labelByKey = new Map(issueInsights.topIssues.map((issue) => [issue.issueKey, issue.label]));

  const chartData = issueInsights.dailySeries.map((point) => {
    const record: Record<string, number | string> = { date: point.date };
    for (const key of issueKeys) {
      record[key] = point.counts[key] ?? 0;
    }
    return record;
  });

  return (
    <div className="panel h-80" aria-label="Issue trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f3742" />
          <XAxis dataKey="date" tick={{ fill: "#cde7ee", fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#cde7ee", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#22404d",
              borderRadius: "0.75rem"
            }}
          />
          <Legend />
          {issueKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="issues"
              fill={ISSUE_COLORS[index % ISSUE_COLORS.length]}
              name={labelByKey.get(key) ?? key}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
