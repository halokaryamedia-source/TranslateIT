import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = resolve(currentDir, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const scripts = packageJson.scripts ?? {};

const requiredProfiles = [
  "validate:quick",
  "validate:internal",
  "validate:release-preflight",
  "validate:local-heavy",
];

const missing = requiredProfiles.filter((name) => typeof scripts[name] !== "string" || scripts[name].trim().length === 0);

if (missing.length > 0) {
  console.error(`Missing required script profile(s): ${missing.join(", ")}`);
  process.exit(1);
}

const quick = scripts["validate:quick"];
const heavyMarkers = ["models:", "gpu:", "smoke:worker", "setup:worker"];
const foundHeavyMarkers = heavyMarkers.filter((marker) => quick.includes(marker));

if (foundHeavyMarkers.length > 0) {
  console.error(`validate:quick must stay lightweight. Found heavy marker(s): ${foundHeavyMarkers.join(", ")}`);
  process.exit(1);
}

console.log("Script profiles are present and validate:quick is lightweight.");
