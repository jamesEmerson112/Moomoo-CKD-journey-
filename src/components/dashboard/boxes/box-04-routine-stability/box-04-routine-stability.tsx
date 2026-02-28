import React from "react";

import { KpiCardBase } from "@/components/dashboard/boxes/shared";
import type { MainboardKpiSet } from "@/lib/contracts";

interface Box04RoutineStabilityProps {
  kpi: MainboardKpiSet["loggingConsistency"];
}

export function Box04RoutineStability({ kpi }: Box04RoutineStabilityProps) {
  return (
    <KpiCardBase
      boxId="box-04"
      label="Routine Stability"
      value={kpi.value}
      detail={kpi.detail}
      badge={kpi.badge}
    />
  );
}
