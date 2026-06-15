import { icon } from "../shared/icons";
import type { RuntimeSettings } from "../shared/types";

function barWidth(value: string): string {
  return /^\d+%$/.test(value) ? value : "0%";
}

function progressPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function generalSettingsView(settings: RuntimeSettings, realtimeStatus: string | null, gpuStatus: string | null): string {
  return `<section class="settings-page-title"><h2>General</h2><p>Basic launcher and local runtime preferences.</p></section><article class="audio-card-v22"><div class="audio-grid-v22"><section class="audio-field-group"><h3>Runtime Profile</h3><button class="select-field-v22" type="button"><span>${settings.runtime_profile}</span>${icon("chevron")}</button></section><section class="audio-field-group"><h3>Language Focus</h3><button class="select-field-v22" type="button"><span>${settings.language_focus_mode}</span>${icon("chevron")}</button></section><section class="audio-field-group"><h3>Realtime Status</h3><button class="select-field-v22" type="button"><span>${realtimeStatus ?? "Checking"}</span>${icon("pulse")}</button></section><section class="audio-field-group"><h3>GPU Status</h3><button class="select-field-v22" type="button"><span>${gpuStatus ?? "Checking"}</span>${icon("monitor")}</button></section></div><button id="saveSettingsButton" class="mic-test-button-v22" type="button">Save Settings</button><button id="resetSettingsButton" class="mic-test-button-v22" type="button" style="margin-left:12px;">Save Default</button></article><section class="settings-page-title secondary"><h2>Advanced General Setting</h2><p>Reserved for future launcher preferences.</p></section><article class="advanced-empty-v22"></article>`;
}

export function audioSettingsView(settings: RuntimeSettings): string {
  const voiceEnabled = settings.audio.auto_play_out_voice;
  return `<section class="settings-page-title"><h2>Audio</h2><p>Configure microphone input, voice output, and local capture checks.</p></section><article class="audio-card-v22"><div class="audio-grid-v22"><section class="audio-field-group"><h3>Input Device</h3><button id="checkAudioInputButton" class="select-field-v22" type="button"><span id="audioInputLabel">Default microphone</span>${icon("chevron")}</button></section><section class="audio-field-group"><h3>Input Sensitivity</h3><button id="audioSensitivityButton" class="select-field-v22" type="button"><span>${settings.audio.input_sensitivity}</span>${icon("chevron")}</button></section><section class="audio-field-group"><h3>Voice Output</h3><button id="audioVoiceToggleButton" class="select-field-v22" type="button"><span>${voiceEnabled ? "Enabled" : "Disabled"}</span>${icon("speaker")}</button></section><section class="mic-test-row-v22"><button id="micTestButton" class="mic-test-button-v22" type="button">Test Mic</button><div class="meter-v22"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></section></div></article><section class="settings-page-title secondary"><h2>Advanced Audio Setting</h2><p>Reserved for future audio device options.</p></section><article class="advanced-empty-v22"></article>`;
}

