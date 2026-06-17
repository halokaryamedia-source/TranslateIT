import { bindAudioStudioUi } from "./app/launcher/audioStudioBinding";

function tryBindAudioStudio(): boolean {
  bindAudioStudioUi();
  return Boolean(document.querySelector('[data-audio-studio-tab="true"]'));
}

if (!tryBindAudioStudio()) {
  const timer = window.setInterval(() => {
    if (tryBindAudioStudio()) window.clearInterval(timer);
  }, 200);

  window.setTimeout(() => window.clearInterval(timer), 10_000);
}
