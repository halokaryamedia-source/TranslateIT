from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


facade_path = ROOT / "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts"
facade = facade_path.read_text(encoding="utf-8")
old_load = '''export async function loadProductRuntimeSnapshot(knownSettings?: RuntimeSettings): Promise<ProductRuntimeSnapshot> {
  const settings = knownSettings ?? await runtimeApi.loadSettings();
  if (!settings) throw new Error("TranslateIT settings are unavailable.");

  const [meetingSession, helper, inputStatus] = await Promise.all([
    runtimeApi.getMeetingSessionStatus(),
    runtimeApi.getHelperBridgeStatus(),
    runtimeApi.getInputStatus(),
  ]);
  const workerStatus = helper.state === "ready"
    ? await runtimeApi.helperBridgeWorkerStatus()
    : null;
  const meeting = mapProductMeetingState(meetingSession);
  const readiness = mapProductReadiness({ settings, helper, workerStatus, inputStatus, meetingSession });
  return { settings, readiness, meeting, meetingSession, helper, workerStatus, inputStatus };
}
'''
new_load = '''function helperNeedsLazyStart(helper: HelperBridgeStatus): boolean {
  return helper.state === "not_started" || helper.state === "stopped";
}

async function ensurePostSetupHelperLifecycle(settings: RuntimeSettings): Promise<HelperBridgeStatus> {
  const helper = await runtimeApi.getHelperBridgeStatus();
  if (
    settings.meeting_setup_state === "new" ||
    helperBridgeUnavailable(helper) ||
    !helperNeedsLazyStart(helper)
  ) {
    return helper;
  }

  // Normal post-setup product use should not require a manual Check Setup after
  // every app restart. Reuse the guarded public helper owner, but only for known
  // inactive lifecycle states; do not turn arbitrary helper errors into blind retry.
  await runtimeApi.startHelperBridge();
  return runtimeApi.getHelperBridgeStatus();
}

export async function loadProductRuntimeSnapshot(knownSettings?: RuntimeSettings): Promise<ProductRuntimeSnapshot> {
  const settings = knownSettings ?? await runtimeApi.loadSettings();
  if (!settings) throw new Error("TranslateIT settings are unavailable.");

  // App.svelte intentionally does not enter this normal snapshot while fresh setup
  // remains `new`. The explicit guard above preserves that Python-free First Setup
  // boundary even if this facade is called directly with fresh settings later.
  const helper = await ensurePostSetupHelperLifecycle(settings);
  const [meetingSession, inputStatus] = await Promise.all([
    runtimeApi.getMeetingSessionStatus(),
    runtimeApi.getInputStatus(),
  ]);
  const workerStatus = helper.state === "ready"
    ? await runtimeApi.helperBridgeWorkerStatus()
    : null;
  const meeting = mapProductMeetingState(meetingSession);
  const readiness = mapProductReadiness({ settings, helper, workerStatus, inputStatus, meetingSession });
  return { settings, readiness, meeting, meetingSession, helper, workerStatus, inputStatus };
}
'''
facade = replace_once(facade, old_load, new_load, "post-setup helper lifecycle")
facade_path.write_text(facade, encoding="utf-8")


bootstrap_path = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/app_bootstrap.rs"
bootstrap = bootstrap_path.read_text(encoding="utf-8")
module_start = '#[cfg(target_os = "windows")]\nmod windows_power_lifecycle {'
start = bootstrap.find(module_start)
end_marker = "\nfn configure_runtime_paths"
end = bootstrap.find(end_marker, start)
if start < 0 or end < 0:
    raise RuntimeError("windows power lifecycle module boundary not found")
