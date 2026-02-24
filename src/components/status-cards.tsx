import type { DashboardPayload } from "@/lib/contracts";

interface StatusCardsProps {
  dashboard: DashboardPayload;
}

export function StatusCards({ dashboard }: StatusCardsProps) {
  const latest = dashboard.latestLog;

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Current status cards">
      <article className="card-panel">
        <p className="card-label">Latest Log Date</p>
        <p className="card-value">{latest ? latest.date : "No logs yet"}</p>
      </article>
      <article className="card-panel">
        <p className="card-label">Avg Water</p>
        <p className="card-value">
          {dashboard.stats.avgWaterIntakeOz !== null ? `${dashboard.stats.avgWaterIntakeOz} oz` : "N/A"}
        </p>
      </article>
      <article className="card-panel">
        <p className="card-label">Avg Appetite</p>
        <p className="card-value">
          {dashboard.stats.avgAppetiteScore !== null ? `${dashboard.stats.avgAppetiteScore}/5` : "N/A"}
        </p>
      </article>
      <article className="card-panel">
        <p className="card-label">Active Alerts</p>
        <p className="card-value">{dashboard.alerts.length}</p>
      </article>
    </section>
  );
}
