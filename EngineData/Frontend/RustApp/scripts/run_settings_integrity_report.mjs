import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const srcRoot = resolve(appRoot, "src");

const requiredFiles = [
  "app/active-launcher/settingsAutosaveBinding.ts",
  "app/active-launcher/launcherSettingsRenderer.ts",
  "app/active-launcher/settingsViews.ts",
  "app/bridge/runtimeApi.ts",
  "app/shared/types.ts",
];

const suspiciousTerms = ["fake setting", "todo: wire", "dummy"];
const blockedTerms = ["audioSensitivityButton", "coming soon"];
const requiredTerms = ["RUNTIME_SETTINGS_SAVED_EVENT", "saveRuntimeSettings", "RuntimeSettings", "runtime_profile", "Advanced controls are intentionally hidden", "planned feature"];

function readExisting(relativePath) {
  const path = resolve(srcRoot, relativePath);
  return existsSync(path) ? { path, content: readFileSync(path, "utf8") } : { path, content: null };
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const files = requiredFiles.map(readExisting);
  const missingFiles = files.filter((file) => file.content === null).map((file) => file.path);
  const combinedOriginal = files.map((file) => file.content ?? "").join("\n");
  const combined = combinedOriginal.toLowerCase();
  const suspiciousHits = suspiciousTerms.filter((term) => combined.includes(term));
  const blockedHits = blockedTerms.filter((term) => combinedOriginal.includes(term));
  const missingTerms = requiredTerms.filter((term) => !combinedOriginal.includes(term));
  const ok = missingFiles.length === 0 && suspiciousHits.length === 0 && blockedHits.length === 0 && missingTerms.length === 0;
  const report = {
    schema: "translateit.settings_integrity_report.v2",
    started_at: new Date().toISOString(),
    app_root: appRoot,
    ok,
    missing_files: missingFiles,
    suspicious_hits: suspiciousHits,
    blocked_hits: blockedHits,
    missing_required_terms: missingTerms,
  };
  const latestJson = resolve(reportDir, "latest-settings-integrity.json");
  const latestMd = resolve(reportDir, "latest-settings-integrity.md");
  const md = [
    "# TranslateIT Settings Integrity Report",
    "",
    `OK: ${ok}`,
    "",
    "## Missing files",
    "",
    missingFiles.length ? missingFiles.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Suspicious terms",
    "",
    suspiciousHits.length ? suspiciousHits.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Blocked terms",
    "",
    blockedHits.length ? blockedHits.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Missing required runtime settings terms",
    "",
    missingTerms.length ? missingTerms.map((item) => `- ${item}`).join("\n") : "none",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Settings integrity report written: ${latestMd}`);
  console.log(JSON.stringify({ ok, missingFiles: missingFiles.length, suspiciousHits, blockedHits, missingTerms }, null, 2));
  if (!ok) process.exitCode = 1;
}

main();