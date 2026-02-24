import type { ContentClinicalEvent, ClinicalMeasurementComparator } from "@/lib/contracts";

interface ClinicalEventsPanelProps {
  events: ContentClinicalEvent[];
}

function comparatorPrefix(comparator: ClinicalMeasurementComparator): string {
  if (comparator === "gt") {
    return ">";
  }
  if (comparator === "lt") {
    return "<";
  }
  if (comparator === "approx") {
    return "~";
  }
  return "";
}

function categoryLabel(category: ContentClinicalEvent["category"]): string {
  if (category === "treatment_plan") {
    return "Treatment Plan";
  }
  if (category === "home_observation") {
    return "Home Observation";
  }
  return category.toUpperCase();
}

interface MeasurementSnapshotItem {
  key: string;
  label: string;
  valueText: string;
  date: string;
}

function buildMeasurementSnapshot(events: ContentClinicalEvent[]): MeasurementSnapshotItem[] {
  const byKey = new Map<string, MeasurementSnapshotItem>();

  for (const event of events) {
    for (const measurement of event.measurements ?? []) {
      if (byKey.has(measurement.key)) {
        continue;
      }

      const prefix = comparatorPrefix(measurement.comparator);
      const unit = measurement.unit ? ` ${measurement.unit}` : "";
      byKey.set(measurement.key, {
        key: measurement.key,
        label: measurement.label,
        valueText: `${prefix}${measurement.value}${unit}`,
        date: event.date
      });
    }
  }

  return [...byKey.values()].slice(0, 8);
}

export function ClinicalEventsPanel({ events }: ClinicalEventsPanelProps) {
  if (events.length === 0) {
    return (
      <section className="panel">
        <h2 className="text-sm uppercase tracking-widest text-teal-200">Clinical Events</h2>
        <p className="mt-2 text-sm text-slate-300">No clinical events have been added yet.</p>
      </section>
    );
  }

  const measurementSnapshot = buildMeasurementSnapshot(events);

  return (
    <section className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
      <div className="panel space-y-3">
        <header>
          <h2 className="text-sm uppercase tracking-widest text-teal-200">Clinical Events</h2>
          <p className="mt-1 text-xs text-slate-400">Milestone labs, ER anchors, and medical observations</p>
        </header>

        <ul className="space-y-2">
          {events.slice(0, 8).map((event) => (
            <li key={event.id} className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">{event.title}</p>
                <span className="rounded-full bg-teal-300/20 px-2 py-0.5 text-xs text-teal-100">
                  {categoryLabel(event.category)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {event.date} · {event.source.replace("_", " ")} · {event.confidence.replace("_", " ")}
              </p>
              <p className="mt-2 text-sm text-slate-300">{event.summary}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel space-y-3">
        <header>
          <h3 className="text-sm uppercase tracking-widest text-teal-200">Latest Measurement Snapshot</h3>
          <p className="mt-1 text-xs text-slate-400">Most recent value per measurement key</p>
        </header>

        {measurementSnapshot.length === 0 ? (
          <p className="text-sm text-slate-300">No numeric measurements on recent events.</p>
        ) : (
          <ul className="space-y-2">
            {measurementSnapshot.map((item) => (
              <li key={item.key} className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                  <span className="text-sm text-teal-100">{item.valueText}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">as of {item.date}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
