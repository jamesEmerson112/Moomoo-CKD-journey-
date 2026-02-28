import Link from "next/link";

import { Box01FullwidthZoneChart } from "@/components/dashboard/workbench/box-01-fullwidth-zone-chart";
import { Box02HigherWorseTable } from "@/components/dashboard/workbench/box-02-higher-worse-table";
import { Box03LowerWorseTable } from "@/components/dashboard/workbench/box-03-lower-worse-table";
import { BoxPlaceholder } from "@/components/dashboard/workbench/box-placeholder";
import type { LabWorkbenchPayload, LabWorkbenchRange } from "@/lib/contracts";

interface LabWorkbenchShellProps {
  payload: LabWorkbenchPayload;
  notice: string | null;
}

function rangeHref(params: {
  range: LabWorkbenchRange;
}): { pathname: "/lab"; query: Record<string, string> } {
  return {
    pathname: "/lab",
    query: {
      range: params.range
    }
  };
}

export function LabWorkbenchShell({ payload, notice }: LabWorkbenchShellProps) {
  return (
    <div className="lab-workbench-shell-wrapper">
      <section className="lab-workbench-shell panel" aria-label="Dashboard box workbench">
        <header className="lab-workbench-header">
          <div>
            <p className="board-kicker">Workbench</p>
            <h1 className="board-title">Box-by-Box Dashboard Lab</h1>
          </div>
          <div className="range-switcher" role="group" aria-label="Date range selector">
            {(["all", "7d", "30d", "90d"] as const).map((item) => (
              <Link
                key={item}
                href={rangeHref({
                  range: item
                })}
                className={`range-chip ${payload.range === item ? "range-chip-active" : ""}`}
              >
                {item === "all" ? "All" : item}
              </Link>
            ))}
          </div>
        </header>

        {notice === "read-only" ? <p className="notice-banner">Read-only mode: update `content/*.json` and redeploy.</p> : null}

        <section className="lab-workbench-combined" aria-label="Combined lab boxes">
          <div className="lab-workbench-combined-top">
            {payload.box01 ? <Box01FullwidthZoneChart payload={payload.box01} /> : <BoxPlaceholder boxId="box-01" title="Weight Trend" />}
          </div>
          <div className="lab-workbench-combined-bottom">
            {payload.box02 ? (
              <Box02HigherWorseTable payload={payload.box02} />
            ) : (
              <BoxPlaceholder boxId="box-02" title="Higher-is-Worse Clinicals" />
            )}
            {payload.box03 ? (
              <Box03LowerWorseTable payload={payload.box03} />
            ) : (
              <BoxPlaceholder boxId="box-03" title="Lower-is-Worse Clinicals" />
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
