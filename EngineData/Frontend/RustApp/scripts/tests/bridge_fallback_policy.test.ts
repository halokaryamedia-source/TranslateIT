import assert from "node:assert/strict";
import test from "node:test";

import { meetingSessionStatusFallback } from "../../src/app/runtime/meetingBridgeFallback.ts";

test("unavailable Meeting bridge keeps ownership fail closed", () => {
  const status = meetingSessionStatusFallback("bridge unavailable");

  assert.equal(status.lifecycle, "unavailable");
  assert.equal(status.has_session, true);
  assert.equal(status.authority_active, false);
  assert.equal(status.owner_id, null);
  assert.equal(status.blocker, "frontend_bridge_unavailable");
  assert.equal(status.preflight.ready_for_start, false);
  assert.equal(status.preflight.start_eligible, false);
});
