import type { BoardLayout } from "@/lib/contracts";

export const DESKTOP_1440_NO_SCROLL_BOARD_LAYOUT: BoardLayout = {
  preset: "desktop_1440_no_scroll",
  boxes: [
    {
      id: "box-01",
      title: "Latest Log Date",
      kind: "kpi_latest_log",
      gridArea: "box01",
      priority: 1
    },
    {
      id: "box-02",
      title: "Weight Delta",
      kind: "kpi_weight_delta",
      gridArea: "box02",
      priority: 2
    },
    {
      id: "box-03",
      title: "Issue Burden",
      kind: "kpi_issue_burden",
      gridArea: "box03",
      priority: 3
    },
    {
      id: "box-04",
      title: "Routine Stability",
      kind: "kpi_logging_consistency",
      gridArea: "box04",
      priority: 4
    },
    {
      id: "box-05",
      title: "Trend Metrics",
      kind: "trend_metrics",
      gridArea: "box05",
      priority: 5
    },
    {
      id: "box-06",
      title: "Soft Alerts",
      kind: "soft_alerts",
      gridArea: "box06",
      priority: 6
    },
    {
      id: "box-07",
      title: "Recent Issues Rank",
      kind: "issues_rank",
      gridArea: "box07",
      priority: 7
    },
    {
      id: "box-08",
      title: "Issue Daily Stack",
      kind: "issues_daily_stack",
      gridArea: "box08",
      priority: 8
    },
    {
      id: "box-09",
      title: "Clinical Events",
      kind: "clinical_events",
      gridArea: "box09",
      priority: 9
    },
    {
      id: "box-10",
      title: "Measurement Snapshot",
      kind: "measurement_snapshot",
      gridArea: "box10",
      priority: 10
    }
  ]
};
