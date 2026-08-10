type StartupTraceRecord = {
  at: string;
  label: string;
  detail: unknown;
};

const STARTUP_TRACE_KEY = "__translateitStartupTrace";
const STARTUP_BUILD_MARKER = "translateit-tauri-desktop-runtime@0.1.0/startup-diagnostic-v2";
const MAX_TRACE_RECORDS = 48;

function safeStringify(detail: unknown): string {
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function pushTraceRecord(record: StartupTraceRecord): void {
  const globalScope = globalThis as typeof globalThis & { [STARTUP_TRACE_KEY]?: StartupTraceRecord[] };
  const current = globalScope[STARTUP_TRACE_KEY] ?? [];
  current.push(record);
  if (current.length > MAX_TRACE_RECORDS) current.splice(0, current.length - MAX_TRACE_RECORDS);
  globalScope[STARTUP_TRACE_KEY] = current;
}

function updateVisibleTrace(label: string, detail: unknown): void {
  const element = document.getElementById("startupTraceLine");
  if (!element) return;
  const summary = safeStringify(detail);
  element.textContent = `${label}${summary === "null" ? "" : ` · ${summary}`}`;
}

export function startupTrace(label: string, detail: unknown = null): void {
  const record: StartupTraceRecord = {
    at: new Date().toISOString(),
    label,
    detail,
  };
  pushTraceRecord(record);
  updateVisibleTrace(label, detail);
  console.info(`[TranslateIT Startup] ${label}`, detail);
}

export function getStartupTraceSummary(): string {
  const globalScope = globalThis as typeof globalThis & { [STARTUP_TRACE_KEY]?: StartupTraceRecord[] };
  const records = globalScope[STARTUP_TRACE_KEY] ?? [];
  return records
    .map((record) => `${record.at} ${record.label} ${safeStringify(record.detail)}`)
    .join(" | ");
}

export function getStartupBuildMarker(): string {
  return STARTUP_BUILD_MARKER;
}

export function installStartupDiagnostics(): void {
  const globalScope = globalThis as typeof globalThis & {
    [STARTUP_TRACE_KEY]?: StartupTraceRecord[];
    __translateitStartupBuildMarker?: string;
  };
  globalScope.__translateitStartupBuildMarker = STARTUP_BUILD_MARKER;
  if (!globalScope[STARTUP_TRACE_KEY]) {
    globalScope[STARTUP_TRACE_KEY] = [];
  }
  window.addEventListener("error", (event) => {
    startupTrace("window.error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    startupTrace("window.unhandledrejection", {
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
    });
  });
  startupTrace("install", {
    buildMarker: STARTUP_BUILD_MARKER,
    href: window.location.href,
    hasWindowTauri: Boolean((window as typeof window & { __TAURI__?: unknown }).__TAURI__),
    hasWindowTauriInternals: Boolean((window as typeof window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__),
  });
}
