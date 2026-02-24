"use client";

import { useEffect } from "react";

export function ClientErrorMonitor(): null {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_CLIENT_MONITORING !== "true") {
      return;
    }

    function capture(error: unknown, source: string): void {
      console.error("[client-monitor]", { source, error });
      const sentry = (globalThis as typeof globalThis & {
        Sentry?: { captureException: (exception: unknown, context?: Record<string, unknown>) => void };
      }).Sentry;

      sentry?.captureException(error, { source });
    }

    function onError(event: ErrorEvent): void {
      capture(event.error ?? event.message, "window.error");
    }

    function onUnhandledRejection(event: PromiseRejectionEvent): void {
      capture(event.reason, "window.unhandledrejection");
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
