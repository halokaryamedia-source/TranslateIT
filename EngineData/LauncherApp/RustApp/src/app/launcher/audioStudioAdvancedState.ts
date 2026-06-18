export type AudioStudioAdvancedMode = "starter_profile" | "production_profile" | "broadcast_profile";
export type AudioStudioProviderState = "not_connected" | "placeholder_only" | "local_provider_ready" | "external_provider_ready" | "blocked_needs_evidence";

export type AudioStudioAdvancedControl = {
  id: string;
  label: string;
  description: string;
  default_value: number;
  min: number;
  max: number;
};

export type AudioStudioQualityDimension = {
  id: string;
  label: string;
  target: string;
  local_pc_required: boolean;
};

export const AUDIO_STUDIO_ADVANCED_MODE_IDS: AudioStudioAdvancedMode[] = [
  "starter_profile",
  "production_profile",
  "broadcast_profile",
];

export const AUDIO_STUDIO_DEFAULT_ADVANCED_MODE: AudioStudioAdvancedMode = "production_profile";

export const AUDIO_STUDIO_ADVANCED_MODES: Record<AudioStudioAdvancedMode, { label: string; sampleTarget: string; useCase: string }> = {
  starter_profile: {
    label: "Starter Profile",
    sampleTarget: "1-5 minutes clean audio",
    useCase: "Rapid draft, early preview, and UX review.",
  },
  production_profile: {
    label: "Production Profile",
    sampleTarget: "30+ minutes clean audio",
    useCase: "High quality narration, dubbing, and content production.",
  },
  broadcast_profile: {
    label: "Broadcast Profile",
    sampleTarget: "Up to 3 hours curated audio",
    useCase: "Long-form, commercial, and premium output pipeline.",
  },
};

export const AUDIO_STUDIO_ADVANCED_CONTROLS: AudioStudioAdvancedControl[] = [
  { id: "pace", label: "Pace", description: "Controls how fast or slow the generated speech should feel.", default_value: 50, min: 0, max: 100 },
  { id: "energy", label: "Energy", description: "Controls intensity, projection, and performance weight.", default_value: 50, min: 0, max: 100 },
  { id: "clarity", label: "Clarity", description: "Prioritizes pronunciation stability and clean articulation.", default_value: 70, min: 0, max: 100 },
  { id: "emotion", label: "Emotion", description: "Controls how expressive the delivery should be.", default_value: 45, min: 0, max: 100 },
  { id: "style_strength", label: "Style Strength", description: "Controls how strongly the selected profile style is applied.", default_value: 50, min: 0, max: 100 },
];

export const AUDIO_STUDIO_QUALITY_DIMENSIONS: AudioStudioQualityDimension[] = [
  { id: "duration_coverage", label: "Duration Coverage", target: "Enough accepted minutes for selected mode.", local_pc_required: false },
  { id: "noise_floor", label: "Noise Floor", target: "Low room noise and stable input level.", local_pc_required: true },
  { id: "clipping", label: "Clipping", target: "No overloaded peaks in accepted takes.", local_pc_required: true },
  { id: "speaker_consistency", label: "Speaker Consistency", target: "Single authorized speaker per profile.", local_pc_required: true },
  { id: "language_coverage", label: "Language Coverage", target: "Indonesian and English prompt coverage.", local_pc_required: false },
  { id: "emotion_coverage", label: "Emotion Coverage", target: "Neutral, friendly, serious, and conversational samples.", local_pc_required: false },
];
