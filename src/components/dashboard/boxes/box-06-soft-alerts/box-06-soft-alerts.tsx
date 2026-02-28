import React from "react";

import type { HybridAlertChip } from "@/lib/contracts";

interface Box06SoftAlertsProps {
  alerts: HybridAlertChip[];
}

export function deriveAlertChipWindow(alerts: HybridAlertChip[], limit = 6): {
  visibleAlerts: HybridAlertChip[];
  hiddenAlertCount: number;
} {
  const visibleAlerts = alerts.slice(0, limit);
  const hiddenAlertCount = Math.max(0, alerts.length - visibleAlerts.length);
  return {
    visibleAlerts,
    hiddenAlertCount
  };
}

export function Box06SoftAlerts({ alerts }: Box06SoftAlertsProps) {
  const { visibleAlerts, hiddenAlertCount } = deriveAlertChipWindow(alerts);

  return (
    <section data-box-id="box-06" className="panel board-box board-alerts" aria-label="Soft alert overview">
      <h2 className="board-heading">Soft Alerts</h2>
      {alerts.length === 0 ? (
        <p className="board-muted">No active alerts in the selected range.</p>
      ) : (
        <ul className="alert-chip-list">
          {visibleAlerts.map((alert) => (
            <li key={alert.id} className={`alert-chip ${alert.severity === "critical" ? "alert-chip-critical" : ""}`}>
              <span className="alert-chip-label">{alert.label}</span>
              <span className="alert-chip-message">{alert.message}</span>
            </li>
          ))}
          {hiddenAlertCount > 0 ? (
            <li className="alert-chip alert-chip-overflow">
              <span className="alert-chip-label">+{hiddenAlertCount}</span>
              <span className="alert-chip-message">more alerts</span>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
