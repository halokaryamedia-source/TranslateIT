import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const srcRoot = resolve(appRoot, "src");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");

const checks = [
  {
    name: "shell uses locked reference parts only",
    path: "app/active-launcher/shell.ts",
    mustContain: ["lockedWarmupScreen()", "lockedMainSidebar()", "lockedHomeWorkspace()", "lockedSettingsPage()", "lockedRuntimeSinks()"],
    mustNotContain: ["customSidebar", "alternateSettingsSidebar", "uiComfortLayout"],
  },
  {
    name: "locked reference parts define one settings sidebar",
    path: "app/active-launcher/lockedReferenceShellParts.ts",
    mustContain: ["export function lockedSettingsPage", "<aside class=\"settings-sidebar\">", "settings-nav-v22", "SETTINGS_NAV_ITEMS", "settingsNavButton", "data-settings-tab"],
    mustNotContain: ["settings-sidebar-alt", "settings-sidebar-v2", "settings-tabs-custom", "settings-menu-new"],
  },
  {
    name: "settings sidebar is not duplicated in settings tab views",
    path: "app/active-launcher/settingsViews.ts",
    mustContain: ["settingsPage(", "settingsSection(", "settingsCard(", "settingsGrid(", "settingsField(", "primaryButton(", "radioOption(", "outputRow("],
    mustNotContain: ["<aside class=\"settings-sidebar", "settings-nav-v22", "settings-sidebar-alt", "settings-sidebar-v2"],
  },
  {
    name: "main extensions use reference card patterns",
    path: "app/active-launcher/chatViews.ts",
    mustContain: ["feature-card", "feature-title-row", "feature-icon", "translation-result-card", "translation-result-grid", "translation-result-block", "emptyState"],
    mustNotContain: ["custom-card", "chat-card-new", "random-layout"],
  },
  {
    name: "professional result components use reference tokens",
    path: "professionalUi.css",
    mustContain: ["var(--ref-border-strong)", "var(--ref-surface)", "var(--ref-surface-3)", "var(--ref-text)", "var(--ref-muted)", "translation-result-card", "empty-state-card"],
    mustNotContain: ["#ffffff", "#000000", "uiComfort"],
  },
  {
    name: "reference tokens are centralized",
    path: "referenceLayout.css",
    mustContain: ["--ref-main-sidebar", "--ref-settings-sidebar", "--ref-settings-content-width", "--ref-home-panel-width", "--ref-composer-width", "--ref-radius-card", "--ref-radius-control"],
    mustNotContain: ["uiComfort"],
  },
  {
    name: "main page v28 is scoped and stable",
    path: "mainPageLayout.css",
    mustContain: ["body:not(.settings-open) .app-shell", "body:not(.settings-open) .sidebar", "body:not(.settings-open) .hero-panel", "body:not(.settings-open) .composer-wrap", "transform: translateX(-37px)", "transform: translateX(16px)"],
    mustNotContain: [".settings-sidebar", ".settings-workspace-v22"],
  },
  {
    name: "settings pages share reference sidebar layout",
    path: "referenceLayout.css",
    mustContain: [".settings-page", ".settings-sidebar", ".settings-nav-v22", ".settings-nav-item", ".settings-workspace-v22", ".settings-scroll-v22"],
    mustNotContain: ["settings-sidebar-v2", "settings-sidebar-alt"],
  },
];

function inspect(check) {
  const fullPath = resolve(srcRoot, check.path);
  if (!existsSync(fullPath)) return { name: check.name, ok: false, blocker: "missing_file", path: fullPath };
  const content = readFileSync(fullPath, "utf8");
  const missing = (check.mustContain ?? []).filter((needle) => !content.includes(needle));
  const forbidden = (check.mustNotContain ?? []).filter((needle) => content.includes(needle));
  return { name: check.name, ok: missing.length === 0 && forbidden.length === 0, blocker: missing.length ? "missing_expected_content" : forbidden.length ? "forbidden_content_present" : "", missing, forbidden, path: fullPath };
}

function row(result) {
  const missing = result.missing?.length ? ` / missing: ${result.missing.join(", ")}` : "";
  const forbidden = result.forbidden?.length ? ` / forbidden: ${result.forbidden.join(", ")}` : "";
  return `| ${result.name} | ${result.ok ? "PASS" : "FAIL"}${result.blocker ? ` / ${result.blocker}` : ""}${missing}${forbidden} |`;
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const results = checks.map(inspect);
  const summary = {
    ok: results.every((result) => result.ok),
    failed: results.filter((result) => !result.ok).map((result) => result.name),
    checked: results.length,
    locked_reference: "Main v28 + Audio v22 + Translate v14 + Developer v37",
  };
  const report = {
    schema: "translateit.ui_reference_extension_report.v2",
    started_at: startedAt,
    app_root: appRoot,
    summary,
    results,
  };
  const latestJson = resolve(reportDir, "latest-ui-reference-extension.json");
  const latestMd = resolve(reportDir, "latest-ui-reference-extension.md");
  const md = [
    "# TranslateIT UI Reference Extension Report",
    "",
    `Started: ${startedAt}`,
    `Locked reference: ${summary.locked_reference}`,
    "",
    "| Check | Result |",
    "|---|---|",
    ...results.map(row),
    "",
    "## Summary",
    "",
    `- OK: ${summary.ok}`,
    `- Checked: ${summary.checked}`,
    `- Failed: ${summary.failed.length ? summary.failed.join(", ") : "none"}`,
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`UI reference extension report written: ${latestMd}`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main();
