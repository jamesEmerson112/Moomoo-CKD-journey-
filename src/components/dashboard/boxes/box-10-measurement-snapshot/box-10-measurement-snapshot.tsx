import React from "react";

import type { MeasurementSnapshotItem } from "@/lib/contracts";

interface Box10MeasurementSnapshotProps {
  measurementSnapshot: MeasurementSnapshotItem[];
}

export function Box10MeasurementSnapshot({ measurementSnapshot }: Box10MeasurementSnapshotProps) {
  return (
    <section data-box-id="box-10" className="panel board-box board-list-box">
      <h2 className="board-heading">Measurement Snapshot</h2>

      {measurementSnapshot.length === 0 ? (
        <p className="board-muted">No numeric measurements on recent events.</p>
      ) : (
        <ul className="board-list-scroll">
          {measurementSnapshot.slice(0, 6).map((item) => (
            <li key={item.key} className="board-list-item">
              <div className="board-list-item-header">
                <p className="board-list-title">{item.label}</p>
                <span className="board-list-value">{item.valueText}</span>
              </div>
              <p className="board-list-sub">as of {item.date}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
