import assert from "node:assert/strict";
import test from "node:test";

import {
  REDACTED_EMAIL,
  REDACTED_LOCAL_PATH,
  REDACTED_SECRET,
  sanitizeDiagnosticText,
  sanitizeHelperBridgeStatus,
} from "../../src/app/shared/diagnosticPrivacy.ts";

test("redacts common local path forms before diagnostics are rendered", () => {
  assert.equal(
    sanitizeDiagnosticText(String.raw`failed at C:\Users\alice\TranslateIT\worker.log`),
    `failed at ${REDACTED_LOCAL_PATH}`,
  );
  assert.equal(
    sanitizeDiagnosticText(`failed at "/home/alice/TranslateIT/runtime log.txt"`),
    `failed at ${REDACTED_LOCAL_PATH}`,
  );
  assert.equal(
    sanitizeDiagnosticText(String.raw`failed at \\server\private\runtime.log`),
    `failed at ${REDACTED_LOCAL_PATH}`,
  );
});

test("redacts email and secret-bearing diagnostic text", () => {
  const sanitized = sanitizeDiagnosticText(
    "owner alice@example.com Authorization: Bearer abc.def.123 token=other-secret password=hunter2",
  );
  assert.ok(sanitized.includes(REDACTED_EMAIL));
  assert.ok(sanitized.includes(REDACTED_SECRET));
  assert.ok(!sanitized.includes("alice@example.com"));
  assert.ok(!sanitized.includes("abc.def.123"));
  assert.ok(!sanitized.includes("other-secret"));
  assert.ok(!sanitized.includes("hunter2"));
});

test("removes unsafe control and bidi characters and keeps messages bounded", () => {
  assert.equal(sanitizeDiagnosticText("safe\u202E status\nnext"), "safe status next");
  assert.equal(sanitizeDiagnosticText("123456", "fallback", 5), "1234…");
  assert.equal(sanitizeDiagnosticText("", "fallback"), "fallback");
});

test("helper bridge display status redacts known diagnostic fields", () => {
  const sanitized = sanitizeHelperBridgeStatus({
    state: "error",
    message: String.raw`worker failed at C:\Users\alice\runtime.log`,
    cuda_ready: false,
    provider_ready: false,
    functional_outbound_ready: false,
    functional_outbound_verified_unix_ms: null,
    degraded_mode: false,
    active_task: null,
    generation_token: 4,
    last_error: "contact alice@example.com token=abc123",
    stderr_log_path: String.raw`C:\Users\alice\stderr.log`,
    updated_unix_ms: 1,
    runtime_claim: "test",
  });

  assert.equal(sanitized.message, `worker failed at ${REDACTED_LOCAL_PATH}`);
  assert.ok(sanitized.last_error?.includes(REDACTED_EMAIL));
  assert.ok(sanitized.last_error?.includes(REDACTED_SECRET));
  assert.equal(sanitized.stderr_log_path, REDACTED_LOCAL_PATH);
});
