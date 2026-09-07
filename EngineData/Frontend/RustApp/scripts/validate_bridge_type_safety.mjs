import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const boundaryFiles = [
  "src/app/shared/types.ts",
  "src/app/shared/tauriBridge.ts",
  "src/app/bridge/runtimeApi.ts",
  "src/app/bridge/runtimeProductFacade.ts",
  "src/app/bridge/myVoiceApi.ts",
  "src/app/bridge/myVoiceBuildApi.ts",
];

const forbidden = [
  ["Record<string, any>", /Record\s*<\s*string\s*,\s*any\s*>/g],
  ["any index signature", /\[[^\]]+\]\s*:\s*any\b/g],
  ["as any assertion", /\bas\s+any\b/g],
  ["explicit any annotation", /:\s*any(?:\[\])?\b/g],
  ["generic any argument", /<\s*any\s*>/g],
];

function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const failures = [];
for (const relativePath of boundaryFiles) {
  const source = withoutComments(readFileSync(resolve(appRoot, relativePath), "utf8"));
  for (const [label, pattern] of forbidden) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) failures.push(`${relativePath}: ${label}`);
  }
}

if (failures.length > 0) {
  console.error("Frontend bridge type-safety contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Frontend bridge type-safety contract passed.");
