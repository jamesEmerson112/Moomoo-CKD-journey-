import React from "react";

import type { ContentClinicalEvent } from "@/lib/contracts";

interface Box09ClinicalEventsProps {
  events: ContentClinicalEvent[];
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

export function Box09ClinicalEvents({ events }: Box09ClinicalEventsProps) {
  return (
    <section id="events-card" data-box-id="box-09" className="panel board-box board-list-box">
      <h2 className="board-heading">Clinical Events</h2>

      {events.length === 0 ? (
        <p className="board-muted">No clinical events have been added yet.</p>
      ) : (
        <ul className="board-list-scroll">
          {events.slice(0, 6).map((event) => (
            <li key={event.id} className="board-list-item">
              <div className="board-list-item-header board-list-item-header-wrap">
                <p className="board-list-title">{event.title}</p>
                <span className="board-list-chip">
                  {categoryLabel(event.category)}
                </span>
              </div>
              <p className="board-list-sub">
                {event.date} · {event.source.replace("_", " ")} · {event.confidence.replace("_", " ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
