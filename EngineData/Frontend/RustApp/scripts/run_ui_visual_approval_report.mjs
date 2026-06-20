import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
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

function readApproval() {
  if (!existsSync(approvalPath)) {
    return {
      ok: false,
      blocker: "missing_visual_approval_evidence",
      detail: "No UI visual approval evidence exists. Do not mark UI ready.",
      data: null,
    };
  }
  try {
    const data = JSON.parse(readFileSync(approvalPath, "utf8"));
    const approvedScreens = Array.isArray(data.approved_screens) ? data.approved_screens : [];
    const missingScreens = requiredScreens.filter((screen) => !approvedScreens.includes(screen));
    const exactReferenceLocked = data.locked_reference === "Main v28 + Audio v22 + Translate v14 + Developer v37";
    const userApproved = data.user_approved === true;
    const screenshotEvidence = data.screenshot_evidence === true;
    const noManualRedraw = data.manual_redraw_used === false;
    const ok = userApproved && screenshotEvidence && noManualRedraw && exactReferenceLocked && missingScreens.length === 0;
    return {
      ok,
      blocker: ok ? "" : "visual_approval_incomplete",
      detail: ok
        ? "All required UI screens have user-approved screenshot evidence."
        : "UI cannot be marked ready until real screenshot/render evidence is approved. Manual redraw previews are not valid evidence.",
      data,
      missing_screens: missingScreens,
      exact_reference_locked: exactReferenceLocked,
      user_approved: userApproved,
      screenshot_evidence: screenshotEvidence,
      no_manual_redraw: noManualRedraw,
    };
  } catch (error) {
    return {
      ok: false,
      blocker: "invalid_visual_approval_json",
      detail: error instanceof Error ? error.message : String(error),
      data: null,
    };
  }
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const approval = readApproval();
  const report = {
    schema: "translateit.ui_visual_approval_report.v1",
    generated_at: generatedAt,
    app_root: appRoot,
    approval_path: approvalPath,
    required_screens: requiredScreens,
    ok: approval.ok,
    blocker: approval.blocker,
    detail: approval.detail,
    missing_screens: approval.missing_screens ?? requiredScreens,
    exact_reference_locked: approval.exact_reference_locked ?? false,
    user_approved: approval.user_approved ?? false,
    screenshot_evidence: approval.screenshot_evidence ?? false,
    no_manual_redraw: approval.no_manual_redraw ?? false,
  };
  const latestJson = resolve(reportDir, "latest-ui-visual-approval.json");
  const latestMd = resolve(reportDir, "latest-ui-visual-approval.md");
  const md = [
    "# TranslateIT UI Visual Approval Report",
    "",
    `Generated: ${generatedAt}`,
    `OK: ${report.ok}`,
    `Blocker: ${report.blocker || "none"}`,
    `Detail: ${report.detail}`,
    "",
    "## Required screens",
    "",
    ...requiredScreens.map((screen) => `- ${screen}`),
    "",
    "## Missing screens",
    "",
    report.missing_screens.length ? report.missing_screens.map((screen) => `- ${screen}`).join("\n") : "none",
    "",
    "## Evidence rules",
    "",
    "- Manual redraw previews are not valid approval evidence.",
    "- Evidence must come from a rendered app/HTML preview that uses repository source files.",
    "- Settings sidebar must be the same component and same layout across every settings-related screen.",
    "- Voice recording state must preserve Main Page v28 layout and only change the recording state indicator.",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`UI visual approval report written: ${latestMd}`);
  console.log(JSON.stringify({ ok: report.ok, blocker: report.blocker, missing_screens: report.missing_screens }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main();
