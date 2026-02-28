import React from "react";

import type { MainboardKpiBadge } from "@/lib/contracts";

interface KpiCardBaseProps {
  boxId: "box-01" | "box-02" | "box-03" | "box-04";
  label: string;
  value: string;
  detail?: string;
  badge: MainboardKpiBadge;
}

export function KpiCardBase({ boxId, label, value, detail, badge }: KpiCardBaseProps) {
  return (
    <article data-box-id={boxId} className="card-panel board-box board-kpi">
      <p className="card-label">{label}</p>
      <p className="card-value">{value}</p>
      {detail ? <p className="card-detail">{detail}</p> : null}
      <span className="card-badge">{badge}</span>
    </article>
  );
}
