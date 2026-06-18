import { getLatestAudioPipelineEvidence, type AudioPipelineEvidence } from "../engineTranslate/audioPipelineApi";
import { translationResultView } from "./chatViews";

const POLL_ATTEMPTS = 45;
const POLL_INTERVAL_MS = 800;
const RESULT_BUTTONS = "#microphoneButton,#quickMicButton,#recordStatusButton,#micTestButton";
const NOTICE_TEXT_LIMIT = 360;

let lastEvidenceKey = "";
let polling = false;
let pollingCancelled = false;
let bound = false;
let clickHandler: ((event: MouseEvent) => void) | null = null;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function evidenceKey(evidence: AudioPipelineEvidence): string {
  return [
    evidence.evidence_unix_ms ?? "",
    evidence.transcript_text ?? "",
    evidence.translated_text ?? "",
    evidence.translation_mode_used ?? evidence.translate?.mode ?? "",
    evidence.translation_fallback_used ? "fallback" : "primary",
    evidence.direction_pair ?? evidence.translate?.direction_pair ?? "",
    evidence.synthesize?.provider ?? "",
    evidence.playback_ok === undefined ? "playback_unknown" : String(evidence.playback_ok),
  ].join("|");
}

function setNotice(message: string): void {
  const notice = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (notice) notice.textContent = message;
}

function displayText(value: string, fallback: string): string {
  const text = value.trim();
  if (!text) return fallback;
  if (text.length <= NOTICE_TEXT_LIMIT) return text;
  return `${text.slice(0, NOTICE_TEXT_LIMIT).trim()}...`;
}

function isMissing(evidence: AudioPipelineEvidence | null): boolean {
  return !evidence || evidence.stage === "audio_pipeline_evidence_missing";
}

function ttsProvider(evidence: AudioPipelineEvidence): string {
  const provider = evidence.synthesize?.provider?.trim();
  if (!provider) return "TTS";
  return provider === "windows-sapi" ? "Windows SAPI" : provider === "piper" ? "Piper" : provider;
}

function playbackStatus(evidence: AudioPipelineEvidence): string {
  const provider = ttsProvider(evidence);
  if (!evidence.synthesize_ok) return `${provider} output was not created.`;
  if (!evidence.auto_play_output) return `${provider} output is ready, auto-play is off.`;
  return evidence.playback_ok ? `${provider} audio played locally.` : `${provider} output is ready, but playback did not complete.`;
}

function languagePair(evidence: AudioPipelineEvidence): string {
  const pair = evidence.direction_pair?.trim() || evidence.translate?.direction_pair?.trim();
  if (pair) return pair.replace("->", " > ").toUpperCase();
  const source = evidence.source_language?.trim().toUpperCase() || evidence.translate?.source_language?.trim().toUpperCase() || "SOURCE";
  const target = evidence.target_language?.trim().toUpperCase() || evidence.translate?.target_language?.trim().toUpperCase() || "TARGET";
  return `${source} > ${target}`;
}

function resolvedDirectionSupported(evidence: AudioPipelineEvidence): boolean | undefined {
  return evidence.direction_supported ?? evidence.translate?.direction_supported;
}

function directionStatus(evidence: AudioPipelineEvidence): string {
  const supported = resolvedDirectionSupported(evidence);
  if (supported === false) return "Realtime direction unsupported; Quality route required.";
  if (supported === true) return "Realtime direction supported.";
  return "Direction support not reported.";
}

function translationStatus(evidence: AudioPipelineEvidence): string {
  const requested = evidence.requested_mode?.trim() || "Auto";
  const used = evidence.translation_mode_used?.trim() || evidence.translate?.mode?.trim() || requested;
  const fallback = evidence.translation_fallback_used ? "fallback used" : "no fallback";
  return `${languagePair(evidence)}, ${used} mode (${fallback}; requested ${requested}). ${directionStatus(evidence)}`;
}

function formatCompletedMessage(evidence: AudioPipelineEvidence): string | null {
  const transcript = evidence.transcript_text?.trim() ?? "";
  const translated = evidence.translated_text?.trim() ?? "";
  if (!evidence.ok || !translated) return null;
  return `Voice translation ready. ${translationStatus(evidence)} Transcript: ${displayText(transcript, "available")}. Translation: ${displayText(translated, "available")}. ${playbackStatus(evidence)}`;
}

function renderCompletedResult(evidence: AudioPipelineEvidence): void {
  const transcript = evidence.transcript_text?.trim() || "Voice input";
  const translated = evidence.translated_text?.trim() || "No translated text available.";
  const chatList = document.querySelector<HTMLElement>("#chatList");
  if (!chatList) return;
  chatList.innerHTML = translationResultView(transcript, translated, playbackStatus(evidence));
}

async function pollForResult(startedAtUnixMs: number): Promise<void> {
  if (polling) return;
  polling = true;
  pollingCancelled = false;
  setNotice("Processing captured audio locally. Larger local models may take up to 40 seconds...");
  try {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      await wait(POLL_INTERVAL_MS);
      if (pollingCancelled) return;
      const evidence = await getLatestAudioPipelineEvidence();
      if (pollingCancelled) return;
      if (isMissing(evidence)) continue;
      if (!evidence) continue;
      if (evidence.evidence_unix_ms && evidence.evidence_unix_ms + 1000 < startedAtUnixMs) continue;
      const key = evidenceKey(evidence);
      if (key === lastEvidenceKey) continue;
      const completed = formatCompletedMessage(evidence);
      if (completed) {
        lastEvidenceKey = key;
        renderCompletedResult(evidence);
        setNotice(completed);
        return;
      }
      if (attempt === POLL_ATTEMPTS - 1 || evidence.stage === "audio_pipeline_evidence_invalid") {
        const blocker = evidence.blocker ?? evidence.translate?.blocker ?? evidence.synthesize?.blocker ?? `ASR=${Boolean(evidence.transcribe_ok)} Translation=${Boolean(evidence.translate_ok)} TTS=${Boolean(evidence.synthesize_ok)}`;
        setNotice(`Voice pipeline did not complete yet. ${blocker}`);
        return;
      }
    }
    setNotice("Voice pipeline is still processing. Open Developer logs if the result does not appear.");
  } finally {
    polling = false;
  }
}

export function bindAudioPipelineResultWatcher(): () => void {
  if (bound) return unbindAudioPipelineResultWatcher;
  bound = true;
  clickHandler = (event: MouseEvent) => {
    const target = event.target as Element | null;
    const button = target?.closest(RESULT_BUTTONS);
    if (!button) return;
    const wasRecording = document.body.classList.contains("is-recording");
    if (wasRecording) void pollForResult(Date.now());
  };
  document.addEventListener("click", clickHandler, true);
  return unbindAudioPipelineResultWatcher;
}

export function unbindAudioPipelineResultWatcher(): void {
  if (!bound || !clickHandler) return;
  pollingCancelled = true;
  document.removeEventListener("click", clickHandler, true);
  clickHandler = null;
  bound = false;
}
