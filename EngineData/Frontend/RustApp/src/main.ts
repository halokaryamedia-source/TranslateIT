import "./styles.css";
import "./launcherGuard.css";
import "./professionalUi.css";
import "./referenceLayout.css";
import "./mainPageLayout.css";
import "./audioSettingsLayout.css";
import "./translateSettingsLayout.css";
import "./developerSettingsLayout.css";
import "./virtualRouteSelectionSurface.css";
import { LauncherController } from "./app/active-launcher/launcherController";
import { bindAttachmentLimitWatcher } from "./app/active-launcher/attachmentLimitWatcher";
import { bindAudioDeviceListUi } from "./app/active-launcher/audioDeviceListBinding";
import { bindAudioPipelineResultWatcher as bindResultWatcher } from "./app/active-launcher/audioPipelineResultWatcher";
import { bindDeveloperEvidenceUi } from "./app/active-launcher/developerEvidenceBinding";
import { bindDeveloperHelperBridgeUi } from "./app/active-launcher/developerHelperBridgeBinding";
import { bindDirectVoiceCaptureUi } from "./app/active-launcher/directVoiceCaptureBinding";
import { bindSettingsAutosaveUi } from "./app/active-launcher/settingsAutosaveBinding";
import { startStartupReadiness } from "./app/active-launcher/startupReadinessBinding";
import { startHelperBridgeHealthMonitor } from "./app/active-launcher/helperBridgeHealthMonitor";
import { bindReferenceUi } from "./app/active-launcher/referenceUiBinding";
import { bindRuntimeReadinessUiGuard } from "./app/active-launcher/runtimeReadinessUiGuard";
import { startRealtimeStatusPayloadAutoRefresh } from "./app/active-launcher/realtimeStatusPayloadRefresh";
import { restoreNativeWindow } from "./app/active-launcher/windowRescue";
import { bindVoiceOutputPersistenceUi } from "./app/active-launcher/voiceOutputPersistenceBinding";
import { installStartupDiagnostics, startupTrace } from "./app/active-launcher/startupDiagnostics";
import { mountVirtualRouteSelectionSurface, unmountVirtualRouteSelectionSurface } from "./app/active-launcher/virtualRouteSelectionSurfaceMount";
import { bindSourceOrchestrationUi } from "./app/active-launcher/sourceOrchestrationBinding";
import { bindVirtualAudioRouteProviderUi } from "./app/active-launcher/virtualAudioRouteProviderBinding";
import { createCleanupRegistry, scheduleCleanupAwareDelay } from "./app/active-launcher/lifecycleCleanup";

installStartupDiagnostics();
startupTrace("boot:marker", {
  marker: "translateit-tauri-desktop-runtime@0.1.0/startup-diagnostic-v2",
  currentUrl: window.location.href,
});
window.setTimeout(() => {
  void restoreNativeWindow("boot:delayed");
}, 900);

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw Error("TranslateIT app root was not found.");

const cleanup = createCleanupRegistry();

new LauncherController(app).start();
cleanup.add(bindAttachmentLimitWatcher());
bindReferenceUi();
cleanup.add(bindAudioDeviceListUi());
cleanup.add(bindDirectVoiceCaptureUi());
cleanup.add(bindSettingsAutosaveUi());
bindVoiceOutputPersistenceUi();
bindRuntimeReadinessUiGuard();
cleanup.add(bindDeveloperEvidenceUi());
bindDeveloperHelperBridgeUi();
cleanup.add(bindSourceOrchestrationUi());
cleanup.add(bindVirtualAudioRouteProviderUi());
void mountVirtualRouteSelectionSurface();
scheduleCleanupAwareDelay(cleanup, 1000, () => {
  void mountVirtualRouteSelectionSurface();
});
cleanup.add(unmountVirtualRouteSelectionSurface);
cleanup.add(startHelperBridgeHealthMonitor());
cleanup.add(bindResultWatcher());
cleanup.add(startRealtimeStatusPayloadAutoRefresh());
cleanup.add(startStartupReadiness());
cleanup.bindBeforeUnload();
