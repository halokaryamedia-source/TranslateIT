import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

const checks = [
  {
    file: "../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py",
    markers: [
      "MAX_WORKER_REQUEST_BYTES",
      "MAX_TRANSLATION_TEXT_CHARS",
      "MAX_TTS_TEXT_CHARS",
      "MAX_AUDIO_INPUT_BYTES",
      "MAX_GENERATION_TOKENS",
      "safe_command_name",
    ],
  },
  {
    file: "src-tauri/src/main.rs",
    markers: [
      "get_runtime_status_bundle",
      "get_realtime_status_payload",
      "save_runtime_settings",
      "append_chat_message",
      "translate_text",
    ],
    denyMarkers: [
      "plan_native_execution_step",
      "run_runtime_plan",
      "preprocess_audio_payload",
      "run_asr_dry_run",
      "run_text_dry_run",
      "save_calibration_profile",
    ],
  },
  {
    file: "src-tauri/src/engine/capture_lifecycle.rs",
    markers: [
      "WORKER_BRIDGE_TIMEOUT_SECS",
      "MAX_WORKER_STDOUT_BYTES",
      "AudioPipelineWorkerGuard",
      "compare_exchange(false, true",
      "privacy_preserving_audio_evidence",
      "translateit.audio_pipeline_evidence.v5.redacted",
      "user_text_redacted",
      "transcript_chars",
      "translated_chars",
      "worker_stage_summary",
      "safe_file_label",
    ],
    denyMarkers: [
      "worker_path",
    ],
  },
  {
    file: "src-tauri/src/engine/manual_translation.rs",
    markers: [
      "WORKER_BRIDGE_TIMEOUT_SECS",
      "MAX_WORKER_STDOUT_BYTES",
      "wait_for_worker_output",
      "child.kill()",
      "Source text is omitted from this diagnostic for privacy",
    ],
  },
  {
    file: "src-tauri/src/engine/session_chat.rs",
    markers: [
      "MAX_SESSION_MESSAGE_CHARS",
      "MAX_MESSAGES_PER_SESSION",
      "MAX_CHAT_SESSION_FILE_BYTES",
      "write_pretty_json",
    ],
  },
  {
    file: "src-tauri/src/engine/settings.rs",
    markers: [
      "sanitize_optional_runtime_text",
      "sanitize_voice_root",
      "write_atomic",
      "json.tmp",
    ],
  },
  {
    file: "src-tauri/src/engine/logging.rs",
    markers: [
      "MAX_RUNTIME_LOG_FILE_BYTES",
      "rotate_if_too_large",
      "previous.jsonl",
      "is_safe_log_file_name",
      "redact_log_value",
      "looks_like_local_path",
      "looks_like_email",
      "looks_like_secret",
      "[redacted-path]",
      "[redacted-email]",
      "[redacted-secret]",
    ],
  },
  {
    file: "src-tauri/src/engine/paths.rs",
    markers: [
      "current_exe",
      "has_runtime_root_markers",
      "fallback to current working directory",
    ],
  },
  {
    file: "src/app/launcher/launcherController.ts",
    markers: [
      "MAX_ATTACHMENT_NAME_CHARS",
      "safeAttachmentName",
      "replace(/[\\/]/g, \"_\")",
    ],
  },
  {
    file: "src-tauri/tauri.conf.json",
    markers: [
      "object-src 'none'",
      "frame-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
    ],
  },
];

let failed = false;
for (const check of checks) {
  const path = resolve(root, check.file);
  let body = "";
  try {
    body = readFileSync(path, "utf8");
  } catch (error) {
    failed = true;
    console.error(`[security-hardening] missing file: ${check.file}`);
    continue;
  }

  for (const marker of check.markers ?? []) {
    if (!body.includes(marker)) {
      failed = true;
      console.error(`[security-hardening] missing marker in ${check.file}: ${marker}`);
    }
  }

  for (const marker of check.denyMarkers ?? []) {
    if (body.includes(marker)) {
      failed = true;
      console.error(`[security-hardening] forbidden marker in ${check.file}: ${marker}`);
    }
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("[security-hardening] PASS: required hardening markers are present and forbidden command markers are absent.");
}
