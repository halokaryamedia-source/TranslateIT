import { icon } from "../shared/icons";
import type { RuntimeSettings } from "../shared/types";

function barWidth(value: string): string {
  return /^\d+%$/.test(value) ? value : "0%";
}

function progressPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeMarker(value: number): number {
  return Math.max(4, Math.min(96, value));
}

function panelStart(title: string, description: string, height: number): string {
  return `<div style="position:relative;width:min(1320px,calc(100vw - 640px));height:${height}px;"><h2 style="position:absolute;left:0;top:0;margin:0;color:var(--text);font-size:38px;font-weight:850;letter-spacing:-.035em;">${title}</h2><p style="position:absolute;left:0;top:56px;margin:0;color:var(--muted);font-size:15px;">${description}</p>`;
}

function fieldButton(text: string, rightIcon = "chevron"): string {
  return `<span>${text}</span>${icon(rightIcon as never)}`;
}

export function generalSettingsView(settings: RuntimeSettings, realtimeStatus: string | null, gpuStatus: string | null): string {
  return `<section class="settings-page-title"><h2>General</h2><p>Basic launcher and local runtime preferences.</p></section><article class="audio-card-v22"><div class="audio-grid-v22"><section class="audio-field-group"><h3>Runtime Profile</h3><button class="select-field-v22" type="button"><span>${settings.runtime_profile}</span>${icon("chevron")}</button></section><section class="audio-field-group"><h3>Language Focus</h3><button class="select-field-v22" type="button"><span>${settings.language_focus_mode}</span>${icon("chevron")}</button></section><section class="audio-field-group"><h3>Realtime Status</h3><button class="select-field-v22" type="button"><span>${realtimeStatus ?? "Checking"}</span>${icon("pulse")}</button></section><section class="audio-field-group"><h3>GPU Status</h3><button class="select-field-v22" type="button"><span>${gpuStatus ?? "Checking"}</span>${icon("monitor")}</button></section></div><button id="saveSettingsButton" class="mic-test-button-v22" type="button">Save Settings</button><button id="resetSettingsButton" class="mic-test-button-v22" type="button" style="margin-left:12px;">Save Default</button></article><section class="settings-page-title secondary"><h2>Advanced General Setting</h2><p>Reserved for future launcher preferences.</p></section><article class="advanced-empty-v22"></article>`;
}

