import type { IssueInsights } from "@/lib/contracts";

import { IssueTrendChart } from "@/components/issue-trend-chart";

interface IssueInsightsPanelProps {
  issueInsights: IssueInsights;
}

export function IssueInsightsPanel({ issueInsights }: IssueInsightsPanelProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr,1.9fr]">
      <div className="panel space-y-3">
        <header>
          <h2 className="text-sm uppercase tracking-widest text-teal-200">Recent Issues (Last 7 Days)</h2>
          <p className="mt-1 text-xs text-slate-400">Analyzed logs: {issueInsights.totalAnalyzedLogs}</p>
        </header>

        {issueInsights.topIssues.length === 0 ? (
          <p className="text-sm text-slate-300">No frequent issue terms detected yet.</p>
        ) : (
          <ol className="space-y-2">
            {issueInsights.topIssues.map((issue, index) => (
              <li key={issue.issueKey} className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">
                    {index + 1}. {issue.label}
                  </p>
                  <span className="rounded-full bg-teal-300/20 px-2 py-0.5 text-xs text-teal-100">
                    {issue.count}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Last seen: {issue.lastSeenDate}</p>
                <p className="mt-2 text-xs text-slate-300">{issue.latestSnippet ?? "No snippet captured."}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <IssueTrendChart issueInsights={issueInsights} />
    </section>
  );
}
