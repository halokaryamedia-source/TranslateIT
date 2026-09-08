import type { HelperBridgeStatus } from "./types";

export const REDACTED_LOCAL_PATH = "<local-path>";
export const REDACTED_EMAIL = "<redacted-email>";
export const REDACTED_SECRET = "<redacted-secret>";

const UNSAFE_CONTROL_OR_BIDI = /[\u0000-\u0008\u000B-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;
const BEARER_SECRET = /\b(?:authorization\s*[:=]\s*)?bearer\s+[^\s,;]+/gi;
const ASSIGNED_SECRET = /\b(?:token|api[_-]?key|apikey|secret|password|authorization)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const QUOTED_LOCAL_PATH = /(["'])(?:file:\/\/\/)?(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|mnt)\/)[^"']+\1/g;
const FILE_LOCAL_PATH = /file:\/\/\/(?:[A-Za-z]:\/|(?:Users|home|mnt)\/)[^\s"'<>]*/gi;
const WINDOWS_LOCAL_PATH = /\b[A-Za-z]:[\\/][^\s"'<>|]*/g;
const UNC_LOCAL_PATH = /\\\\[^\\/\s"'<>|]+\\[^\s"'<>|]+(?:\\[^\s"'<>|]+)*/g;
const POSIX_LOCAL_PATH = /\/(?:Users|home|mnt)\/[^\s"'<>]*/g;

function redactDiagnosticValue(value: string): string {
  return value
    .replace(BEARER_SECRET, REDACTED_SECRET)
    .replace(ASSIGNED_SECRET, REDACTED_SECRET)
    .replace(EMAIL, REDACTED_EMAIL)
    .replace(QUOTED_LOCAL_PATH, REDACTED_LOCAL_PATH)
    .replace(FILE_LOCAL_PATH, REDACTED_LOCAL_PATH)
    .replace(WINDOWS_LOCAL_PATH, REDACTED_LOCAL_PATH)
    .replace(UNC_LOCAL_PATH, REDACTED_LOCAL_PATH)
    .replace(POSIX_LOCAL_PATH, REDACTED_LOCAL_PATH);
}

export function sanitizeDiagnosticText(
  value: unknown,
  fallback = "Status unavailable.",
  maxChars = 360,
): string {
  const raw = String(value ?? "").replace(UNSAFE_CONTROL_OR_BIDI, "").replace(/\s+/g, " ").trim();
  const redacted = redactDiagnosticValue(raw).replace(/\s+/g, " ").trim() || fallback;
  const limit = Math.max(1, Math.floor(maxChars));
  const characters = Array.from(redacted);
  return characters.length > limit ? `${characters.slice(0, limit - 1).join("")}…` : redacted;
}

export function sanitizeHelperBridgeStatus(status: HelperBridgeStatus): HelperBridgeStatus {
  return {
    ...status,
    message: sanitizeDiagnosticText(status.message),
    last_error: status.last_error ? sanitizeDiagnosticText(status.last_error, "") : null,
    stderr_log_path: status.stderr_log_path ? REDACTED_LOCAL_PATH : null,
  };
}
