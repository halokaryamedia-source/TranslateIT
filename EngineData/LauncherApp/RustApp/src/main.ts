import "./styles.css";
import "./settingsLayout.css";
import "./launcherGuard.css";
import { LauncherController } from "./app/launcher/launcherController";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw Error("TranslateIT app root was not found.");
}

new LauncherController(app).start();
