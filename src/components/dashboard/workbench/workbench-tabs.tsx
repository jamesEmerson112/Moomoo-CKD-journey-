"use client";

import { useRef, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import type { LabWorkbenchRange, LabWorkbenchTab, WorkbenchBoxId } from "@/lib/contracts";

interface WorkbenchTabsProps {
  tabs: LabWorkbenchTab[];
  activeBoxId: WorkbenchBoxId;
  range: LabWorkbenchRange;
}

function buildHref(params: { box: WorkbenchBoxId; range: LabWorkbenchRange }): string {
  const query = new URLSearchParams();
  query.set("box", params.box);
  query.set("range", params.range);
  return `/lab?${query.toString()}`;
}

export function WorkbenchTabs({ tabs, activeBoxId, range }: WorkbenchTabsProps) {
  const router = useRouter();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeBoxId)
  );

  function navigateTo(index: number): void {
    const target = tabs[index];
    if (!target) {
      return;
    }
    router.push(buildHref({ box: target.id, range }) as Route);
  }

  function focusAt(index: number): void {
    refs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      focusAt(nextIndex);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      focusAt(prevIndex);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusAt(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastIndex = tabs.length - 1;
      focusAt(lastIndex);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateTo(index);
    }
  }

  return (
    <div className="lab-workbench-tablist" role="tablist" aria-label="Dashboard box workbench tabs">
      {tabs.map((tab, index) => {
        const selected = tab.id === activeBoxId;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={`workbench-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`workbench-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => navigateTo(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`lab-workbench-tab ${selected ? "lab-workbench-tab-active" : ""}`}
          >
            <span>{tab.title}</span>
            {tab.implemented ? null : <em>todo</em>}
          </button>
        );
      })}
    </div>
  );
}
