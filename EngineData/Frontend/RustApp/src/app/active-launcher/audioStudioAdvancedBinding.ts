let bound = false;

export function bindAudioStudioAdvancedUi(): () => void {
  bound = true;
  return unbindAudioStudioAdvancedUi;
}

export function unbindAudioStudioAdvancedUi(): void {
  bound = false;
}

export function isAudioStudioAdvancedUiBound(): boolean {
  return bound;
}
