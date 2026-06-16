import "./styles.css";
import "./launcherGuard.css";
import "./professionalUi.css";
import "./referenceLayout.css";
import "./mainPageLayout.css";
import "./audioSettingsLayout.css";
import { LauncherController } from "./app/launcher/launcherController";
import { bindAttachmentLimitWatcher } from "./app/launcher/attachmentLimitWatcher";
import { bindAudioPipelineResultWatcher as bindResultWatcher } from "./app/launcher/audioPipelineResultWatcher";
import { bindReferenceUi } from "./app/launcher/referenceUiBinding";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw Error("TranslateIT app root was not found.");

new LauncherController(app).start();
bindAttachmentLimitWatcher();
bindReferenceUi();
bindResultWatcher();