export function translateSettingsView(settings: RuntimeSettings, sourceLabel: string, targetLabel: string): string {
  const realtimeActive = settings.runtime_profile !== "Quality";
  const voiceEnabled = settings.audio.auto_play_out_voice;
  return `<section class="settings-page-title"><h2>Translate</h2><p>Configure language direction, translation speed, and output behavior.</p></section>

    <article class="audio-card-v22" style="min-height:190px;margin-top:54px;padding:48px 74px;">
      <div style="display:grid;grid-template-columns:minmax(0,500px) 72px minmax(0,500px);align-items:end;column-gap:50px;">
        <section class="audio-field-group"><h3>Source Language</h3><button class="select-field-v22" type="button" style="grid-template-columns:minmax(0,1fr) 20px;"><span>${sourceLabel}</span>${icon("chevron")}</button></section>
        <button id="swapLanguageButton" type="button" class="select-field-v22" style="width:72px;height:62px;grid-template-columns:1fr;place-items:center;padding:0;border-radius:18px;" aria-label="Swap languages">${icon("translate")}</button>
        <section class="audio-field-group"><h3>Target Language</h3><button class="select-field-v22" type="button" style="grid-template-columns:minmax(0,1fr) 20px;"><span>${targetLabel}</span>${icon("chevron")}</button></section>
      </div>
      <button id="saveTranslateButton" type="button" style="display:none;">Save</button>
    </article>

    <section class="settings-page-title secondary" style="margin-top:84px;"><h2>Realtime</h2><p>Choose how TranslateIT balances speed and translation quality.</p></section>
    <article class="voice-card-v22" style="min-height:166px;padding:50px 74px;">
      <div class="voice-grid-v22">
        <div id="realtimeModeButton" class="radio-row-v22 ${realtimeActive ? "active" : ""}" role="button" tabindex="0" style="margin-top:0;"><span></span><strong>Fast</strong><em>Prioritize low latency for live voice translation.</em></div>
        <div id="qualityModeButton" class="radio-row-v22 ${!realtimeActive ? "active" : ""}" role="button" tabindex="0" style="margin-top:0;"><span></span><strong>Quality</strong><em>Prefer better translation quality when response time is less critical.</em></div>
      </div>
    </article>

    <section class="settings-page-title secondary" style="margin-top:84px;"><h2>Translate Output</h2><p>Choose which output should appear after translation completes.</p></section>
    <article class="voice-card-v22" style="min-height:176px;padding:48px 74px;">
      <div class="voice-grid-v22">
        <section style="position:relative;display:grid;grid-template-columns:24px minmax(0,1fr) 72px;column-gap:22px;align-items:start;">
          ${icon("logs")}
          <div><h3>Transcript</h3><p>Show translated text in the conversation.</p></div>
          <span style="display:block;width:72px;height:36px;border-radius:18px;background:#d6dbe3;position:relative;margin-top:4px;"><i style="position:absolute;right:4px;top:4px;width:28px;height:28px;border-radius:50%;background:#11141a;"></i></span>
        </section>
        <section style="position:relative;display:grid;grid-template-columns:24px minmax(0,1fr) 72px;column-gap:22px;align-items:start;">
          ${icon("speaker")}
          <div><h3>Voice</h3><p>Play translated English voice automatically.</p></div>
          <span style="display:block;width:72px;height:36px;border-radius:18px;background:${voiceEnabled ? "#d6dbe3" : "#4b4f5d"};position:relative;margin-top:4px;"><i style="position:absolute;${voiceEnabled ? "right" : "left"}:4px;top:4px;width:28px;height:28px;border-radius:50%;background:#11141a;"></i></span>
        </section>
      </div>
    </article>

    <section class="settings-page-title secondary"><h2>Advanced Translate Setting</h2></section><article class="advanced-empty-v22"></article>`;
}

