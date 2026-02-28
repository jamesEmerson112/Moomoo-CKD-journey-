import React from "react";

import { KpiCardBase } from "@/components/dashboard/boxes/shared";
import type { MainboardKpiSet } from "@/lib/contracts";

interface Box01LatestLogDateProps {
  kpi: MainboardKpiSet["latestLogDate"];
}

export function Box01LatestLogDate({ kpi }: Box01LatestLogDateProps) {
  return (
    <KpiCardBase
      boxId="box-01"
      label="Latest Log Date"
      value={kpi.value}
      detail={kpi.detail}
      badge={kpi.badge}
    />
  );
}
