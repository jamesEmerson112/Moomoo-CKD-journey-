import Link from "next/link";

import { MainboardGrid } from "@/components/dashboard/board";
import type { MainboardPayload } from "@/lib/contracts";

interface DashboardShellProps {
  range: "7d" | "30d" | "90d";
  mainboard: MainboardPayload;
  notice: string | null;
}

function rangeHref(params: { range: "7d" | "30d" | "90d" }): { pathname: "/"; query: Record<string, string> } {
  return {
    pathname: "/",
    query: {
      range: params.range
    }
  };
}

export function DashboardShell({ range, mainboard, notice }: DashboardShellProps) {
  return (
    <div className="mainboard-shell-wrapper">
      <div className="mainboard-shell">
        <section className="main-board panel" aria-label="Monitoring dashboard">
          <header className="board-header">
            <h1 className="board-title">Momoo Monitor</h1>
            <div className="range-switcher" role="group" aria-label="Date range selector">
              {(["7d", "30d", "90d"] as const).map((item) => (
                <Link
                  key={item}
                  href={rangeHref({
                    range: item
                  })}
                  className={`range-chip ${range === item ? "range-chip-active" : ""}`}
                >
                  {item}
                </Link>
              ))}
            </div>
          </header>

          {notice === "read-only" ? <p className="notice-banner">Read-only mode: update `content/*.json` and redeploy.</p> : null}

          <MainboardGrid payload={mainboard} />
        </section>
      </div>
    </div>
  );
}
