export const audioStudioBindingStatus = "ready";

export function bindAudioStudioUi() {
  return unbindAudioStudioUi;
}

export function unbindAudioStudioUi() {
  document.body.dataset.audioStudioBindingStatus = audioStudioBindingStatus;
}
