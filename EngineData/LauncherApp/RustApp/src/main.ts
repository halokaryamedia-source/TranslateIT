import "./styles.css";
import "./launcherGuard.css";
import "./professionalUi.css";
import "./referenceLayout.css";
import "./mainPageLayout.css";
import "./audioSettingsLayout.css";
import "./translateSettingsLayout.css";
import "./developerSettingsLayout.css";
import { LauncherController } from "./app/launcher/launcherController";
import { bindAttachmentLimitWatcher } from "./app/launcher/attachmentLimitWatcher";
import { bindAudioDeviceListUi } from "./app/launcher/audioDeviceListBinding";
import { bindAudioPipelineResultWatcher as bindResultWatcher } from "./app/launcher/audioPipelineResultWatcher";
import { bindReferenceUi } from "./app/launcher/referenceUiBinding";
import { startRealtimeStatusPayloadAutoRefresh } from "./app/launcher/realtimeStatusPayloadRefresh";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw Error("TranslateIT app root was not found.");

new LauncherController(app).start();
bindAttachmentLimitWatcher();
bindReferenceUi();
bindAudioDeviceListUi();
bindResultWatcher();
startRealtimeStatusPayloadAutoRefresh();
