import { getLatestAudioPipelineEvidence, type AudioPipelineEvidence } from "../engineTranslate/audioPipelineApi";

const POLL_ATTEMPTS = 18;
const POLL_INTERVAL_MS = 800;
const RESULT_BUTTONS = "#microphoneButton,#quickMicButton,#recordStatusButton,#micTestButton";

let lastEvidenceKey = "";
let polling = false;
let bound = false;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function evidenceKey(evidence: AudioPipelineEvidence): string {
  return [evidence.evidence_unix_ms ?? "", evidence.transcript_text ?? "", evidence.translated_text ?? ""].join("|");
}

function setNotice(message: string): void {
  const notice = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (notice) notice.textContent = message;
}

function isMissing(evidence: AudioPipelineEvidence | null): boolean {
  return !evidence || evidence.stage === "audio_pipeline_evidence_missing";
}

function playbackStatus(evidence: AudioPipelineEvidence): string {
  if (!evidence.synthesize_ok) return "TTS output was not created.";
  if (!evidence.auto_play_output) return "TTS output is ready, auto-play is off.";
  return evidence.playback_ok ? "TTS audio played locally." : "TTS output is ready, but playback did not complete.";
}

function formatCompletedMessage(evidence: AudioPipelineEvidence): string | null {
  const transcript = evidence.transcript_text?.trim() ?? "";
  const translated = evidence.translated_text?.trim() ?? "";
  if (!evidence.ok || !translated) return null;
  return `Voice translation ready. Transcript: ${transcript || "available"}. Translation: ${translated}. ${playbackStatus(evidence)}`;
}

async function pollForResult(startedAtUnixMs: number): Promise<void> {
  if (polling) return;
  polling = true;
  setNotice("Processing captured audio locally...");
  try {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      await wait(POLL_INTERVAL_MS);
      const evidence = await getLatestAudioPipelineEvidence();
      if (isMissing(evidence)) continue;
      if (!evidence) continue;
      if (evidence.evidence_unix_ms && evidence.evidence_unix_ms + 1000 < startedAtUnixMs) continue;
      const key = evidenceKey(evidence);
      if (key === lastEvidenceKey) continue;
      const completed = formatCompletedMessage(evidence);
      if (completed) {
        lastEvidenceKey = key;
        setNotice(completed);
        return;
      }
      if (attempt === POLL_ATTEMPTS - 1 || evidence.stage === "audio_pipeline_evidence_invalid") {
        const blocker = evidence.blocker ?? `ASR=${Boolean(evidence.transcribe_ok)} Translation=${Boolean(evidence.translate_ok)} TTS=${Boolean(evidence.synthesize_ok)}`;
        setNotice(`Voice pipeline did not complete yet. ${blocker}`);
        return;
      }
    }
    setNotice("Voice pipeline is still processing. Open Developer logs if the result does not appear.");
  } finally {
    polling = false;
  }
}

export function bindAudioPipelineResultWatcher(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    const button = target?.closest(RESULT_BUTTONS);
    if (!button) return;
    const wasRecording = document.body.classList.contains("is-recording");
    if (wasRecording) void pollForResult(Date.now());
  }, true);
}

bindAudioPipelineResultWatcher();
