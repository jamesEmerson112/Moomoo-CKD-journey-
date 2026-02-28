import type {
  ClinicalMeasurementComparator,
  ContentClinicalEvent,
  QuickViewFeedItem,
  QuickViewFeedItemType
} from "@/lib/contracts";

interface UnifiedChronologyFeedProps {
  feed: QuickViewFeedItem[];
  clinicalEvents: ContentClinicalEvent[];
}

function sourceLabel(type: QuickViewFeedItemType): string {
  if (type === "clinical_event") {
    return "Clinical";
  }
  if (type === "milestone_log") {
    return "Milestone";
  }
  return "Daily Life";
}

function sourceBadgeClass(type: QuickViewFeedItemType): string {
  if (type === "clinical_event") {
    return "bg-orange-300/20 text-orange-100";
  }
  if (type === "milestone_log") {
    return "bg-teal-300/20 text-teal-100";
  }
  return "bg-sky-300/20 text-sky-100";
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

function dateTimeToClockLabel(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function buildDateGroups(feed: QuickViewFeedItem[]): Array<{ date: string; items: QuickViewFeedItem[] }> {
  const groups: Array<{ date: string; items: QuickViewFeedItem[] }> = [];

  for (const item of feed) {
    const latestGroup = groups[groups.length - 1];
    if (!latestGroup || latestGroup.date !== item.date) {
      groups.push({ date: item.date, items: [item] });
      continue;
    }

    latestGroup.items.push(item);
  }

  return groups;
}

export function UnifiedChronologyFeed({ feed, clinicalEvents }: UnifiedChronologyFeedProps) {
  if (feed.length === 0) {
    return (
      <section id="timeline" className="panel scroll-mt-24">
        <h2 className="text-sm uppercase tracking-widest text-teal-200">Unified Chronology</h2>
        <p className="mt-2 text-sm text-slate-300">No chronology items yet.</p>
      </section>
    );
  }

  const clinicalById = new Map(clinicalEvents.map((event) => [event.id, event]));
  const dateGroups = buildDateGroups(feed);

  return (
    <section id="timeline" className="panel space-y-4 scroll-mt-24">
      <header>
        <h2 className="text-sm uppercase tracking-widest text-teal-200">Unified Chronology</h2>
        <p className="mt-1 text-xs text-slate-400">
          Combined stream of clinical events, milestone logs, and daily life notes.
        </p>
      </header>

      <div className="space-y-4">
        {dateGroups.map((group) => (
          <section key={group.date} className="space-y-2">
            <h3 className="text-xs uppercase tracking-widest text-slate-400">{group.date}</h3>
            <ul className="space-y-2">
              {group.items.map((item) => {
                const clockLabel =
                  item.type !== "clinical_event" && !item.dateTime.endsWith("T00:00:00.000Z")
                    ? dateTimeToClockLabel(item.dateTime)
                    : null;
                const sourceId = item.sourceRef.id;
                const clinicalEvent =
                  item.type === "clinical_event" && item.sourceRef.collection === "clinical-events"
                    ? clinicalById.get(sourceId)
                    : null;

                return (
                  <li key={item.id} className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${sourceBadgeClass(item.type)}`}>
                        {sourceLabel(item.type)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.date}
                      {clockLabel ? ` · ${clockLabel}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">{item.summary}</p>

                    {(item.tags ?? []).length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {item.tags?.map((tag) => (
                          <li key={`${item.id}-${tag}`} className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-slate-300">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {(clinicalEvent?.measurements ?? []).length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                        {clinicalEvent?.measurements?.slice(0, 4).map((measurement) => (
                          <li key={`${clinicalEvent.id}-${measurement.key}`} className="rounded-md border border-white/15 px-2 py-1">
                            {measurement.label}: {`${comparatorPrefix(measurement.comparator)}${measurement.value}`}
                            {measurement.unit ? ` ${measurement.unit}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