export function audioSettingsView(settings: RuntimeSettings): string {
  const voiceEnabled = settings.audio.auto_play_out_voice;
  const realtimeActive = settings.runtime_profile !== "Quality";
  return `${panelStart("Audio", "Manage microphone input, speaker output, volume, and voice behavior.", 1360)}
    <article class="audio-card-v22" style="position:absolute;left:0;top:94px;width:1320px;height:450px;min-height:0;margin:0;padding:40px 74px;">
      <section style="position:absolute;left:74px;top:40px;width:540px;"><h3 style="margin:0;color:var(--text);font-size:16.5px;font-weight:850;">Microphone</h3><button id="checkAudioInputButton" class="select-field-v22" type="button" style="margin-top:26px;width:540px;grid-template-columns:24px minmax(0,1fr) 20px;">${icon("mic")}<span id="audioInputLabel">Default microphone</span>${icon("chevron")}</button></section>
      <section style="position:absolute;left:706px;top:40px;width:540px;"><h3 style="margin:0;color:var(--text);font-size:16.5px;font-weight:850;">Speaker</h3><button id="audioVoiceToggleButton" class="select-field-v22" type="button" style="margin-top:26px;width:540px;grid-template-columns:24px minmax(0,1fr) 20px;">${icon("speaker")}<span>${voiceEnabled ? "TWS (AkLIAM PD6)" : "Speaker disabled"}</span>${icon("chevron")}</button></section>
      <section style="position:absolute;left:74px;top:196px;width:540px;"><h3 style="margin:0;color:var(--text);font-size:16.5px;font-weight:850;">Microphone Volume</h3><div class="range-v22 mic-range" style="margin-top:28px;width:540px;"><span></span><i></i></div></section>
      <section style="position:absolute;left:706px;top:196px;width:540px;"><h3 style="margin:0;color:var(--text);font-size:16.5px;font-weight:850;">Speaker Volume</h3><div class="range-v22 speaker-range" style="margin-top:28px;width:540px;"><span></span><i></i></div></section>
      <button id="micTestButton" class="mic-test-button-v22" type="button" style="position:absolute;left:74px;top:346px;width:176px;height:62px;">Mic Test</button>
      <div class="meter-v22" style="position:absolute;left:298px;top:354px;width:660px;"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    </article>
    <h2 style="position:absolute;left:0;top:632px;margin:0;color:var(--text);font-size:30px;font-weight:850;letter-spacing:-.035em;">Voice</h2><p style="position:absolute;left:0;top:666px;margin:0;color:var(--muted);font-size:14px;">Configure voice input behavior and input processing profile.</p>
    <article class="voice-card-v22" style="position:absolute;left:0;top:712px;width:1320px;height:330px;min-height:0;margin:0;padding:54px 74px;">
      <section style="position:absolute;left:74px;top:54px;width:540px;"><h3 style="margin:0;color:var(--text);font-size:17px;font-weight:850;">Voice Profile</h3><p style="margin:12px 0 0;color:var(--muted);font-size:13px;">Choose the microphone processing profile.</p><label class="radio-row-v22 active" style="margin-top:40px;"><span></span><strong>Normal</strong><em>Default microphone input without extra noise processing.</em></label><label class="radio-row-v22" style="margin-top:30px;"><span></span><strong>Noise</strong><em>Reduce background noise and prioritize speech clarity.</em></label></section>
      <section style="position:absolute;left:706px;top:54px;width:540px;"><h3 style="margin:0;color:var(--text);font-size:17px;font-weight:850;">Voice Mode</h3><p style="margin:12px 0 0;color:var(--muted);font-size:13px;">Choose how TranslateIT listens to voice input.</p><button id="audioSensitivityButton" type="button" class="radio-row-v22 ${realtimeActive ? "active" : ""}" style="width:100%;margin-top:40px;text-align:left;background:transparent;"><span></span><strong>Always On</strong><em>Voice input stays ready while the app is active.</em></button><label class="radio-row-v22" style="margin-top:30px;"><span></span><strong>Push to Talk</strong><em>Voice input only activates while holding a selected key.</em></label></section>
    </article>
    <h2 style="position:absolute;left:0;top:1128px;margin:0;color:var(--text);font-size:30px;font-weight:850;letter-spacing:-.035em;">Advanced Audio Setting</h2><article class="advanced-empty-v22" style="position:absolute;left:0;top:1178px;width:1320px;height:180px;margin:0;"></article>
  </div>`;
}

