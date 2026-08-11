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
  "vite.config.ts",
  "src/main.ts",
  "src/App.svelte",
  "src/pages/FirstSetup.svelte",
  "src/pages/Meeting.svelte",
  "src/pages/Text.svelte",
  "src/pages/Settings.svelte",
  "src/components/layout/Sidebar.svelte",
  "src/components/meeting/MeetingActivity.svelte",
  "src/components/ui/StatusBadge.svelte",
  "src/components/ui/StatusRow.svelte",
  "src/styles/tokens.css",
  "src/styles/app.css",
  "src/app/bridge/runtimeApi.ts",
  "src/app/bridge/runtimeProductFacade.ts",
  "src/app/shared/state.ts",
  "src/app/shared/types.ts",
];
for (const relativePath of requiredFiles) {
  if (!existsSync(join(appRoot, relativePath))) fail(`Missing required frontend build input: ${relativePath}`);
}

for (const retiredPath of ["src/app/active-launcher", "src/app/simple-launcher", "src/app/first-setup"]) {
  if (existsSync(join(appRoot, retiredPath))) fail(`Retired vanilla frontend owner must remain removed: ${retiredPath}`);
}

const packageJson = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
if (packageJson.scripts?.["build:frontend"] !== "vite build") fail("build:frontend must remain vite build.");
if (packageJson.scripts?.typecheck !== "svelte-check --tsconfig ./tsconfig.json") fail("typecheck must use svelte-check for the Svelte frontend.");
for (const dependency of ["@tauri-apps/api", "@lucide/svelte", "bits-ui"]) {
  if (!packageJson.dependencies?.[dependency]) fail(`Missing frontend dependency: ${dependency}`);
}
for (const dependency of ["svelte", "@sveltejs/vite-plugin-svelte", "vite", "typescript", "tailwindcss", "@tailwindcss/vite", "svelte-check"]) {
  if (!packageJson.devDependencies?.[dependency]) fail(`Missing frontend build dependency: ${dependency}`);
}
for (const forbidden of ["@sveltejs/kit", "react", "react-dom", "redux", "vue"]) {
  if (packageJson.dependencies?.[forbidden] || packageJson.devDependencies?.[forbidden]) fail(`Unapproved frontend framework/state dependency present: ${forbidden}`);
}

const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");
const entries = [...indexHtml.matchAll(/<script\s+type=["']module["'][^>]*src=["']([^"']+)["']/g)].map((match) => match[1]);
if (entries.length !== 1 || entries[0] !== "/src/main.ts") fail(`Expected one frontend module entry; found ${entries.join(", ") || "none"}`);

const mainTs = readFileSync(join(appRoot, "src", "main.ts"), "utf8");
for (const marker of ['import { mount } from "svelte"', 'import App from "./App.svelte"', "mount(App, { target })"]) {
  if (!mainTs.includes(marker)) fail(`src/main.ts missing Svelte application-root marker: ${marker}`);
}
for (const stale of ["SimpleLauncherController", "startDesktopWithFirstSetup", "startGlobalMeetingShell", "startMeetingLiveActivityPresentation", "innerHTML ="]) {
  if (mainTs.includes(stale)) fail(`src/main.ts reintroduces retired vanilla startup path: ${stale}`);
}

const viteConfig = readFileSync(join(appRoot, "vite.config.ts"), "utf8");
for (const marker of ['from "@sveltejs/vite-plugin-svelte"', 'from "@tailwindcss/vite"', "plugins: [svelte(), tailwindcss()]"]) {
  if (!viteConfig.includes(marker)) fail(`vite.config.ts missing approved frontend plugin marker: ${marker}`);
}

const app = readFileSync(join(appRoot, "src", "App.svelte"), "utf8");
for (const marker of [
  'from "./pages/FirstSetup.svelte"',
  'from "./pages/Meeting.svelte"',
  'from "./pages/Text.svelte"',
  'from "./pages/Settings.svelte"',
  "runtimeProductFacade.loadProductRuntimeSnapshot",
  "getCurrentWindow().onCloseRequested",
  "runtimeProductFacade.runProductMeetingAction",
  'type CloseDialogAction = "stop" | "retry" | null',
  'closeDialogAction === "retry" ? "Retry Check"',
  '"Unable to verify Meeting state"',
]) {
  if (!app.includes(marker)) fail(`App.svelte missing current product marker: ${marker}`);
}
for (const stale of ["SimpleLauncherController", "document.getElementById", "querySelector<", "MutationObserver", "closeDialogCanStop"]) {
  if (app.includes(stale)) fail(`App.svelte must not reintroduce stale frontend ownership: ${stale}`);
}

const facade = readFileSync(join(appRoot, "src", "app", "bridge", "runtimeProductFacade.ts"), "utf8");
for (const marker of [
  'ProductReadinessLevel = "ready" | "partial" | "blocked" | "checking" | "unavailable"',
  "meetingBridgeUnavailable",
  "helperBridgeUnavailable",
  'label = "Unavailable"',
  'textStatus: helperUnavailable',
]) {
  if (!facade.includes(marker)) fail(`runtimeProductFacade.ts missing bounded Unavailable-state marker: ${marker}`);
}

const textPage = readFileSync(join(appRoot, "src", "pages", "Text.svelte"), "utf8");
for (const marker of [
  "runProductTranslation",
  "swapLanguages",
  "copyTranslation",
  "navigator.clipboard.writeText",
  "targetRevision",
  "requestTargetRevision",
  "userEditedTargetWhileRunning",
  '"Edit kept"',
]) {
  if (!textPage.includes(marker)) fail(`Text.svelte missing explicit Text workflow marker: ${marker}`);
}

const statusBadge = readFileSync(join(appRoot, "src", "components", "ui", "StatusBadge.svelte"), "utf8");
for (const marker of ["--ti-success-border", "--ti-warning-border", "--ti-danger-border"]) {
  if (!statusBadge.includes(marker)) fail(`StatusBadge must use semantic state token: ${marker}`);
}

const tokensCss = readFileSync(join(appRoot, "src", "styles", "tokens.css"), "utf8");
for (const marker of ["--ti-sidebar-width", "--ti-content-width", "--ti-success-border", "--ti-warning-border", "--ti-danger-border"]) {
  if (!tokensCss.includes(marker)) fail(`tokens.css missing durable visual token: ${marker}`);
}

const appCss = readFileSync(join(appRoot, "src", "styles", "app.css"), "utf8");
for (const marker of ['@import "tailwindcss";', '@import "./tokens.css";', ".ti-page", ".ti-panel", ".ti-button", ".ti-field", ".ti-pill", "prefers-reduced-motion"]) {
  if (!appCss.includes(marker)) fail(`styles/app.css missing approved visual-system marker: ${marker}`);
}

console.log("[frontend-build-preflight] Svelte application ownership, approved visual stack, explicit Unavailable state, safe-close modes, Text Copy and late-result protection, and retained Tauri runtime bridge are source-aligned. Dependency installation, svelte-check, build, Tauri launch, clipboard execution, and rendered UI remain separate proof.");
