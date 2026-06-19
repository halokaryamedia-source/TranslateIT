import { runtimeApi } from "../bridge/runtimeApi";

const REFRESH_INTERVAL_MS = 12_000;
let timer: number | null = null;
let pending = false;
let lastStage = "";

function publishPipelineStatus(message: string): void {
  document.body.dataset.audioPipelineStatus = message;
}

async function refreshOnce(): Promise<void> {
  if (pending) return;
  pending = true;
  try {
    const evidence = await runtimeApi.getLatestAudioPipelineEvidence();
    if (!evidence) return;
    const stage = evidence.stage ?? "unknown";
    if (stage === lastStage) return;
    lastStage = stage;
    publishPipelineStatus(evidence.ok ? `audio_pipeline:${stage}:ok` : `audio_pipeline:${stage}:blocked`);
  } catch {
    publishPipelineStatus("audio_pipeline:unavailable");
  } finally {
    pending = false;
  }
}

export function bindAudioPipelineResultWatcher(): () => void {
  if (timer !== null) return unbindAudioPipelineResultWatcher;
  void refreshOnce();
  timer = window.setInterval(() => void refreshOnce(), REFRESH_INTERVAL_MS);
  return unbindAudioPipelineResultWatcher;
}

export function unbindAudioPipelineResultWatcher(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  pending = false;
  lastStage = "";
}
