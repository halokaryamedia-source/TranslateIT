import assert from "node:assert/strict";
import test from "node:test";

import { mapProductReadiness } from "../../src/app/bridge/runtimeProductFacade.ts";
import { APPLICATION_MEETING_OWNER_ID } from "../../src/app/shared/types.ts";
import type {
  HelperBridgeStatus,
  HelperBridgeWorkerResponse,
  InputPreparationStatus,
  RuntimeSettings,
} from "../../src/app/shared/types.ts";
import type { MeetingSessionStatus } from "../../src/app/bridge/runtimeApi.ts";

const settings: RuntimeSettings = {
  schema_version: 1,
  source_language: "id",
  target_language: "en",
  meeting_setup_state: "completed",
  meeting_setup_checkpoint: 4,
  audio: { input_device_id: null, output_device_id: null },
};

const helper: HelperBridgeStatus = {
  state: "ready",
  message: "ready",
  cuda_ready: false,
  provider_ready: true,
  functional_outbound_ready: true,
  functional_outbound_verified_unix_ms: 1,
  degraded_mode: false,
  active_task: null,
  generation_token: 1,
  last_error: null,
  updated_unix_ms: 1,
  runtime_claim: "test",
};

const workerStatus: HelperBridgeWorkerResponse = {
  ok: true,
  state: "ready",
  task: "status",
  message: "ready",
  generation_token: 1,
  runtime_claim: "test",
  worker_response_json: JSON.stringify({
    stage: "local_realtime_worker_preflight",
    readiness: {
      asr: true,
      translation_id_en: true,
      translation_en_id: true,
      voice_actor_tts: true,
    },
    loaded: {
      asr: true,
      asr_model_id: "test-asr",
      asr_device: "cpu",
      asr_compute_type: "int8",
      translation_directions: ["id->en", "en->id"],
      voice_actor: true,
      voice_actor_device: "cpu",
    },
    selected_device: "cpu",
    selected_translation_device: "cpu",
  }),
};

const inputStatus: InputPreparationStatus = {
  ready: true,
  functional_verified: true,
  selected_device_name: "Test microphone",
  device_count: 1,
  note: "ready",
};

function meetingStatus(lifecycle = "idle"): MeetingSessionStatus {
  const live = lifecycle === "live";
  return {
    lifecycle,
    has_session: live,
    authority_active: live,
    session_id: live ? "test-session" : null,
    generation: live ? 1 : null,
    started_unix_ms: live ? 1 : null,
    active_age_ms: live ? 1 : null,
    capture_active: live,
    owner_id: live ? APPLICATION_MEETING_OWNER_ID : null,
    blocker: "",
    note: "ready",
    preflight: {
      ready_for_start: true,
      start_eligible: true,
      functional_outbound_ready: true,
      functional_outbound_verified_unix_ms: 1,
      microphone_ready: true,
      models_ready: true,
      helper_ready: true,
      provider_ready: true,
      meeting_route_ready: true,
      generation_aware_outbound_stages_ready: true,
      finalized_utterance_source_connected: true,
      outbound_runtime_connected: true,
      blockers: [],
      summary: "ready",
      runtime_claim: "test",
    },
    outbound: {
      generation: live ? 1 : null,
      session_id: live ? "test-session" : null,
      stage: live ? "listening" : "idle",
      utterance_sequence: 0,
      output_active: false,
      last_stage_ok: true,
      timing: null,
      blocker: "",
      note: "ready",
      updated_unix_ms: 1,
      runtime_claim: "test",
    },
    incoming: {
      session_id: live ? "test-session" : null,
      stage: "idle",
      capture_active: false,
      suppressed: false,
      degraded: false,
      blocker: "",
      note: "ready",
      updated_unix_ms: 1,
      runtime_claim: "test",
    },
    runtime_claim: "test",
  };
}

function readiness(approvedVoiceReady: boolean | null, lifecycle = "idle") {
  return mapProductReadiness({
    settings,
    helper,
    workerStatus,
    inputStatus,
    meetingSession: meetingStatus(lifecycle),
    approvedVoiceReady,
  });
}

test("preflight-ready Meeting stays Setup Needed until a Meeting voice is selected", () => {
  const result = readiness(false);
  assert.equal(result.meetingReady, false);
  assert.equal(result.meetingStatus, "Setup Needed");
  assert.match(result.nextAction, /Choose a Meeting voice/);
  assert.doesNotMatch(result.summary, /My Voice isn't ready/);
});

test("unknown Meeting voice readiness remains Checking instead of claiming Ready", () => {
  const result = readiness(null);
  assert.equal(result.meetingReady, false);
  assert.equal(result.meetingStatus, "Checking");
  assert.match(result.nextAction, /Checking the selected Meeting voice/);
});

test("selected Meeting voice completes preflight readiness", () => {
  const result = readiness(true);
  assert.equal(result.meetingReady, true);
  assert.equal(result.meetingStatus, "Ready");
});

test("an authoritative live Meeting remains live if a later voice probe is unavailable", () => {
  const result = readiness(null, "live");
  assert.equal(result.meetingReady, true);
  assert.equal(result.meetingStatus, "Live");
});
