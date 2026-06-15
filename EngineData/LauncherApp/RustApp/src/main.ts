import "./styles.css";
import "./settingsLayout.css";
import { LauncherController } from "./app/launcher/launcherController";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) new LauncherController(app).start();
