export type AudioStudioTakeSource = "import" | "guided_reading";
export type AudioStudioTakeState = "draft" | "staged" | "accepted" | "needs_retry" | "blocked";

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

export const AUDIO_STUDIO_TAKE_STATES: AudioStudioTakeState[] = [
  "draft",
  "staged",
  "accepted",
  "needs_retry",
  "blocked",
];

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

export function createImportedTake(file: File): AudioStudioTakeDraft {
  return {
    id: `import-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source: "import",
    state: "staged",
    title: file.name || "Imported audio",
    detail: `${Math.round(file.size / 1024)} KB staged for later local review.`,
    file_name: file.name,
    size_bytes: file.size,
  };
}

export function createGuidedReadingTake(line: AudioStudioReadingLine): AudioStudioTakeDraft {
  return {
    id: `guided-${Date.now()}-${line.id}`,
    source: "guided_reading",
    state: "draft",
    title: line.label,
    detail: line.text,
    reading_line_id: line.id,
  };
}

export function stateLabel(state: AudioStudioTakeState): string {
  return state.replaceAll("_", " ");
}
