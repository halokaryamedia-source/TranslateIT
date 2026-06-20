import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const srcRoot = resolve(appRoot, "src");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const approvalPath = resolve(reportDir, "ui-visual-approval.json");

const requiredScreens = [
  "main_page_v28",
  "voice_recording_state",
  "text_result_state",
  "settings_general",
  "settings_audio_v22",
  "settings_translate_v14",
  "settings_developer_v37",
  "warmup_startup",
  "recent_chat_state",
  "saved_chat_state",
  "local_data_state",
];

function hasAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

function readSource(relativePath) {
  const fullPath = resolve(srcRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function sourceChecks() {
  const shell = readSource("app/active-launcher/shell.ts");
  const parts = readSource("app/active-launcher/lockedReferenceShellParts.ts");
  const settingsViews = readSource("app/active-launcher/settingsViews.ts");
  const referenceCss = readSource("referenceLayout.css");
  const mainCss = readSource("mainPageLayout.css");
  return [
    {
      name: "shell delegates to locked reference parts",
      ok: hasAll(shell, ["lockedWarmupScreen()", "lockedMainSidebar()", "lockedHomeWorkspace()", "lockedSettingsPage()", "lockedRuntimeSinks()"]),
      blocker: "shell_not_using_locked_parts",
    },
    {
      name: "one settings sidebar source",
      ok: hasAll(parts, ["export function lockedSettingsPage", "settings-sidebar", "settings-nav-v22", "SETTINGS_NAV_ITEMS", "settingsNavButton"])
        && !settingsViews.includes("settings-nav-v22")
        && !settingsViews.includes("<aside class=\"settings-sidebar"),
      blocker: "settings_sidebar_not_single_source",
    },
    {
      name: "reference css owns settings shell",
      ok: hasAll(referenceCss, [".settings-page", ".settings-sidebar", ".settings-nav-v22", ".settings-nav-item", ".settings-workspace-v22", ".settings-scroll-v22"]),
      blocker: "settings_reference_css_missing",
    },
    {
      name: "main v28 layout remains scoped",
      ok: hasAll(mainCss, ["body:not(.settings-open) .app-shell", "body:not(.settings-open) .sidebar", "body:not(.settings-open) .hero-panel", "body:not(.settings-open) .composer-wrap"])
        && !mainCss.includes(".settings-sidebar"),
      blocker: "main_v28_layout_scope_broken",
    },
  ];
}

function approvalCheck() {
  if (!existsSync(approvalPath)) {
    return {
      name: "visual approval evidence",
      ok: false,
      blocker: "missing_visual_approval_evidence",
      missing: requiredScreens,
    };
  }
  try {
    const approval = JSON.parse(readFileSync(approvalPath, "utf8"));
    const approved = Array.isArray(approval.approved_screens) ? approval.approved_screens : [];
    const missing = requiredScreens.filter((screen) => !approved.includes(screen));
    const ok = approval.user_approved === true
      && approval.screenshot_evidence === true
      && approval.manual_redraw_used === false
      && approval.locked_reference === "Main v28 + Audio v22 + Translate v14 + Developer v37"
      && missing.length === 0;
    return {
      name: "visual approval evidence",
      ok,
      blocker: ok ? "" : "visual_approval_incomplete",
      missing,
    };
  } catch {
    return {
      name: "visual approval evidence",
      ok: false,
      blocker: "invalid_visual_approval_json",
      missing: requiredScreens,
    };
  }
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const results = [...sourceChecks(), approvalCheck()];
  const failed = results.filter((result) => !result.ok).map((result) => result.name);
  const summary = {
    ok: failed.length === 0,
    ui_ready: failed.length === 0,
    failed,
    checked: results.length,
    locked_reference: "Main v28 + Audio v22 + Translate v14 + Developer v37",
  };
  const report = {
    schema: "translateit.ui_reference_extension_report.v3",
    generated_at: new Date().toISOString(),
    app_root: appRoot,
    approval_path: approvalPath,
    required_screens: requiredScreens,
    summary,
    results,
  };
  const latestJson = resolve(reportDir, "latest-ui-reference-extension.json");
  const latestMd = resolve(reportDir, "latest-ui-reference-extension.md");
  const md = [
    "# TranslateIT UI Reference Extension Report",
    "",
    `OK: ${summary.ok}`,
    `UI ready: ${summary.ui_ready}`,
    `Locked reference: ${summary.locked_reference}`,
    "",
    "| Check | Result | Blocker |",
    "|---|---|---|",
    ...results.map((result) => `| ${result.name} | ${result.ok ? "PASS" : "FAIL"} | ${result.ok ? "none" : result.blocker} |`),
    "",
    "Manual image redraws are not accepted as approval evidence. Use rendered screenshots from repository source or the Tauri app.",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main();