new_module = r'''#[cfg(target_os = "windows")]
mod windows_power_lifecycle {
    use std::ffi::c_void;
    use std::sync::mpsc::{sync_channel, SyncSender, TrySendError};
    use std::sync::OnceLock;
    use std::thread;

    use tauri::{Runtime, WebviewWindow};

    const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";
    const WM_POWERBROADCAST: u32 = 0x0218;
    const PBT_APMSUSPEND: usize = 0x0004;
    const PBT_APMRESUMECRITICAL: usize = 0x0006;
    const PBT_APMRESUMEAUTOMATIC: usize = 0x0012;
    const TRANSLATEIT_POWER_SUBCLASS_ID: usize = 0x5452_5057;

    type Hwnd = *mut c_void;
    type Lparam = isize;
    type Lresult = isize;
    type Wparam = usize;
    type SubclassProc = Option<
        unsafe extern "system" fn(Hwnd, u32, Wparam, Lparam, usize, usize) -> Lresult,
    >;

    #[link(name = "Comctl32")]
    extern "system" {
        fn SetWindowSubclass(
            hwnd: Hwnd,
            subclass_proc: SubclassProc,
            subclass_id: usize,
            ref_data: usize,
        ) -> i32;
        fn DefSubclassProc(hwnd: Hwnd, message: u32, wparam: Wparam, lparam: Lparam) -> Lresult;
    }

    static POWER_CLEANUP_SENDER: OnceLock<SyncSender<()>> = OnceLock::new();

    fn application_meeting_owned() -> bool {
        crate::engine::runtime_state::latest_runtime_session_state()
            .snapshot
            .as_ref()
            .map(|snapshot| snapshot.owner_id == APPLICATION_MEETING_OWNER_ID)
            .unwrap_or(false)
    }

    fn converge_application_meeting_to_stopped() {
        if application_meeting_owned() {
            // Canonical Meeting Stop revokes generation/output authority before it
            // cancels provider/helper/consumers and releases audio resources. Power
            // lifecycle convergence must keep using this owner rather than inventing
            // a second cleanup path.
            let _ = crate::commands::meeting_session::stop_meeting_translation();
        }
    }

    fn power_event_requires_cleanup(wparam: Wparam) -> bool {
        matches!(
            wparam,
            PBT_APMSUSPEND | PBT_APMRESUMECRITICAL | PBT_APMRESUMEAUTOMATIC
        )
    }

    fn ensure_cleanup_handoff() -> Result<(), Box<dyn std::error::Error>> {
        if POWER_CLEANUP_SENDER.get().is_some() {
            return Ok(());
        }

        // One bounded signal may wait while the cleanup worker is already converging
        // a previous power event. This lets a resume notification request one
        // idempotent follow-up Stop without making the Windows callback wait.
        let (sender, receiver) = sync_channel::<()>(1);
        let cleanup_thread = thread::Builder::new()
            .name("translateit-power-cleanup".to_string())
            .spawn(move || {
                while receiver.recv().is_ok() {
                    converge_application_meeting_to_stopped();
                }
            })?;

        if POWER_CLEANUP_SENDER.set(sender).is_err() {
            // Another installer won the once-only sender race. Dropping this detached
            // worker's only sender lets it exit without creating a second active owner.
            drop(cleanup_thread);
            return Ok(());
        }

        // Dropping a JoinHandle detaches the one process-lifetime lifecycle worker;
        // the static sender owns its useful lifetime until process exit.
        drop(cleanup_thread);
        Ok(())
    }

    fn request_meeting_cleanup() {
        let Some(sender) = POWER_CLEANUP_SENDER.get() else {
            return;
        };
        match sender.try_send(()) {
            Ok(()) | Err(TrySendError::Full(())) => {}
            Err(TrySendError::Disconnected(())) => {}
        }
    }

    unsafe extern "system" fn translateit_power_window_proc(
        hwnd: Hwnd,
        message: u32,
        wparam: Wparam,
        lparam: Lparam,
        _subclass_id: usize,
        _ref_data: usize,
    ) -> Lresult {
        if message == WM_POWERBROADCAST && power_event_requires_cleanup(wparam) {
            // Window-procedure work stays bounded and nonblocking. Session inspection,
            // authority revocation, joins, helper cancellation, and audio release all
            // happen on the lifecycle worker through canonical Meeting Stop.
            request_meeting_cleanup();
        }

        unsafe { DefSubclassProc(hwnd, message, wparam, lparam) }
    }

    pub fn install<R: Runtime>(
        window: &WebviewWindow<R>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        ensure_cleanup_handoff()?;
        let hwnd = window.hwnd()?;
        let installed = unsafe {
            SetWindowSubclass(
                hwnd.0,
                Some(translateit_power_window_proc),
                TRANSLATEIT_POWER_SUBCLASS_ID,
                0,
            )
        };
        if installed == 0 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "TranslateIT could not install the Windows power lifecycle hook.",
            )
            .into());
        }
        Ok(())
    }

    #[cfg(test)]
    mod b4_power_lifecycle_tests {
        use super::{
            power_event_requires_cleanup, PBT_APMRESUMEAUTOMATIC, PBT_APMRESUMECRITICAL,
            PBT_APMSUSPEND,
        };

        #[test]
        fn b4_suspend_and_resume_events_request_cleanup_convergence() {
            assert!(power_event_requires_cleanup(PBT_APMSUSPEND));
            assert!(power_event_requires_cleanup(PBT_APMRESUMECRITICAL));
            assert!(power_event_requires_cleanup(PBT_APMRESUMEAUTOMATIC));
            assert!(!power_event_requires_cleanup(0));
            assert!(!power_event_requires_cleanup(0xffff));
        }
    }
}
'''
bootstrap = bootstrap[:start] + new_module + bootstrap[end:]
bootstrap_path.write_text(bootstrap, encoding="utf-8")


