import type { SelectedLogDetail } from "@/lib/contracts";

interface LogInspectorPanelProps {
  detail: SelectedLogDetail | null;
}

function metricValue(value: number | null, unit?: string): string {
  if (typeof value !== "number") {
    return "-";
  }

  return unit ? `${value} ${unit}` : `${value}`;
}

export function LogInspectorPanel({ detail }: LogInspectorPanelProps) {
  return (
    <aside className="inspector-rail panel" aria-label="Selected log details">
      <header className="inspector-header">
        <h2 className="inspector-title">Selected Log</h2>
      </header>

      {!detail ? (
        <p className="inspector-empty">No text logs available.</p>
      ) : detail.type === "daily_life" ? (
        <div className="inspector-body">
          <div className="inspector-meta-row">
            <span className="inspector-source-chip">Daily Life</span>
            <span className="inspector-date">{detail.date}</span>
          </div>
          <h3 className="inspector-item-title">{detail.title}</h3>
          <div className="inspector-note-scroll">
            <p className="inspector-notes">{detail.notes}</p>
          </div>
          {detail.tags.length > 0 ? (
            <ul className="inspector-tags">
              {detail.tags.map((tag) => (
                <li key={`${detail.id}-${tag}`} className="inspector-tag">
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
          <dl className="inspector-facts">
            <div>
              <dt>Created</dt>
              <dd>{detail.createdAt}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{detail.updatedAt}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="inspector-body">
          <div className="inspector-meta-row">
            <span className="inspector-source-chip">Milestone</span>
            <span className="inspector-date">{detail.date}</span>
          </div>
          <h3 className="inspector-item-title">{detail.title}</h3>
          <div className="inspector-note-scroll">
            <p className="inspector-notes">{detail.notes}</p>
          </div>
          <dl className="inspector-facts">
            <div>
              <dt>Mode</dt>
              <dd>{detail.mode.replace("_", " ")}</dd>
            </div>
            <div>
              <dt>Created By</dt>
              <dd>{detail.createdBy}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{detail.createdAt}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{detail.updatedAt}</dd>
            </div>
          </dl>
          <div className="inspector-metric-grid">
            <article className="inspector-metric-card">
              <p>Water</p>
              <strong>{metricValue(detail.metrics.waterIntakeOz, "oz")}</strong>
            </article>
            <article className="inspector-metric-card">
              <p>Appetite</p>
              <strong>{metricValue(detail.metrics.appetiteScore, "/5")}</strong>
            </article>
            <article className="inspector-metric-card">
              <p>Energy</p>
              <strong>{metricValue(detail.metrics.energyScore, "/5")}</strong>
            </article>
            <article className="inspector-metric-card">
              <p>Vomiting</p>
              <strong>{metricValue(detail.metrics.vomitingCount)}</strong>
            </article>
            <article className="inspector-metric-card">
              <p>Urination</p>
              <strong>{metricValue(detail.metrics.urinationScore, "/3")}</strong>
            </article>
            <article className="inspector-metric-card">
              <p>Stool</p>
              <strong>{metricValue(detail.metrics.stoolScore, "/3")}</strong>
            </article>
            <article className="inspector-metric-card">
              <p>Weight</p>
              <strong>{metricValue(detail.metrics.weightLb, "lb")}</strong>
            </article>
          </div>
          {detail.medications.length > 0 ? (
            <section className="inspector-medications">
              <h4>Medications</h4>
              <ul>
                {detail.medications.map((medication, index) => (
                  <li key={`${detail.id}-${medication.name}-${index}`}>
                    {medication.name}
                    {medication.dose ? ` (${medication.dose})` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </aside>
  );
}
