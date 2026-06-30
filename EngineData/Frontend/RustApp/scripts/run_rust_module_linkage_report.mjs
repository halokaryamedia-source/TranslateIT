import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const engineModPath = resolve(appRoot, "src-tauri", "src", "engine", "mod.rs");
const manualAcceleratedPath = resolve(appRoot, "src-tauri", "src", "engine", "manual_translation_accelerated.rs");
const textTranslateCommandPath = resolve(appRoot, "src-tauri", "src", "commands", "text_translate.rs");

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function check(name, ok, detail) {
  return { name, ok, detail };
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const engineMod = read(engineModPath);
  const accelerated = read(manualAcceleratedPath);
  const textTranslateCommand = read(textTranslateCommandPath);
  const checks = [
    check("accelerated module file exists", accelerated.length > 0, manualAcceleratedPath),
    check("engine mod declares accelerated module", engineMod.includes("pub mod manual_translation_accelerated;"), "pub mod manual_translation_accelerated"),
    check("engine mod exports translate_text", engineMod.includes("pub use manual_translation_accelerated::translate_text;") || engineMod.includes("pub use manual_translation::translate_text;"), "engine translate_text export"),
    check("accelerated module has legacy fallback", accelerated.includes("super::manual_translation::translate_text"), "legacy fallback present"),
    check("text translate command delegates to engine translate_text", textTranslateCommand.includes("engine::translate_text"), "commands/text_translate.rs delegates to engine::translate_text"),
    check("text translate command can use helper bridge", textTranslateCommand.includes("translate_with_running_helper_bridge"), "helper bridge translation path present"),
  ];
  const ok = checks.every((item) => item.ok);
  const report = {
    schema: "translateit.rust_module_linkage_report.v2",
    generated_at: new Date().toISOString(),
    ok,
    checks,
  };
  const latestJson = resolve(reportDir, "latest-rust-module-linkage.json");
  const latestMd = resolve(reportDir, "latest-rust-module-linkage.md");
  const md = [
    "# TranslateIT Rust Module Linkage Report",
    "",
    `OK: ${ok}`,
    "",
    "| Check | Result | Detail |",
    "|---|---|---|",
    ...checks.map((item) => `| ${item.name} | ${item.ok ? "PASS" : "FAIL"} | ${item.detail} |`),
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Rust module linkage report written: ${latestMd}`);
  console.log(JSON.stringify({ ok, failed: checks.filter((item) => !item.ok).map((item) => item.name) }, null, 2));
  if (!ok) process.exitCode = 1;
}

main();
