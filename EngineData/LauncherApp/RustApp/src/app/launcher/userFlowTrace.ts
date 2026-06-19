import type { UserFlowTraceEvent } from "../shared/types";

const MAX_TRACE_ENTRIES = 250;
const flowTrace: UserFlowTraceEvent[] = [];
const traceSubscribers = new Set<(events: UserFlowTraceEvent[]) => void>();

function safeDetail(detail: unknown): string {
  if (detail === undefined || detail === null) return "";
  if (typeof detail === "string") return detail.slice(0, 240);
  try {
    return JSON.stringify(detail).slice(0, 240);
  } catch {
    return String(detail).slice(0, 240);
  }
}

function notify(): void {
  const snapshot = flowTrace.slice();
  traceSubscribers.forEach((subscriber) => {
    try {
      subscriber(snapshot);
    } catch {
      // Diagnostics subscribers must not break the user flow.
    }
  });
}

export function traceUserFlow(event: string, detail: unknown = ""): void {
  const entry: UserFlowTraceEvent = {
    event,
    occurred_at: new Date().toISOString(),
    detail: safeDetail(detail),
  };
  flowTrace.push(entry);
  if (flowTrace.length > MAX_TRACE_ENTRIES) flowTrace.splice(0, flowTrace.length - MAX_TRACE_ENTRIES);
  try {
    const storage = globalThis.localStorage;
    storage?.setItem("translateit:last-user-flow-trace", JSON.stringify(flowTrace.slice(-50)));
  } catch {
    // Local storage is best-effort only.
  }
  notify();
  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info("[TranslateIT Flow]", event, detail);
  }
}

export function getUserFlowTrace(): UserFlowTraceEvent[] {
  return flowTrace.slice();
}

export function clearUserFlowTrace(): void {
  flowTrace.length = 0;
  try {
    globalThis.localStorage?.removeItem("translateit:last-user-flow-trace");
  } catch {
    // Ignore storage failures.
  }
  notify();
}

export function subscribeUserFlowTrace(subscriber: (events: UserFlowTraceEvent[]) => void): () => void {
  traceSubscribers.add(subscriber);
  subscriber(flowTrace.slice());
  return () => traceSubscribers.delete(subscriber);
}
