import "./audioStudioThemeEntry";
import { bindAudioStudioAdvancedUi } from "./app/active-launcher/audioStudioAdvancedBinding";
import { bindAudioStudioUi } from "./app/active-launcher/audioStudioBinding";

function tryBindAudioStudio(): boolean {
  bindAudioStudioUi();
  bindAudioStudioAdvancedUi();
  return Boolean(document.querySelector('[data-audio-studio-tab="true"]'));
}

if (!tryBindAudioStudio()) {
  const timer = window.setInterval(() => {
    if (tryBindAudioStudio()) window.clearInterval(timer);
  }, 200);

  window.setTimeout(() => window.clearInterval(timer), 10_000);
}


