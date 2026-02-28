"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  boxId: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[chart-error] ${this.props.boxId}:`, error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="chart-empty-state" role="alert">
          <p className="text-sm text-slate-500">Chart could not be rendered.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
