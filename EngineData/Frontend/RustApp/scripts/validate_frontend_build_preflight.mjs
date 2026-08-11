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

for (const retiredPath of [
  "src/app/active-launcher",
  "src/app/simple-launcher",
  "src/app/first-setup",
]) {
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
]) {
  if (!app.includes(marker)) fail(`App.svelte missing current product marker: ${marker}`);
}
for (const stale of ["SimpleLauncherController", "document.getElementById", "querySelector<", "MutationObserver"]) {
  if (app.includes(stale)) fail(`App.svelte must not hide the old manual DOM owner: ${stale}`);
}

const appCss = readFileSync(join(appRoot, "src", "styles", "app.css"), "utf8");
if (!appCss.includes('@import "tailwindcss";')) fail("styles/app.css must load Tailwind CSS 4.");
if (!appCss.includes('@import "./tokens.css";')) fail("styles/app.css must load the semantic token owner.");

console.log("[frontend-build-preflight] One Svelte 5 application root, approved Vite/Tailwind stack, current Meeting/Text/Settings pages, and retained Tauri runtime bridge are source-aligned. Dependency installation, svelte-check, build, Tauri launch, and rendered UI remain separate proof.");
