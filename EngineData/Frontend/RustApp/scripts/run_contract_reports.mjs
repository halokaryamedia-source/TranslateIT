import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
mkdirSync(reportDir, { recursive: true });

const reports = [
  ["frontend-backend-contract", "run_frontend_backend_contract_report.mjs"],
  ["worker-contract", "run_worker_contract_report.mjs"],
  ["rust-linkage-report", "run_rust_module_linkage_report.mjs"],
  ["ui-binding-report", "run_ui_binding_consistency_report.mjs"],
  ["action-binding-report", "run_action_binding_report.mjs"],
];

function runReport(name, script) {
  const scriptPath = resolve(appRoot, "scripts", script);
  if (!existsSync(scriptPath)) {
    return {
      name,
      script,
      ok: false,
      status: null,
      stdout: "",
      stderr: `Missing report script: ${scriptPath}`,
    };
  }
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: appRoot,
    encoding: "utf8",
    maxBuffer: 2_000_000,
  });
  return {
    name,
    script,
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

const results = reports.map(([name, script]) => runReport(name, script));

for (const result of results) {
  const log = [
    `# ${result.name}`,
    `script=${result.script}`,
    `ok=${result.ok}`,
    `status=${result.status}`,
    "",
    "## stdout",
    result.stdout || "(empty)",
    "",
    "## stderr",
    result.stderr || "(empty)",
    "",
  ].join("\n");
  writeFileSync(resolve(reportDir, `contract-report-${result.name}.log`), log);
}

const failed = results.filter((result) => !result.ok);
const summary = {
  schema: "translateit.contract_reports_runner.v2",
  generated_at: new Date().toISOString(),
  ok: failed.length === 0,
  ci_blocking: false,
  note: "Contract reports are diagnostic evidence only. CI blocking is handled by explicit validators, frontend typecheck/build, and Rust/Tauri source guard.",
  failed: failed.map((result) => result.name),
  results: results.map((result) => ({
    name: result.name,
    script: result.script,
    ok: result.ok,
    status: result.status,
    log_path: `contract-report-${result.name}.log`,
  })),
};

writeFileSync(resolve(reportDir, "latest-contract-reports-runner.json"), JSON.stringify(summary, null, 2));
writeFileSync(
  resolve(reportDir, "latest-contract-reports-runner.md"),
  [
    "# TranslateIT Contract Reports Runner",
    "",
    `OK: ${summary.ok}`,
    `CI blocking: ${summary.ci_blocking}`,
    "",
    summary.note,
    "",
    "| Report | Result | Log |",
    "|---|---|---|",
    ...summary.results.map((result) => `| ${result.name} | ${result.ok ? "PASS" : "FAIL"} | ${result.log_path} |`),
    "",
    "## Failed reports",
    "",
    summary.failed.length ? summary.failed.map((item) => `- ${item}`).join("\n") : "none",
  ].join("\n"),
);

console.log("Contract reports summary:");
console.log(JSON.stringify(summary, null, 2));

if (failed.length > 0) {
  console.warn(`Contract report diagnostics found non-blocking failures: ${failed.map((result) => result.name).join(", ")}`);
}
