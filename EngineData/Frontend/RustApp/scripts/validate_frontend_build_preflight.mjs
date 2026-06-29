import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const appRoot = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));

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
if (!mainTs.includes("LauncherController")) {
  fail("src/main.ts must wire LauncherController.");
}
if (!mainTs.includes("#app")) {
  fail("src/main.ts must bind to #app root.");
}

const audioStudioEntry = readFileSync(join(appRoot, "src", "audioStudioEntry.ts"), "utf8");
if (!audioStudioEntry.includes("bindAudioStudioUi")) {
  fail("src/audioStudioEntry.ts must bind Audio Studio UI.");
}

console.log("[frontend-build-preflight] Frontend build preflight passed. Full Vite build can be promoted next.");
