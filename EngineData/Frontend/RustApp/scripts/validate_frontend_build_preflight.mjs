import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");

function fail(message) {
  console.error(`[frontend-build-preflight] ${message}`);
  process.exit(1);
}

const requiredFiles = [
  "package.json",
  "index.html",
  "tsconfig.json",
  "src/main.ts",
  "src/app/simple-launcher/SimpleLauncherController.ts",
  "src/app/bridge/runtimeApi.ts",
  "src/app/bridge/runtimeProductFacade.ts",
];
for (const relativePath of requiredFiles) {
  if (!existsSync(join(appRoot, relativePath))) fail(`Missing required frontend build input: ${relativePath}`);
}

const packageJson = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
if (packageJson.scripts?.["build:frontend"] !== "vite build") fail("build:frontend must remain vite build.");
if (!packageJson.devDependencies?.vite) fail("vite must remain a devDependency.");
if (!packageJson.devDependencies?.typescript) fail("typescript must remain a devDependency.");

const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");
if (!indexHtml.includes("/src/main.ts")) fail("index.html must load /src/main.ts.");
for (const stale of ["audioStudioEntry", "audioStudioThemeEntry", "data-audio-studio-tab"]) {
  if (indexHtml.includes(stale)) fail(`index.html must not load retired feature entry: ${stale}`);
}
const entries = [...indexHtml.matchAll(/<script\s+type=["']module["'][^>]*src=["']([^"']+)["']/g)].map((match) => match[1]);
if (entries.length !== 1 || entries[0] !== "/src/main.ts") fail(`Expected one frontend module entry; found ${entries.join(", ") || "none"}`);

const mainTs = readFileSync(join(appRoot, "src", "main.ts"), "utf8");
for (const marker of ["SimpleLauncherController", "startDesktopWithFirstSetup", "startGlobalMeetingShell", "startMeetingLiveActivityPresentation", 'querySelector<HTMLDivElement>("#app")']) {
  if (!mainTs.includes(marker)) fail(`src/main.ts missing current app marker: ${marker}`);
}
for (const stale of ["audioStudio", "restoreNativeWindow", "installStartupDiagnostics", "startupTrace", "bindDirectVoiceCaptureUi", "mountVirtualRouteSelectionSurface", "new LauncherController"]) {
  if (mainTs.includes(stale)) fail(`src/main.ts reintroduces retired/duplicate startup path: ${stale}`);
}

console.log("[frontend-build-preflight] One current frontend entry is wired to the Meeting/Text desktop shell. Build execution remains separate proof.");
