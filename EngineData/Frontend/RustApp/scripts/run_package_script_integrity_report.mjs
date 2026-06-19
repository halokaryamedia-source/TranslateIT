import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const packagePath = resolve(appRoot, "package.json");

const requiredFinalScripts = [
  "repair:text-real-worker",
  "validate:quick",
  "test:frontend-backend-contract",
  "test:worker-contract",
  "test:rust-linkage-report",
  "test:accelerated-worker-usage",
  "test:runtime-report",
  "test:voice-report",
  "test:voice-capture-evidence",
  "test:ui-readiness-report",
  "test:ui-binding-report",
  "test:action-binding-report",
  "test:settings-integrity-report",
  "test:professional-gate",
];

function parseJsonWithError(content) {
  try {
    return { ok: true, data: JSON.parse(content) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function skipString(content, index) {
  let i = index + 1;
  while (i < content.length) {
    if (content[i] === "\\") {
      i += 2;
      continue;
    }
    if (content[i] === '"') return i + 1;
    i += 1;
  }
  return content.length;
}

function findScriptsObject(content) {
  const keyIndex = content.search(/"scripts"\s*:/);
  if (keyIndex < 0) return null;
  const openIndex = content.indexOf("{", keyIndex);
  if (openIndex < 0) return null;
  let depth = 0;
  for (let i = openIndex; i < content.length; i += 1) {
    if (content[i] === '"') {
      i = skipString(content, i) - 1;
      continue;
    }
    if (content[i] === "{") depth += 1;
    if (content[i] === "}") {
      depth -= 1;
      if (depth === 0) return content.slice(openIndex, i + 1);
    }
  }
  return null;
}

function decodeJsonString(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw.slice(1, -1);
  }
}

function scriptsObjectKeys(rawObject) {
  if (!rawObject) return [];
  const keys = [];
  let depth = 0;
  for (let i = 0; i < rawObject.length; i += 1) {
    const char = rawObject[i];
    if (char === '"') {
      const start = i;
      const end = skipString(rawObject, i);
      const token = rawObject.slice(start, end);
      let cursor = end;
      while (cursor < rawObject.length && /\s/.test(rawObject[cursor])) cursor += 1;
      if (depth === 1 && rawObject[cursor] === ":") keys.push(decodeJsonString(token));
      i = end - 1;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
  }
  return keys;
}

function duplicates(values) {
  const seen = new Set();
  const duplicateSet = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicateSet.add(value);
    seen.add(value);
  }
  return Array.from(duplicateSet).sort();
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const content = existsSync(packagePath) ? readFileSync(packagePath, "utf8") : "";
  const parsed = parseJsonWithError(content);
  const scriptsBlock = findScriptsObject(content);
  const rawScriptKeys = scriptsObjectKeys(scriptsBlock);
  const duplicateScriptKeys = duplicates(rawScriptKeys);
  const scriptNames = parsed.ok && parsed.data?.scripts ? Object.keys(parsed.data.scripts).sort() : [];
  const testLocalFinal = parsed.ok ? String(parsed.data?.scripts?.["test:local-final"] ?? "") : "";
  const missingFinalScripts = requiredFinalScripts.filter((scriptName) => !testLocalFinal.includes(`npm run ${scriptName}`));
  const ok = Boolean(content && parsed.ok && scriptsBlock && duplicateScriptKeys.length === 0 && missingFinalScripts.length === 0);
  const report = {
    schema: "translateit.package_script_integrity_report.v2",
    generated_at: new Date().toISOString(),
    ok,
    package_path: packagePath,
    package_json_parse_ok: parsed.ok,
    package_json_parse_error: parsed.ok ? "" : parsed.error,
    raw_script_key_count: rawScriptKeys.length,
    parsed_script_key_count: scriptNames.length,
    duplicate_script_keys: duplicateScriptKeys,
    required_final_scripts: requiredFinalScripts,
    missing_from_test_local_final: missingFinalScripts,
  };
  const latestJson = resolve(reportDir, "latest-package-script-integrity.json");
  const latestMd = resolve(reportDir, "latest-package-script-integrity.md");
  const md = [
    "# TranslateIT Package Script Integrity Report",
    "",
    `OK: ${ok}`,
    `Package JSON parse OK: ${parsed.ok}`,
    `Raw script key count: ${rawScriptKeys.length}`,
    `Parsed script key count: ${scriptNames.length}`,
    "",
    "## Duplicate script keys",
    "",
    duplicateScriptKeys.length ? duplicateScriptKeys.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Missing required scripts from test:local-final",
    "",
    missingFinalScripts.length ? missingFinalScripts.map((item) => `- ${item}`).join("\n") : "none",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Package script integrity report written: ${latestMd}`);
  console.log(JSON.stringify({ ok, duplicateScriptKeys, missingFinalScripts }, null, 2));
  if (!ok) process.exitCode = 1;
}

main();
