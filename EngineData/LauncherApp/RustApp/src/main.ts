import "./styles.css";
import { LauncherController } from "./app/launcher/launcherController";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("TranslateIT app root was not found.");

new LauncherController(app).start();
