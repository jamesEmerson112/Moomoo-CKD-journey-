import React from "react";

import type { IssueWeightedRankItem } from "@/lib/contracts";

interface Box07RecentIssuesRankProps {
  issueRank: IssueWeightedRankItem[];
}

export function Box07RecentIssuesRank({ issueRank }: Box07RecentIssuesRankProps) {
  return (
    <section data-box-id="box-07" className="panel board-box board-list-box">
      <h2 className="board-heading">Recent Issues Rank</h2>

      {issueRank.length === 0 ? (
        <p className="board-muted">No issue terms detected yet.</p>
      ) : (
        <ol className="board-list-scroll">
          {issueRank.map((issue, index) => (
            <li key={issue.issueKey} className="board-list-item">
              <div className="board-list-item-header">
                <p className="board-list-title">
                  {index + 1}. {issue.label}
                </p>
                <span className="board-list-count">
                  {issue.weightedScore.toFixed(1)}
                </span>
              </div>
              <p className="board-list-sub">{issue.lastSeenDate} · {issue.mentionCount} mentions</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
