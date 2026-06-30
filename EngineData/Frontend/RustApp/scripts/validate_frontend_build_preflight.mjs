import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");

const fail = (message) => {
  console.error(`[frontend-build-preflight] ${message}`);
  process.exit(1);
};

const requiredFiles = [
  "package.json",
  "index.html",
  "tsconfig.json",
  "src/main.ts",
  "src/audioStudioEntry.ts",
  "src/styles.css",
  "src/app/simple-launcher/SimpleLauncherController.ts",
  "src/app/bridge/runtimeProductFacade.ts",
];

for (const relativePath of requiredFiles) {
  const absolutePath = join(appRoot, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`Missing required frontend build input: ${relativePath}`);
  }
}

const packageJson = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
const scripts = packageJson.scripts ?? {};
if (scripts["build:frontend"] !== "vite build") {
  fail("build:frontend must remain a frontend-only Vite build command.");
}

const devDeps = packageJson.devDependencies ?? {};
if (!devDeps.vite) {
  fail("vite must be declared in devDependencies for frontend build.");
}
if (!devDeps.typescript) {
  fail("typescript must be declared in devDependencies for frontend type/build pipeline.");
}

const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");
for (const marker of ["/src/main.ts", "/src/audioStudioEntry.ts", "id=\"app\""]) {
  if (!indexHtml.includes(marker)) {
    fail(`index.html missing required marker: ${marker}`);
  }
}

const mainTs = readFileSync(join(appRoot, "src", "main.ts"), "utf8");
if (!mainTs.includes("SimpleLauncherController")) {
  fail("src/main.ts must wire SimpleLauncherController.");
}
if (!mainTs.includes("#app")) {
  fail("src/main.ts must bind to #app root.");
}
for (const forbidden of ["new LauncherController", "bindDirectVoiceCaptureUi", "mountVirtualRouteSelectionSurface"]) {
  if (mainTs.includes(forbidden)) fail(`src/main.ts must not re-enable complex legacy UI binding: ${forbidden}`);
}

const audioStudioEntry = readFileSync(join(appRoot, "src", "audioStudioEntry.ts"), "utf8");
if (!audioStudioEntry.includes("bindAudioStudioUi")) {
  fail("src/audioStudioEntry.ts must bind Audio Studio UI.");
}

console.log("[frontend-build-preflight] Frontend build preflight passed for the simple launcher entry.");