export function translateSettingsView(settings: RuntimeSettings, sourceLabel: string, targetLabel: string): string {
  const realtimeActive = settings.runtime_profile !== "Quality";
  const voiceEnabled = settings.audio.auto_play_out_voice;
  return `${panelStart("Translate", "Configure language direction, translation speed, and output behavior.", 1298)}
    <article class="audio-card-v22" style="position:absolute;left:0;top:92px;width:1320px;height:190px;min-height:0;margin:0;padding:0;">
      <section style="position:absolute;left:74px;top:50px;width:500px;"><h3 style="margin:0;color:var(--text);font-size:16.5px;font-weight:850;">Source Language</h3><button class="select-field-v22" type="button" style="margin-top:30px;width:500px;grid-template-columns:minmax(0,1fr) 20px;"><span>${sourceLabel}</span>${icon("chevron")}</button></section>
      <button id="swapLanguageButton" type="button" style="position:absolute;left:624px;top:80px;width:72px;height:62px;border:1px solid var(--border-strong);border-radius:18px;background:var(--surface-2);color:var(--text);display:grid;place-items:center;">${icon("swap")}</button>
      <section style="position:absolute;left:746px;top:50px;width:500px;"><h3 style="margin:0;color:var(--text);font-size:16.5px;font-weight:850;">Target Language</h3><button class="select-field-v22" type="button" style="margin-top:30px;width:500px;grid-template-columns:minmax(0,1fr) 20px;"><span>${targetLabel}</span>${icon("chevron")}</button></section>
      <button id="saveTranslateButton" type="button" style="display:none;">Save</button>
    </article>
    <h2 style="position:absolute;left:0;top:376px;margin:0;color:var(--text);font-size:30px;font-weight:850;letter-spacing:-.035em;">Realtime</h2><p style="position:absolute;left:0;top:410px;margin:0;color:var(--muted);font-size:14px;">Choose how TranslateIT balances speed and translation quality.</p>
    <article class="voice-card-v22" style="position:absolute;left:0;top:456px;width:1320px;height:166px;min-height:0;margin:0;padding:56px 74px;">
      <div class="voice-grid-v22">
        <div id="realtimeModeButton" class="radio-row-v22 ${realtimeActive ? "active" : ""}" role="button" tabindex="0" style="margin-top:0;"><span></span><strong>Fast</strong><em>Prioritize low latency for live voice translation.</em></div>
        <div id="qualityModeButton" class="radio-row-v22 ${!realtimeActive ? "active" : ""}" role="button" tabindex="0" style="margin-top:0;"><span></span><strong>Quality</strong><em>Prefer better translation quality when response time is less critical.</em></div>
      </div>
    </article>
    <h2 style="position:absolute;left:0;top:714px;margin:0;color:var(--text);font-size:30px;font-weight:850;letter-spacing:-.035em;">Translate Output</h2><p style="position:absolute;left:0;top:748px;margin:0;color:var(--muted);font-size:14px;">Choose which output should appear after translation completes.</p>
    <article class="voice-card-v22" style="position:absolute;left:0;top:794px;width:1320px;height:176px;min-height:0;margin:0;padding:52px 74px;">
      <section style="position:absolute;left:74px;top:52px;width:540px;"><span style="position:absolute;left:0;top:22px;">${icon("fileText")}</span><h3 style="position:absolute;left:46px;top:2px;margin:0;color:var(--text);font-size:17px;font-weight:850;">Transcript</h3><p style="position:absolute;left:46px;top:42px;margin:0;color:var(--muted);font-size:13px;">Show translated text in the conversation.</p><span style="position:absolute;left:382px;top:16px;width:72px;height:36px;border-radius:18px;background:#d6dbe3;"><i style="position:absolute;right:4px;top:4px;width:28px;height:28px;border-radius:50%;background:#11141a;"></i></span></section>
      <section style="position:absolute;left:706px;top:52px;width:540px;"><span style="position:absolute;left:0;top:22px;">${icon("speaker")}</span><h3 style="position:absolute;left:46px;top:2px;margin:0;color:var(--text);font-size:17px;font-weight:850;">Voice</h3><p style="position:absolute;left:46px;top:42px;margin:0;color:var(--muted);font-size:13px;">Play translated English voice automatically.</p><span style="position:absolute;left:382px;top:16px;width:72px;height:36px;border-radius:18px;background:${voiceEnabled ? "#d6dbe3" : "#4b4f5d"};"><i style="position:absolute;${voiceEnabled ? "right" : "left"}:4px;top:4px;width:28px;height:28px;border-radius:50%;background:#11141a;"></i></span></section>
    </article>
    <h2 style="position:absolute;left:0;top:1078px;margin:0;color:var(--text);font-size:30px;font-weight:850;letter-spacing:-.035em;">Advanced Translate Setting</h2><article class="advanced-empty-v22" style="position:absolute;left:0;top:1128px;width:1320px;height:170px;margin:0;"></article>
  </div>`;
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
  const marker = safeMarker(progress);
  const cpuWidth = barWidth(args.cpu);
  const gpuWidth = barWidth(args.gpu);
  const ramWidth = barWidth(args.ram);
  const engineStatus = args.engineGood ? "Good" : "Check";
  const logHeight = args.logsExpanded ? 320 : 176;
  const logOverflow = args.logsExpanded ? "auto" : "hidden";
  const styledLogRows = args.logRows.replaceAll("<p>", '<p style="margin:0;color:var(--text);font-size:12.5px;font-weight:750;">').replaceAll("<strong>", '<strong style="display:inline-block;width:64px;color:var(--muted);font-weight:850;">');
  return `${panelStart("Developer", "Simple tools for monitoring runtime health and fixing common issues.", 1700)}
    <h2 style="position:absolute;left:0;top:132px;margin:0;color:var(--text);font-size:30px;font-weight:850;letter-spacing:-.035em;">Monitoring</h2><p style="position:absolute;left:0;top:166px;margin:0;color:var(--muted);font-size:14px;">Melacak usage hardware dan health engine.</p>
    <article class="audio-card-v22" style="position:absolute;left:0;top:212px;width:1320px;height:330px;min-height:0;margin:0;padding:64px 74px 44px;">
      <section style="position:absolute;left:74px;top:64px;width:540px;"><div style="display:grid;grid-template-columns:22px minmax(0,1fr);column-gap:22px;align-items:center;">${icon("monitor")}<h3 style="margin:0;color:var(--text);font-size:18px;font-weight:850;">Hardware Usage</h3></div><p style="margin:14px 0 0 44px;color:var(--muted);font-size:13px;">Track CPU, GPU, RAM, and local worker resource usage.</p><div style="display:grid;gap:38px;margin-top:45px;"><div style="display:grid;grid-template-columns:64px 1fr 48px;align-items:center;gap:20px;"><strong style="font-size:14px;">CPU</strong><span style="height:5px;border-radius:999px;background:linear-gradient(90deg,#d6dbe3 ${cpuWidth},#4b4f5d ${cpuWidth});"></span><em style="color:var(--muted);font-size:13px;font-style:normal;font-weight:850;">${args.cpu}</em></div><div style="display:grid;grid-template-columns:64px 1fr 48px;align-items:center;gap:20px;"><strong style="font-size:14px;">GPU</strong><span style="height:5px;border-radius:999px;background:linear-gradient(90deg,#d6dbe3 ${gpuWidth},#4b4f5d ${gpuWidth});"></span><em style="color:var(--muted);font-size:13px;font-style:normal;font-weight:850;">${args.gpu}</em></div><div style="display:grid;grid-template-columns:64px 1fr 48px;align-items:center;gap:20px;"><strong style="font-size:14px;">RAM</strong><span style="height:5px;border-radius:999px;background:linear-gradient(90deg,#d6dbe3 ${ramWidth},#4b4f5d ${ramWidth});"></span><em style="color:var(--muted);font-size:13px;font-style:normal;font-weight:850;">${args.ram}</em></div></div></section>
      <section style="position:absolute;left:706px;top:64px;width:540px;"><div style="display:grid;grid-template-columns:22px minmax(0,1fr);column-gap:22px;align-items:center;">${icon("pulse")}<h3 style="margin:0;color:var(--text);font-size:18px;font-weight:850;">Health Engine</h3></div><p style="margin:14px 0 0 44px;color:var(--muted);font-size:13px;">Simple status for Launcher and Engine.</p><div style="display:grid;gap:18px;margin-top:35px;"><section style="display:grid;grid-template-columns:24px minmax(0,1fr) 88px;align-items:center;column-gap:20px;height:62px;border:1px solid var(--border-strong);border-radius:16px;background:#10141b;padding:0 24px;">${icon("monitor")}<div><strong style="display:block;font-size:15.5px;">Launcher</strong><p style="margin:7px 0 0;color:var(--muted);font-size:11.5px;">Desktop shell and UI route</p></div><span style="display:grid;place-items:center;height:32px;border:1px solid #8d949f;border-radius:12px;background:#151922;font-size:12px;font-weight:900;">Good</span></section><section style="display:grid;grid-template-columns:24px minmax(0,1fr) 88px;align-items:center;column-gap:20px;height:62px;border:1px solid var(--border-strong);border-radius:16px;background:#10141b;padding:0 24px;">${icon("pulse")}<div><strong style="display:block;font-size:15.5px;">Engine</strong><p style="margin:7px 0 0;color:var(--muted);font-size:11.5px;">Translation, transcript, and worker state</p></div><span style="display:grid;place-items:center;height:32px;border:1px solid #8d949f;border-radius:12px;background:#151922;font-size:12px;font-weight:900;">${engineStatus}</span></section></div></section>
    </article>
    <h2 style="position:absolute;left:0;top:626px;margin:0;color:var(--text);font-size:30px;font-weight:850;letter-spacing:-.035em;">Diagnostic</h2><p style="position:absolute;left:0;top:660px;margin:0;color:var(--muted);font-size:14px;">Run checking, show current progress, and review diagnostic logs in one table.</p>
    <article class="audio-card-v22" style="position:absolute;left:0;top:706px;width:1320px;height:622px;min-height:0;margin:0;padding:52px 74px;">
      <section style="position:absolute;left:74px;top:52px;width:1172px;height:86px;"><div style="display:grid;grid-template-columns:22px minmax(0,1fr);column-gap:22px;align-items:start;">${icon("check")}<div><h3 style="margin:0;color:var(--text);font-size:20px;font-weight:850;">Run Diagnostic</h3><p style="margin:15px 0 0;color:var(--muted);font-size:13px;">Check launcher, audio device, translation engine, transcript, and local worker.</p></div></div><button id="runDiagnosticButton" type="button" style="position:absolute;right:20px;top:2px;width:206px;height:52px;border:1px solid #8d949f;border-radius:15px;color:var(--text);background:#151922;font-size:14px;font-weight:900;">Run Checking</button></section>
      <section style="position:absolute;left:74px;top:164px;width:1172px;height:112px;border:1px solid var(--border-strong);border-radius:18px;background:#10141b;padding:28px;"><div style="display:flex;align-items:center;justify-content:space-between;gap:24px;"><strong style="font-size:14px;">Checking translation engine</strong><span style="display:grid;place-items:center;width:82px;height:30px;border:1px solid var(--border-strong);border-radius:11px;background:#151922;color:var(--muted);font-size:12px;font-weight:900;">Running</span></div><p style="margin:18px 0 0;color:var(--muted);font-size:12.5px;font-weight:750;">Phase: Transcript worker</p><div style="position:relative;margin-top:20px;height:30px;"><span style="position:absolute;left:0;right:0;top:13px;height:6px;border-radius:999px;background:#4b4f5d;"></span><span style="position:absolute;left:0;top:13px;width:${progress}%;height:6px;border-radius:999px;background:#d6dbe3;"></span><span style="position:absolute;left:calc(${marker}% - 5px);top:8px;width:11px;height:11px;border-radius:50%;background:#d6dbe3;"></span><span style="position:absolute;left:calc(${marker}% - 28px);top:-27px;display:grid;place-items:center;width:56px;height:24px;border:1px solid #4b5563;border-radius:8px;background:#11141a;color:var(--text);font-size:11.5px;font-weight:900;">${progress}%</span></div></section>
      <div style="position:absolute;left:74px;top:310px;width:1172px;height:1px;background:var(--border);"></div>
      <section style="position:absolute;left:74px;top:352px;width:1172px;height:86px;"><div style="display:grid;grid-template-columns:22px minmax(0,1fr);column-gap:22px;align-items:start;">${icon("logs")}<div><h3 style="margin:0;color:var(--text);font-size:20px;font-weight:850;">Log Diagnostic</h3><p style="margin:15px 0 0;color:var(--muted);font-size:13px;">Showing the latest 3 diagnostic logs.</p></div></div></section>
      <section style="position:absolute;left:74px;top:424px;width:1172px;height:${logHeight}px;border:1px solid var(--border-strong);border-radius:18px;background:#080b11;overflow:${logOverflow};"><header style="display:grid;grid-template-columns:78px minmax(0,1fr) 206px;align-items:center;height:48px;border-bottom:1px solid var(--border-strong);background:#0d1017;padding:0 20px 0 26px;position:sticky;top:0;z-index:1;"><span style="display:flex;gap:10px;"><i style="width:10px;height:10px;border-radius:50%;background:#858e9c;"></i><i style="width:10px;height:10px;border-radius:50%;background:#858e9c;"></i><i style="width:10px;height:10px;border-radius:50%;background:#858e9c;"></i></span><strong style="color:var(--muted);font-size:12px;">developer-log/latest</strong><button id="seeAllLogsButton" type="button" style="display:grid;grid-template-columns:22px 1fr;align-items:center;width:206px;height:32px;border:1px solid #8d949f;border-radius:12px;padding:0 18px;color:var(--text);background:#151922;font-size:12px;font-weight:900;">${icon("maximize")}<span>${args.logsExpanded ? "Show Less" : "See All Logs"}</span></button></header><div class="developer-log-body" style="display:grid;gap:20px;padding:32px 26px;">${styledLogRows}</div></section>
    </article>
    <h2 style="position:absolute;left:0;top:1450px;margin:0;color:var(--text);font-size:30px;font-weight:850;letter-spacing:-.035em;">Advanced Developer Setting</h2><p style="position:absolute;left:0;top:1484px;margin:0;color:var(--muted);font-size:14px;">Reserved for future developer options.</p><article class="advanced-empty-v22" style="position:absolute;left:0;top:1530px;width:1320px;height:170px;margin:0;"></article>
  </div>`;
}
