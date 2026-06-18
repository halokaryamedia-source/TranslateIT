import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { startupTrace } from "./startupDiagnostics";

const DESIRED_WINDOW_SIZE = new LogicalSize(1600, 940);
const MIN_WINDOW_SIZE = new LogicalSize(1280, 760);

type WindowSizeSnapshot = {
  width: number;
  height: number;
} | null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasTauriWindowMetadata(): boolean {
  const scope = globalThis as typeof globalThis & {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  return Boolean(scope.__TAURI__ || scope.__TAURI_INTERNALS__);
}

async function snapshotWindowSize(label: string): Promise<WindowSizeSnapshot> {
  try {
    const size = await getCurrentWindow().innerSize();
    startupTrace(label, { width: size.width, height: size.height });
    return { width: size.width, height: size.height };
  } catch (error) {
    startupTrace(label, { error: errorMessage(error) });
    return null;
  }
}

export async function restoreNativeWindow(reason: string): Promise<void> {
  if (!hasTauriWindowMetadata()) {
    startupTrace("window.restore:skipped", {
      reason,
      note: "native window metadata is unavailable in this runtime",
    });
    return;
  }

  let appWindow;
  try {
    appWindow = getCurrentWindow();
  } catch (error) {
    startupTrace("window.restore:unavailable", {
      reason,
      message: errorMessage(error),
    });
    return;
  }

  startupTrace("window.restore:start", {
    reason,
    hasWindowTauri: Boolean((appWindow as typeof appWindow & { __TAURI__?: unknown }).__TAURI__),
    hasWindowTauriInternals: Boolean((appWindow as typeof appWindow & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__),
  });

  const before = await snapshotWindowSize("window.restore:before");

  try {
    await appWindow.unminimize();
  } catch (error) {
    startupTrace("window.restore:unminimize:error", { reason, message: errorMessage(error) });
  }

  try {
    await appWindow.show();
  } catch (error) {
    startupTrace("window.restore:show:error", { reason, message: errorMessage(error) });
  }

  try {
    await appWindow.setMinSize(MIN_WINDOW_SIZE);
  } catch (error) {
    startupTrace("window.restore:setMinSize:error", { reason, message: errorMessage(error) });
  }

  try {
    await appWindow.setSize(DESIRED_WINDOW_SIZE);
  } catch (error) {
    startupTrace("window.restore:setSize:error", { reason, message: errorMessage(error) });
  }

  try {
    await appWindow.center();
  } catch (error) {
    startupTrace("window.restore:center:error", { reason, message: errorMessage(error) });
  }

  try {
    await appWindow.setFocus();
  } catch (error) {
    startupTrace("window.restore:setFocus:error", { reason, message: errorMessage(error) });
  }

  await new Promise((resolve) => globalThis.setTimeout(resolve, 250));

  const after = await snapshotWindowSize("window.restore:after");
  const needsFallback = Boolean(after && (after.width < 800 || after.height < 500));
  if (needsFallback) {
    startupTrace("window.restore:fallback-maximize", {
      reason,
      before,
      after,
    });
    try {
      await appWindow.maximize();
    } catch (error) {
      startupTrace("window.restore:maximize:error", { reason, message: errorMessage(error) });
    }
    await snapshotWindowSize("window.restore:after-maximize");
  }

  startupTrace("window.restore:complete", {
    reason,
    before,
    after,
    fallbackApplied: needsFallback,
  });
}
