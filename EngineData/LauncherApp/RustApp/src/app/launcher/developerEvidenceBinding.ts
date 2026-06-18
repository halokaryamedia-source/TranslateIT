import { runtimeApi } from "../engineTranslate/runtimeApi";
import type { AudioStudioValidationEvidence } from "../shared/types";

let observer: MutationObserver | null = null;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function row(label: string, value: string, tone = "neutral"): string {
  return `<p class="developer-log-row"><strong>${escapeHtml(label)}</strong><span class="status-badge status-badge--${escapeHtml(tone)}">${escapeHtml(value)}</span></p>`;
}

function evidenceTone(evidence: AudioStudioValidationEvidence | null): string {
  return evidence?.ok ? "good" : "warning";
}

function evidenceDetail(evidence: AudioStudioValidationEvidence | null): string {
  if (!evidence) return "Evidence command unavailable.";
  if (evidence.ok) return evidence.summary_path ?? "Summary loaded.";
  return evidence.blocker ?? evidence.evidence_dir ?? "Evidence unavailable.";
}

function renderEvidence(panel: HTMLElement, evidence: AudioStudioValidationEvidence | null): void {
  panel.innerHTML = [
    row("Audio Studio evidence", evidence?.stage ?? "not loaded", evidenceTone(evidence)),
    row("Runtime claim", evidence?.summary?.runtime_claim ?? "not available", evidenceTone(evidence)),
    row("Summary verifier", "npm run verify:audio-studio:summary <summary-json-path>", "neutral"),
    `<p class="developer-log-summary">${escapeHtml(evidenceDetail(evidence))}</p>`,
  ].join("");
}

function refreshEvidencePanel(panel: HTMLElement): void {
  if (panel.dataset.audioStudioEvidenceBound === "true") return;
  panel.dataset.audioStudioEvidenceBound = "true";
  panel.innerHTML = `${row("Audio Studio evidence", "checking", "neutral")}<p class="developer-log-summary">Reading latest Audio Studio validation summary.</p>`;
  void runtimeApi.getLatestAudioStudioValidationEvidence()
    .then((evidence) => renderEvidence(panel, evidence))
    .catch(() => renderEvidence(panel, null));
}

export function bindDeveloperEvidenceUi(): () => void {
  const refresh = () => {
    const panel = document.querySelector<HTMLElement>('[aria-label="Validation evidence status"]');
    if (panel) refreshEvidencePanel(panel);
  };
  refresh();
  const root = document.querySelector<HTMLElement>("#settingsContent") ?? document.body;
  observer?.disconnect();
  observer = new MutationObserver(refresh);
  observer.observe(root, { childList: true, subtree: true });
  return unbindDeveloperEvidenceUi;
}

export function unbindDeveloperEvidenceUi(): void {
  observer?.disconnect();
  observer = null;
}
