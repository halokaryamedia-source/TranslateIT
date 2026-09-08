import assert from "node:assert/strict";
import test from "node:test";

import { setupRecoveryMessage } from "../../src/app/runtime/recoveryPolicy.ts";

const healthy = {
  helperState: "ready",
  readinessOk: true,
  inputBlocked: false,
  workerResponseAvailable: true,
  translationIdEnReady: true,
};

test("recovery identifies local translator startup failure", () => {
  assert.match(
    setupRecoveryMessage({ ...healthy, helperStartFailed: true }),
    /local translator couldn't start/i,
  );
});

test("recovery identifies microphone ownership before generic readiness", () => {
  assert.match(
    setupRecoveryMessage({ ...healthy, inputBlocked: true, readinessOk: false }),
    /microphone still needs attention/i,
  );
});

test("recovery identifies Indonesian to English runtime capability", () => {
  assert.match(
    setupRecoveryMessage({ ...healthy, translationIdEnReady: false, readinessOk: false }),
    /Indonesian → English translation runtime/i,
  );
});

test("recovery keeps generic final-check failure when no narrower owner is known", () => {
  assert.match(
    setupRecoveryMessage({ ...healthy, readinessOk: false }),
    /final local translation check/i,
  );
});

test("recovery success preserves Meeting microphone as the next independent owner", () => {
  assert.match(setupRecoveryMessage(healthy), /Meeting microphone may still need attention/i);
});
