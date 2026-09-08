import assert from "node:assert/strict";
import test from "node:test";

import { resolveClosePolicy, type ClosePolicySnapshot } from "../../src/app/runtime/closePolicy.ts";

const base: ClosePolicySnapshot = {
  recordingLineId: null,
  pendingReview: false,
  buildUnavailable: false,
  buildActive: false,
  meetingUnavailable: false,
  hasMeetingSession: true,
  meetingApplicationOwned: true,
  meetingLifecycle: "live",
};

function verdict(overrides: Partial<ClosePolicySnapshot> = {}) {
  return resolveClosePolicy({ ...base, ...overrides });
}

test("blocks close while My Voice is recording", () => {
  assert.deepEqual(verdict({ recordingLineId: 2 }), {
    kind: "dialog",
    title: "Voice recording is still running",
    message: "Stop the current My Voice recording before closing TranslateIT so the take can be reviewed safely.",
    action: null,
  });
});

test("blocks close while a take is pending review", () => {
  assert.equal(verdict({ pendingReview: true }).kind, "dialog");
});

test("fails closed when My Voice build state is unavailable", () => {
  assert.deepEqual(verdict({ buildUnavailable: true }), {
    kind: "dialog",
    title: "Can't check My Voice yet",
    message: "TranslateIT can't confirm whether My Voice is still being created. Keep the app open and try again.",
    action: "retry",
  });
});

test("blocks close while My Voice build is active", () => {
  assert.equal(verdict({ buildActive: true }).kind, "dialog");
});

test("fails closed when Meeting state is unavailable", () => {
  assert.deepEqual(verdict({ meetingUnavailable: true }), {
    kind: "dialog",
    title: "Can't check the meeting yet",
    message: "TranslateIT can't confirm whether Meeting translation is still active. Keep the app open or try the check again.",
    action: "retry",
  });
});

test("destroys immediately when no Meeting session exists", () => {
  assert.deepEqual(verdict({ hasMeetingSession: false }), { kind: "destroy" });
});

test("blocks close when audio belongs to another action", () => {
  assert.equal(verdict({ meetingApplicationOwned: false }).kind, "dialog");
});

test("waits for an existing Meeting stop to finish", () => {
  assert.deepEqual(verdict({ meetingLifecycle: "stopping" }), {
    kind: "wait-for-stop",
    title: "Translation is stopping",
    message: "TranslateIT will close after Meeting translation finishes stopping.",
  });
});

test("requires stop-and-close for an application-owned active session", () => {
  assert.deepEqual(verdict(), { kind: "stop-and-close" });
});