export function developerSettingsView(args: {
  progress: number;
  cpu: string;
  ram: string;
  gpu: string;
  gpuStatus: string;
  logRows: string;
  note: string;
  logsExpanded: boolean;
  engineGood: boolean;
}): string {
  const progress = progressPercent(args.progress);
  const progressMarker = Math.max(4, Math.min(96, progress));
  const cpuWidth = barWidth(args.cpu);
  const gpuWidth = barWidth(args.gpu);
  const ramWidth = barWidth(args.ram);
  const engineStatus = args.engineGood ? "Good" : "Check";
  const logHeight = args.logsExpanded ? 320 : 176;
  const logOverflow = args.logsExpanded ? "auto" : "hidden";
  const styledLogRows = args.logRows
    .replaceAll("<p>", '<p style="margin:0;color:var(--text);font-size:12.5px;font-weight:750;">')
    .replaceAll("<strong>", '<strong style="display:inline-block;width:64px;color:var(--muted);font-weight:850;">');

  return `<section class="settings-page-title"><h2>Developer</h2><p>Simple tools for monitoring runtime health and fixing common issues.</p></section>

    <section class="settings-page-title secondary" style="margin-top:70px;"><h2>Monitoring</h2><p>Melacak usage hardware dan health engine.</p></section>
    <article class="audio-card-v22" style="min-height:330px;margin-top:46px;padding:64px 74px 44px;">
      <div style="display:grid;grid-template-columns:540px 540px;column-gap:92px;align-items:start;">
        <section>
          <div style="display:grid;grid-template-columns:22px minmax(0,1fr);column-gap:22px;align-items:center;">${icon("monitor")}<h3 style="margin:0;color:var(--text);font-size:18px;font-weight:850;">Hardware Usage</h3></div>
          <p style="margin:14px 0 0 44px;color:var(--muted);font-size:13px;">Track CPU, GPU, RAM, and local worker resource usage.</p>
          <div style="display:grid;gap:38px;margin-top:45px;">
            <div style="display:grid;grid-template-columns:64px 1fr 48px;align-items:center;gap:20px;"><strong style="font-size:14px;">CPU</strong><span style="height:5px;border-radius:999px;background:linear-gradient(90deg,#d6dbe3 ${cpuWidth},#4b4f5d ${cpuWidth});"></span><em style="color:var(--muted);font-size:13px;font-style:normal;font-weight:850;">${args.cpu}</em></div>
            <div style="display:grid;grid-template-columns:64px 1fr 48px;align-items:center;gap:20px;"><strong style="font-size:14px;">GPU</strong><span style="height:5px;border-radius:999px;background:linear-gradient(90deg,#d6dbe3 ${gpuWidth},#4b4f5d ${gpuWidth});"></span><em style="color:var(--muted);font-size:13px;font-style:normal;font-weight:850;">${args.gpu}</em></div>
            <div style="display:grid;grid-template-columns:64px 1fr 48px;align-items:center;gap:20px;"><strong style="font-size:14px;">RAM</strong><span style="height:5px;border-radius:999px;background:linear-gradient(90deg,#d6dbe3 ${ramWidth},#4b4f5d ${ramWidth});"></span><em style="color:var(--muted);font-size:13px;font-style:normal;font-weight:850;">${args.ram}</em></div>
          </div>
        </section>

        <section>
          <div style="display:grid;grid-template-columns:22px minmax(0,1fr);column-gap:22px;align-items:center;">${icon("pulse")}<h3 style="margin:0;color:var(--text);font-size:18px;font-weight:850;">Health Engine</h3></div>
          <p style="margin:14px 0 0 44px;color:var(--muted);font-size:13px;">Simple status for Launcher and Engine.</p>
          <div style="display:grid;gap:18px;margin-top:35px;">
            <section style="display:grid;grid-template-columns:24px minmax(0,1fr) 88px;align-items:center;column-gap:20px;height:62px;border:1px solid var(--border-strong);border-radius:16px;background:#10141b;padding:0 24px;">${icon("monitor")}<div><strong style="display:block;font-size:15.5px;">Launcher</strong><p style="margin:7px 0 0;color:var(--muted);font-size:11.5px;">Desktop shell and UI route</p></div><span style="display:grid;place-items:center;height:32px;border:1px solid #8d949f;border-radius:12px;background:#151922;font-size:12px;font-weight:900;">Good</span></section>
            <section style="display:grid;grid-template-columns:24px minmax(0,1fr) 88px;align-items:center;column-gap:20px;height:62px;border:1px solid var(--border-strong);border-radius:16px;background:#10141b;padding:0 24px;">${icon("pulse")}<div><strong style="display:block;font-size:15.5px;">Engine</strong><p style="margin:7px 0 0;color:var(--muted);font-size:11.5px;">Translation, transcript, and worker state</p></div><span style="display:grid;place-items:center;height:32px;border:1px solid #8d949f;border-radius:12px;background:#151922;font-size:12px;font-weight:900;">${engineStatus}</span></section>
          </div>
        </section>
      </div>
    </article>

    <section class="settings-page-title secondary" style="margin-top:84px;"><h2>Diagnostic</h2><p>Run checking, show current progress, and review diagnostic logs in one table.</p></section>
    <article class="audio-card-v22" style="min-height:622px;margin-top:46px;padding:52px 74px;">
      <section style="position:relative;min-height:86px;">
        <div style="display:grid;grid-template-columns:22px minmax(0,1fr);column-gap:22px;align-items:start;">${icon("check")}<div><h3 style="margin:0;color:var(--text);font-size:20px;font-weight:850;">Run Diagnostic</h3><p style="margin:15px 0 0;color:var(--muted);font-size:13px;">Check launcher, audio device, translation engine, transcript, and local worker.</p></div></div>
        <button id="runDiagnosticButton" type="button" style="position:absolute;right:20px;top:2px;width:206px;height:52px;border:1px solid #8d949f;border-radius:15px;color:var(--text);background:#151922;font-size:14px;font-weight:900;">Run Checking</button>
      </section>

      <section style="height:112px;margin-top:26px;border:1px solid var(--border-strong);border-radius:18px;background:#10141b;padding:28px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;"><strong style="font-size:14px;">Checking translation engine</strong><span style="display:grid;place-items:center;width:82px;height:30px;border:1px solid var(--border-strong);border-radius:11px;background:#151922;color:var(--muted);font-size:12px;font-weight:900;">Running</span></div>
        <p style="margin:18px 0 0;color:var(--muted);font-size:12.5px;font-weight:750;">Phase: Transcript worker</p>
        <div style="position:relative;margin-top:20px;height:30px;">
          <span style="position:absolute;left:0;right:0;top:13px;height:6px;border-radius:999px;background:#4b4f5d;"></span>
          <span style="position:absolute;left:0;top:13px;width:${progress}%;height:6px;border-radius:999px;background:#d6dbe3;"></span>
          <span style="position:absolute;left:calc(${progressMarker}% - 5px);top:8px;width:11px;height:11px;border-radius:50%;background:#d6dbe3;"></span>
          <span style="position:absolute;left:calc(${progressMarker}% - 28px);top:-27px;display:grid;place-items:center;width:56px;height:24px;border:1px solid #4b5563;border-radius:8px;background:#11141a;color:var(--text);font-size:11.5px;font-weight:900;">${progress}%</span>
        </div>
      </section>

      <div style="height:1px;margin:38px 0;background:var(--border);"></div>

      <section style="position:relative;min-height:86px;"><div style="display:grid;grid-template-columns:22px minmax(0,1fr);column-gap:22px;align-items:start;">${icon("logs")}<div><h3 style="margin:0;color:var(--text);font-size:20px;font-weight:850;">Log Diagnostic</h3><p style="margin:15px 0 0;color:var(--muted);font-size:13px;">Showing the latest 3 diagnostic logs.</p></div></div></section>

      <section style="height:${logHeight}px;margin-top:0;border:1px solid var(--border-strong);border-radius:18px;background:#080b11;overflow:${logOverflow};">
        <header style="display:grid;grid-template-columns:78px minmax(0,1fr) 206px;align-items:center;height:48px;border-bottom:1px solid var(--border-strong);background:#0d1017;padding:0 20px 0 26px;position:sticky;top:0;z-index:1;">
          <span style="display:flex;gap:10px;"><i style="width:10px;height:10px;border-radius:50%;background:#858e9c;"></i><i style="width:10px;height:10px;border-radius:50%;background:#858e9c;"></i><i style="width:10px;height:10px;border-radius:50%;background:#858e9c;"></i></span>
          <strong style="color:var(--muted);font-size:12px;">developer-log/latest</strong>
          <button id="seeAllLogsButton" type="button" style="display:grid;grid-template-columns:22px 1fr;align-items:center;width:206px;height:32px;border:1px solid #8d949f;border-radius:12px;padding:0 18px;color:var(--text);background:#151922;font-size:12px;font-weight:900;">${icon("maximize")}<span>${args.logsExpanded ? "Show Less" : "See All Logs"}</span></button>
        </header>
        <div class="developer-log-body" style="display:grid;gap:20px;padding:32px 26px;">${styledLogRows}</div>
      </section>
    </article>

    <section class="settings-page-title secondary"><h2>Advanced Developer Setting</h2><p>Reserved for future developer options.</p></section><article class="advanced-empty-v22"></article>`;
}