context_path = ROOT / "CONTEXT.md"
context = context_path.read_text(encoding="utf-8")
old_meeting = "Start establishes one session/authority. Navigation does not stop/recreate it. Stop revokes output authority before resource cleanup, stops both audio lanes, cancels/joins Meeting work, clears transient conversation/audio state, and ends the session. Safe application close uses the same Stop owner and fails closed when session state cannot be verified."
new_meeting = "Start establishes one session/authority. Navigation does not stop/recreate it. Stop revokes output authority before resource cleanup, stops both audio lanes, cancels/joins Meeting work, clears transient conversation/audio state, and ends the session. Safe application close uses the same Stop owner and fails closed when session state cannot be verified. Windows suspend/resume window messages only enqueue a bounded nonblocking cleanup signal; a Rust lifecycle worker then converges through the same authority-first Meeting Stop owner."
context = replace_once(context, old_meeting, new_meeting, "meeting power lifecycle context")
old_snapshot = "Normal `loadProductRuntimeSnapshot()` reads settings, Meeting status/preflight, helper status, input status, and worker capability when the helper is ready. Heavy diagnostic/model/native probing is not normal polling work. During an active Meeting, the recurring frontend path polls Meeting status; the larger committed-turn snapshot is conditional on a status revision change rather than fetched unconditionally on every interval."
new_snapshot = "Normal post-setup `loadProductRuntimeSnapshot()` lazily starts the one helper only when its lifecycle is known `not_started`/`stopped`, then reads Meeting status/preflight, helper status, input status, and worker capability when the helper is ready. Fresh `meeting_setup_state = new` boot does not enter this normal snapshot path and therefore does not start Python. Heavy diagnostic/model/native probing is not normal polling work. During an active Meeting, the recurring frontend path polls Meeting status; the larger committed-turn snapshot is conditional on a status revision change rather than fetched unconditionally on every interval."
context = replace_once(context, old_snapshot, new_snapshot, "post-setup helper context")
context_path.write_text(context, encoding="utf-8")


next_path = ROOT / "docs/knowledge/next-action.md"
next_text = next_path.read_text(encoding="utf-8")
marker = "## Current Mode\n"
pos = next_text.rfind(marker)
if pos < 0:
    raise RuntimeError("canonical Current Mode tail not found")
new_tail = '''## Backend Pre-Local B4 — CLOSED

Normal post-setup product snapshot now lazily restores the one persistent helper when its lifecycle is known `not_started` or `stopped`, before Meeting preflight and worker capability are sampled. This removes the normal requirement to run Check Setup after each app restart while reusing the guarded existing helper owner. Arbitrary helper `error`/blocked states are not converted into a blind restart loop. Text retains its existing on-demand helper start path.

Fresh First Setup remains Python-free by contract: `App.svelte` does not enter the normal product snapshot while `meeting_setup_state = new`, and the product facade additionally refuses lazy helper start for `new` settings if called directly. No second helper launcher, background readiness service, or frontend runtime truth was introduced.

Windows suspend/resume handling now keeps the window procedure bounded. `WM_POWERBROADCAST` only performs a nonblocking `try_send` into one process-lifetime Rust lifecycle worker. That worker performs session inspection and converges an app-owned Meeting through the existing canonical `stop_meeting_translation()` path, preserving authority-first output revocation and idempotent Stop semantics without doing cancellation/join/audio cleanup inside the Windows callback.

Remote Windows/source proof for this slice passed:

```text
post-setup helper lifecycle source contract -> PASS
fresh First Setup Python-start gate          -> PASS
Windows power callback handoff contract      -> PASS
Rust B4 power-event classification test      -> PASS
canonical npm ci + svelte-check              -> PASS
Vite production build                        -> PASS
cargo check                                  -> PASS
Tauri release build --no-bundle              -> PASS
```

This proves the lifecycle ownership, fresh-setup gate, nonblocking callback structure, Windows compilation, and release linking. It does not prove real sleep/wake during an active Meeting, physical-device recovery after resume, packaged PythonRuntime placement, or user-local-PC behavior; those remain target-Windows/release acceptance. No B5 proof-tool reconciliation, VAD tuning, installer staging, or broad dead-code cleanup occurred in B4.

## Current Mode

**Maintenance / Backend Pre-Local Readiness — B4 CLOSED.** Backend hardening A1-A7 and pre-local B1-B4 are source/proof closed. P2.3 CPU model execution remains proven; real CUDA execution remains deferred to a GPU-capable Windows target. Continue the mapped pre-local readiness waves in order.

## Next Step — Backend Pre-Local B5: Local Proof Tooling

Provide one deterministic developer model-asset acquisition path using the canonical model/runtime ownership, and reconcile the worker smoke/proof tooling to the current direction-based ID <-> EN translation contract, English TTS, optional ASR, and explicit device/fallback truth. Keep B5 limited to proof/developer tooling; do not mix VAD tuning, installer staging, lifecycle redesign, or broad cleanup.
'''
next_path.write_text(next_text[:pos] + new_tail, encoding="utf-8")

print("Backend pre-local B4 patch staged")
