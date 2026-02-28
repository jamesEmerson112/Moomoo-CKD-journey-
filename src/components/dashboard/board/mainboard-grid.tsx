import React from "react";

import {
  Box01LatestLogDate,
  Box02WeightDelta,
  Box03IssueBurdenIndex,
  Box04RoutineStability,
  Box05TrendMetrics,
  Box06SoftAlerts,
  Box07RecentIssuesRank,
  Box08IssueDailyStack,
  Box09ClinicalEvents,
  Box10MeasurementSnapshot
} from "@/components/dashboard/boxes";
import type { MainboardPayload } from "@/lib/contracts";

interface MainboardGridProps {
  payload: MainboardPayload;
}

export function MainboardGrid({ payload }: MainboardGridProps) {
  return (
    <section
      className="visual-board-grid"
      data-board-preset={payload.boardLayout.preset}
      aria-label="Visual monitoring board"
    >
      <section id="overview" className="status-cards-grid" aria-label="Current status cards">
        <Box01LatestLogDate kpi={payload.kpis.latestLogDate} />
        <Box02WeightDelta kpi={payload.kpis.weightDelta} />
        <Box03IssueBurdenIndex kpi={payload.kpis.issueBurden} />
        <Box04RoutineStability kpi={payload.kpis.loggingConsistency} />
      </section>

      <Box06SoftAlerts alerts={payload.hybridAlerts} />
      <Box05TrendMetrics points={payload.trendSeries} />

      <section className="issues-box-grid">
        <Box07RecentIssuesRank issueRank={payload.issueRank} />
        <Box08IssueDailyStack issueRank={payload.issueRank} series={payload.issueDailyWeightedSeries} />
      </section>

      <section className="clinical-box-grid">
        <Box09ClinicalEvents events={payload.clinicalEventsRecent} />
        <Box10MeasurementSnapshot measurementSnapshot={payload.measurementSnapshot} />
      </section>
    </section>
  );
}
