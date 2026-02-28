import React from "react";

import { KpiCardBase } from "@/components/dashboard/boxes/shared";
import type { MainboardKpiSet } from "@/lib/contracts";

interface Box02WeightDeltaProps {
  kpi: MainboardKpiSet["weightDelta"];
}

export function Box02WeightDelta({ kpi }: Box02WeightDeltaProps) {
  return (
    <KpiCardBase
      boxId="box-02"
      label="Weight Delta"
      value={kpi.value}
      detail={kpi.detail}
      badge={kpi.badge}
    />
  );
}
