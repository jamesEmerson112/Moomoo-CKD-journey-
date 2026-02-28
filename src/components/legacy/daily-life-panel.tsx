import type { ContentDailyLifeEntry } from "@/lib/contracts";

interface DailyLifePanelProps {
  entries: ContentDailyLifeEntry[];
}

export function DailyLifePanel({ entries }: DailyLifePanelProps) {
  return (
    <section id="daily-life" className="panel space-y-3 scroll-mt-24">
      <header>
        <h2 className="text-sm uppercase tracking-widest text-teal-200">Daily Life Notes</h2>
        <p className="mt-1 text-xs text-slate-400">Obsidian-style daily observations loaded from content files.</p>
      </header>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-300">No daily life entries yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">{entry.title}</p>
                <span className="text-xs text-slate-400">{entry.date}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{entry.notes}</p>
              {(entry.tags ?? []).length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {entry.tags?.map((tag) => (
                    <li key={`${entry.id}-${tag}`} className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-slate-300">
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
