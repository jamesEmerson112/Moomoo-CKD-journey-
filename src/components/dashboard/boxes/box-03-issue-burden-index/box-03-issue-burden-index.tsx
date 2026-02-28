import React from "react";

import { KpiCardBase } from "@/components/dashboard/boxes/shared";
import type { MainboardKpiSet } from "@/lib/contracts";

interface Box03IssueBurdenIndexProps {
  kpi: MainboardKpiSet["issueBurden"];
}

export function Box03IssueBurdenIndex({ kpi }: Box03IssueBurdenIndexProps) {
  return (
    <KpiCardBase
      boxId="box-03"
      label="Issue Burden Index"
      value={kpi.value}
      detail={kpi.detail}
      badge={kpi.badge}
    />
  );
}
