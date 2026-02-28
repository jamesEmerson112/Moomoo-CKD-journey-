import Link from "next/link";

import type { ThreadLogItem, ThreadPagination } from "@/lib/contracts";

interface LogThreadRailProps {
  range: "7d" | "30d" | "90d";
  threadPage: number;
  items: ThreadLogItem[];
  pagination: ThreadPagination;
  selectedItemId: string | null;
}

function threadItemHref(params: {
  range: "7d" | "30d" | "90d";
  threadPage: number;
  selected: string;
}): { pathname: "/"; query: Record<string, string> } {
  return {
    pathname: "/",
    query: {
      range: params.range,
      threadPage: String(params.threadPage),
      selected: params.selected
    }
  };
}

function threadPageHref(params: {
  range: "7d" | "30d" | "90d";
  threadPage: number;
}): { pathname: "/"; query: Record<string, string> } {
  return {
    pathname: "/",
    query: {
      range: params.range,
      threadPage: String(params.threadPage)
    }
  };
}

function sourceLabel(type: ThreadLogItem["type"]): string {
  return type === "daily_life" ? "Daily" : "Milestone";
}

export function LogThreadRail({ range, threadPage, items, pagination, selectedItemId }: LogThreadRailProps) {
  return (
    <aside className="thread-rail panel" aria-label="Log thread selector">
      <header className="thread-rail-header">
        <h2 className="thread-rail-title">Log Thread</h2>
        <p className="thread-rail-subtitle">
          Page {pagination.page}/{pagination.totalPages}
        </p>
      </header>

      {items.length === 0 ? (
        <p className="thread-empty">No text logs available.</p>
      ) : (
        <ul className="thread-list">
          {items.map((item) => {
            const isActive = item.id === selectedItemId;

            return (
              <li key={item.id}>
                <Link
                  href={threadItemHref({
                    range,
                    threadPage,
                    selected: item.id
                  })}
                  className={`thread-item ${isActive ? "thread-item-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="thread-item-row">
                    <span className="thread-item-label">{sourceLabel(item.type)}</span>
                    <span className="thread-item-date">{item.date}</span>
                  </div>
                  <p className="thread-item-title">{item.title}</p>
                  <p className="thread-item-preview">{item.preview}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="thread-pagination" aria-label="Thread pagination controls">
        {pagination.hasPrev ? (
          <Link href={threadPageHref({ range, threadPage: pagination.page - 1 })} className="thread-page-link">
            Prev
          </Link>
        ) : (
          <span className="thread-page-link thread-page-link-disabled">Prev</span>
        )}
        <span className="thread-page-meta">
          {pagination.totalItems} total
        </span>
        {pagination.hasNext ? (
          <Link href={threadPageHref({ range, threadPage: pagination.page + 1 })} className="thread-page-link">
            Next
          </Link>
        ) : (
          <span className="thread-page-link thread-page-link-disabled">Next</span>
        )}
      </footer>
    </aside>
  );
}
