import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const tauriRoot = join(appRoot, "src-tauri");

const fail = (message) => {
  console.error(`[tauri-package-preflight] ${message}`);
  process.exitCode = 1;
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const requireFile = (path) => {
  if (!existsSync(path)) fail(`Missing required file: ${path}`);
};

const packageJsonPath = join(appRoot, "package.json");
const tauriConfigPath = join(tauriRoot, "tauri.conf.json");
const cargoTomlPath = join(tauriRoot, "Cargo.toml");
const buildRsPath = join(tauriRoot, "build.rs");
const mainRsPath = join(tauriRoot, "src", "main.rs");
const defaultCapabilityPath = join(tauriRoot, "capabilities", "default.json");

for (const path of [packageJsonPath, tauriConfigPath, cargoTomlPath, buildRsPath, mainRsPath, defaultCapabilityPath]) {
  requireFile(path);
}

if (process.exitCode) process.exit(process.exitCode);

const packageJson = readJson(packageJsonPath);
const tauriConfig = readJson(tauriConfigPath);
const defaultCapability = readJson(defaultCapabilityPath);

if (packageJson.scripts?.build !== "echo local-only tauri build deferred") {
  fail("Full Tauri npm build script must remain deferred during non-local CI.");
}

if (packageJson.scripts?.["build:frontend"] !== "vite build") {
  fail("Frontend build script must remain vite build.");
}

if (tauriConfig.productName !== "TranslateIT") {
  fail("Tauri productName must be TranslateIT.");
}

if (tauriConfig.identifier !== "com.halokaryamedia.translateit") {
  fail("Tauri identifier must be com.halokaryamedia.translateit.");
}

if (tauriConfig.build?.beforeBuildCommand !== "npm run build:frontend") {
  fail("Tauri beforeBuildCommand must use the frontend-only build script.");
}

if (tauriConfig.build?.frontendDist !== "../dist") {
  fail("Tauri frontendDist must point to ../dist.");
}

const mainWindow = tauriConfig.app?.windows?.find((window) => window.label === "main");
if (!mainWindow) {
  fail("Tauri config must declare a window with label main.");
}

if (mainWindow && (mainWindow.width < 1280 || mainWindow.height < 760)) {
  fail("Main window size must remain suitable for the desktop UI.");
}

if (tauriConfig.bundle?.active !== true) {
  fail("Tauri bundle config must remain active for future installer preparation.");
}

if (!Array.isArray(tauriConfig.bundle?.targets) || !tauriConfig.bundle.targets.includes("nsis")) {
  fail("Tauri bundle targets must include nsis for Windows installer preparation.");
}

if (defaultCapability.identifier !== "default") {
  fail("Default capability identifier must be default.");
}

if (!Array.isArray(defaultCapability.windows) || !defaultCapability.windows.includes("main")) {
  fail("Default capability must apply to the main window.");
}

if (!Array.isArray(defaultCapability.permissions) || !defaultCapability.permissions.includes("core:default")) {
  fail("Default capability must include core:default.");
}

const cargoToml = readFileSync(cargoTomlPath, "utf8");
for (const marker of [
  'name = "translateit"',
  'edition = "2021"',
  'tauri = { version = "2"',
  'tauri-build = { version = "2"',
]) {
  if (!cargoToml.includes(marker)) fail(`Cargo.toml marker is missing: ${marker}`);
}

const mainRs = readFileSync(mainRsPath, "utf8");
if (!mainRs.includes('get_webview_window("main")')) {
  fail("Rust bootstrap must keep targeting the main webview window.");
}

if (process.exitCode) process.exit(process.exitCode);
console.log("[tauri-package-preflight] Tauri package preflight passed. Installer build remains deferred.");
