import type { AudioStudioTakeSource, AudioStudioTakeState } from "../shared/audioStudioTypes";
export type { AudioStudioTakeSource, AudioStudioTakeState } from "../shared/audioStudioTypes";
export { AUDIO_STUDIO_TAKE_SOURCES, AUDIO_STUDIO_TAKE_STATES } from "../shared/audioStudioTypes";

const MAX_TAKE_TITLE_LENGTH = 120;
const MAX_TAKE_DETAIL_LENGTH = 500;

export type AudioStudioReadingLine = {
  id: string;
  label: string;
  text: string;
  target: string;
};

export type AudioStudioTakeDraft = {
  id: string;
  source: AudioStudioTakeSource;
  state: AudioStudioTakeState;
  title: string;
  detail: string;
  file_name?: string;
  size_bytes?: number;
  reading_line_id?: string;
};

export const AUDIO_STUDIO_READING_LINES: AudioStudioReadingLine[] = [
  {
    id: "id-neutral-01",
    label: "Neutral Indonesian",
    text: "Hari ini saya akan membaca kalimat ini dengan jelas, tenang, dan stabil.",
    target: "8-12 seconds",
  },
  {
    id: "en-neutral-01",
    label: "Neutral English",
    text: "Today I will read this sentence clearly with a calm and steady voice.",
    target: "8-12 seconds",
  },
  {
    id: "id-expressive-01",
    label: "Expressive Indonesian",
    text: "Tolong dengarkan instruksi ini baik-baik sebelum kita melanjutkan ke bagian berikutnya.",
    target: "10-14 seconds",
  },
  {
    id: "en-numbers-01",
    label: "Numbers and dates",
    text: "The meeting starts at 9:30 AM on June 18, 2026, and ends before lunch.",
    target: "9-13 seconds",
  },
];

function normalizeDisplayText(value: string, fallback: string): string {
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : fallback;
}

function clipText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function makeTakeId(prefix: string, suffix?: string): string {
  const randomPart = Math.random().toString(16).slice(2);
  const suffixPart = suffix ? `-${suffix}` : "";
  return `${prefix}-${Date.now()}-${randomPart}${suffixPart}`;
}

export function createImportedTake(file: File): AudioStudioTakeDraft {
  const fileName = normalizeDisplayText(file.name, "Imported audio");
  return {
    id: makeTakeId("import"),
    source: "import",
    state: "staged",
    title: clipText(fileName, MAX_TAKE_TITLE_LENGTH),
    detail: clipText(`${Math.round(file.size / 1024)} KB staged for later local review.`, MAX_TAKE_DETAIL_LENGTH),
    file_name: clipText(fileName, MAX_TAKE_TITLE_LENGTH),
    size_bytes: file.size,
  };
}

export function createGuidedReadingTake(line: AudioStudioReadingLine): AudioStudioTakeDraft {
  return {
    id: makeTakeId("guided", line.id),
    source: "guided_reading",
    state: "draft",
    title: clipText(normalizeDisplayText(line.label, "Guided reading"), MAX_TAKE_TITLE_LENGTH),
    detail: clipText(normalizeDisplayText(line.text, "Guided reading line"), MAX_TAKE_DETAIL_LENGTH),
    reading_line_id: line.id,
  };
}

export function stateLabel(state: AudioStudioTakeState): string {
  return state.replaceAll("_", " ");
}
