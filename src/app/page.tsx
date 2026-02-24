import Link from "next/link";

import { ClinicalEventsPanel } from "@/components/clinical-events-panel";
import { DailyLifePanel } from "@/components/daily-life-panel";
import { IssueInsightsPanel } from "@/components/issue-insights-panel";
import { RecentLogsTable } from "@/components/recent-logs-table";
import { StatusCards } from "@/components/status-cards";
import { TrendChart } from "@/components/trend-chart";
import { UnifiedChronologyFeed } from "@/components/unified-chronology-feed";
import { APP_DISCLAIMER } from "@/lib/constants";
import { getQuickViewPayload } from "@/lib/data";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : null;
  const range =
    typeof params.range === "string" && ["7d", "30d", "90d"].includes(params.range)
      ? (params.range as "7d" | "30d" | "90d")
      : "30d";

  const quickView = await getQuickViewPayload(range);
  const dashboard = quickView.dashboard;

  return (
    <div className="space-y-6">
      {notice === "read-only" ? (
        <section className="panel border-teal-300/40">
          <p className="text-sm text-teal-100">
            This website is read-only. Update content by editing files in `content/*.json` and redeploying.
          </p>
        </section>
      ) : null}

      <header className="panel space-y-4">
        <div className="space-y-2">
          <p className="font-mono-ui text-xs uppercase tracking-[0.16em] text-teal-200">Momoo CKD Journey</p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-50 sm:text-4xl">
            One-page quick view for monitoring, milestones, and daily life.
          </h1>
          <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
            Static content-as-code dashboard with deterministic issue extraction and a unified chronology stream.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["7d", "30d", "90d"] as const).map((item) => (
            <Link
              key={item}
              href={`/?range=${item}`}
              className={`rounded-full px-3 py-1 text-xs uppercase tracking-widest ${
                range === item
                  ? "bg-teal-300 text-slate-900"
                  : "border border-white/30 text-slate-100 hover:bg-white/10"
              }`}
            >
              {item}
            </Link>
          ))}
        </div>
      </header>

      <section id="status" className="space-y-4 scroll-mt-24">
        <StatusCards dashboard={dashboard} />
        {dashboard.alerts.length > 0 ? (
          <section className="panel border-orange-300/40">
            <h2 className="text-sm uppercase tracking-widest text-orange-200">Current Soft Alerts</h2>
            <ul className="mt-2 space-y-2 text-sm text-orange-100">
              {dashboard.alerts.map((alert, index) => (
                <li key={`${alert.metric}-${index}`}>{alert.message}</li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="panel">
            <h2 className="text-sm uppercase tracking-widest text-teal-200">Current Soft Alerts</h2>
            <p className="mt-2 text-sm text-slate-300">No active threshold alerts in the selected range.</p>
          </section>
        )}
      </section>

      <section id="trends" className="space-y-4 scroll-mt-24">
        <h2 className="text-sm uppercase tracking-widest text-slate-300">Trend Monitoring</h2>
        <TrendChart logs={dashboard.trend} />
      </section>

      <section id="issues" className="scroll-mt-24">
        <IssueInsightsPanel issueInsights={dashboard.issueInsights} />
      </section>

      <section id="events" className="scroll-mt-24">
        <ClinicalEventsPanel events={quickView.clinicalEvents} />
      </section>

      <section id="logs" className="space-y-3 scroll-mt-24">
        <h2 className="text-sm uppercase tracking-widest text-slate-300">Recent Logs</h2>
        <RecentLogsTable logs={dashboard.trend.slice().reverse().slice(0, 20)} />
      </section>

      <DailyLifePanel entries={quickView.dailyLifeEntries} />
      <UnifiedChronologyFeed feed={quickView.feed} clinicalEvents={quickView.clinicalEvents} />

      <p className="text-xs text-slate-400">{APP_DISCLAIMER}</p>
    </div>
  );
}
