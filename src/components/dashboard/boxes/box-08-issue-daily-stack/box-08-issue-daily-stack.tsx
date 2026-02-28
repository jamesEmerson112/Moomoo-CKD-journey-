"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { IssueWeightedRankItem, IssueWeightedSeriesPoint } from "@/lib/contracts";

interface Box08IssueDailyStackProps {
  issueRank: IssueWeightedRankItem[];
  series: IssueWeightedSeriesPoint[];
}

const ISSUE_COLORS = ["#2563eb", "#60a5fa", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function Box08IssueDailyStack({ issueRank, series }: Box08IssueDailyStackProps) {
  if (issueRank.length === 0 || series.length === 0) {
    return (
      <section id="issue-card" data-box-id="box-08" className="panel board-box board-chart-box" aria-label="Issue trend chart">
        <h2 className="board-heading">Issue Daily Stack</h2>
        <div className="chart-empty-state">
          <p className="text-sm text-slate-500">No issue mentions detected in the last 7 days.</p>
        </div>
      </section>
    );
  }

  const issueKeys = issueRank.map((issue) => issue.issueKey);
  const labelByKey = new Map(issueRank.map((issue) => [issue.issueKey, issue.label]));

  const chartData = series.map((point) => {
    const record: Record<string, number | string> = { date: point.date };
    for (const key of issueKeys) {
      record[key] = point.scores[key] ?? 0;
    }
    return record;
  });

  return (
    <section id="issue-card" data-box-id="box-08" className="panel board-box board-chart-box" aria-label="Issue trend chart">
      <h2 className="board-heading">Issue Daily Stack</h2>
      <div className="chart-slot">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe2ec" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} tickMargin={4} minTickGap={16} />
            <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 9 }} width={28} />
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
    </section>
  );
}
