from pathlib import Path

ROOT = Path('EngineData/Frontend/RustApp/src')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'missing patch anchor: {label}')
    if text.count(old) != 1:
        raise SystemExit(f'non-unique patch anchor: {label} ({text.count(old)})')
    return text.replace(old, new, 1)

# App shell: allow First Setup to hand off to VoiceLab without marking setup complete,
# and allow Meeting to open VoiceLab when My Voice is missing.
app_path = ROOT / 'App.svelte'
app = app_path.read_text(encoding='utf-8')
app = replace_once(
    app,
    '''  async function finishFirstSetup(next: RuntimeSettings): Promise<void> {\n    setupSettings = cloneSettings(next);\n    setupRequired = false;\n    await refreshSnapshot("Setup saved.", next);\n    route = "meeting";\n  }\n''',
    '''  async function finishFirstSetup(next: RuntimeSettings): Promise<void> {\n    setupSettings = cloneSettings(next);\n    setupRequired = false;\n    await refreshSnapshot("Setup saved.", next);\n    route = "meeting";\n  }\n\n  async function openVoiceLabFromSetup(next: RuntimeSettings): Promise<void> {\n    setupSettings = cloneSettings(next);\n    setupRequired = false;\n    await refreshSnapshot("Create My Voice before starting Meeting translation.", next);\n    route = "voicelab";\n  }\n''',
    'App openVoiceLabFromSetup',
)
app = replace_once(
    app,
    '  <FirstSetup initialSettings={setupSettings} onComplete={finishFirstSetup} />',
    '  <FirstSetup initialSettings={setupSettings} onComplete={finishFirstSetup} onOpenVoiceLab={openVoiceLabFromSetup} />',
    'App FirstSetup prop',
)
app = replace_once(
    app,
    '''            onRefresh={() => refreshSnapshot("Setup checked.")}\n            onFixSetup={fixSetup}\n          />''',
    '''            onRefresh={() => refreshSnapshot("Setup checked.")}\n            onFixSetup={fixSetup}\n            onOpenVoiceLab={() => navigate("voicelab")}\n          />''',
    'App Meeting VoiceLab prop',
)
app_path.write_text(app, encoding='utf-8')

# First Setup: make My Voice an explicit required step and hand off to VoiceLab as deferred setup.
setup_path = ROOT / 'pages' / 'FirstSetup.svelte'
setup = setup_path.read_text(encoding='utf-8')
setup = replace_once(
    setup,
    '  import { runtimeApi, type VirtualMicRouteContractStatus } from "../app/bridge/runtimeApi";\n',
    '  import { runtimeApi, type VirtualMicRouteContractStatus } from "../app/bridge/runtimeApi";\n  import { voiceLabBuildApi } from "../app/bridge/voiceLabBuildApi";\n',
    'FirstSetup VoiceLab import',
)
setup = replace_once(
    setup,
    '''  let {\n    initialSettings,\n    onComplete,\n  }: {\n    initialSettings: RuntimeSettings;\n    onComplete: (settings: RuntimeSettings) => void | Promise<void>;\n  } = $props();''',
    '''  let {\n    initialSettings,\n    onComplete,\n    onOpenVoiceLab,\n  }: {\n    initialSettings: RuntimeSettings;\n    onComplete: (settings: RuntimeSettings) => void | Promise<void>;\n    onOpenVoiceLab: (settings: RuntimeSettings) => void | Promise<void>;\n  } = $props();''',
    'FirstSetup props',
)
setup = replace_once(
    setup,
    '  let meetingSoundReady = $state<boolean | null>(null);\n',
    '  let meetingSoundReady = $state<boolean | null>(null);\n  let myVoiceReady = $state<boolean | null>(null);\n',
    'FirstSetup My Voice state',
)
setup = replace_once(
    setup,
    '''  function currentMeetingMicrophone(): string {\n    return compact(routeStatus?.selected_input_device, "Meeting microphone not configured");\n  }\n''',
    '''  function currentMeetingMicrophone(): string {\n    return compact(routeStatus?.selected_input_device, "Meeting microphone not configured");\n  }\n\n  async function refreshMyVoice(): Promise<void> {\n    try {\n      myVoiceReady = (await voiceLabBuildApi.getStatus()).approved_voice_ready;\n    } catch {\n      myVoiceReady = null;\n    }\n  }\n''',
    'FirstSetup refreshMyVoice',
)
setup = replace_once(
    setup,
    '''  async function initialize(): Promise<void> {\n    if (step > 1) {''',
    '''  async function initialize(): Promise<void> {\n    await refreshMyVoice();\n    if (step > 1) {''',
    'FirstSetup initialize My Voice',
)
setup = replace_once(
    setup,
    '''    await refreshSnapshot();\n    message = snapshot?.readiness.meetingReady ? "Everything needed for Meeting translation is ready." : "Setup still needs attention.";\n    busy = false;\n  }\n\n  async function completeSetup(): Promise<void> {\n    if (busy || !snapshot?.readiness.meetingReady) return;''',
    '''    await refreshSnapshot();\n    await refreshMyVoice();\n    message = myVoiceReady && snapshot?.readiness.meetingReady ? "Everything needed for Meeting translation is ready." : "Setup still needs attention.";\n    busy = false;\n  }\n\n  async function openVoiceLab(): Promise<void> {\n    if (busy) return;\n    busy = true;\n    message = "Saving setup before opening VoiceLab...";\n    const saved = await persistSetupFact("deferred", 5);\n    busy = false;\n    if (saved) await onOpenVoiceLab(settings);\n  }\n\n  async function completeSetup(): Promise<void> {\n    if (busy || !myVoiceReady || !snapshot?.readiness.meetingReady) return;''',
    'FirstSetup verify/open VoiceLab',
)
setup = replace_once(
    setup,
    '''          <p class="ti-page-copy">We'll check the microphone you speak into, where you hear the meeting, and the microphone your meeting app should use.</p>''',
    '''          <p class="ti-page-copy">We'll check your meeting audio, then help you create My Voice before you start translating.</p>''',
    'FirstSetup welcome copy',
)
setup = replace_once(
    setup,
    '''        <div><span class="ti-kicker">Ready</span><h1 class="ti-page-title">{snapshot?.readiness.meetingReady ? "You're ready to translate." : "One more thing needs attention."}</h1><p class="ti-page-copy">TranslateIT checks the essentials before you start a meeting.</p></div>''',
    '''        <div><span class="ti-kicker">Ready</span><h1 class="ti-page-title">{myVoiceReady && snapshot?.readiness.meetingReady ? "You're ready to translate." : "One more thing needs attention."}</h1><p class="ti-page-copy">TranslateIT checks the essentials before you start a meeting.</p></div>''',
    'FirstSetup final title',
)
setup = replace_once(
    setup,
    '''          <StatusRow label="Text translation" value="Indonesian ↔ English" status={snapshot?.readiness.textReady ? "Ready" : "Setup Needed"} tone={snapshot?.readiness.textReady ? "good" : "warning"} />''',
    '''          <StatusRow label="My Voice" value={myVoiceReady ? "Approved voice ready" : myVoiceReady === null ? "Checking My Voice" : "Create My Voice in VoiceLab"} status={myVoiceReady ? "Ready" : myVoiceReady === null ? "Checking" : "Setup Needed"} tone={myVoiceReady ? "good" : myVoiceReady === null ? "neutral" : "warning"} />''',
    'FirstSetup My Voice row',
)
setup = replace_once(
    setup,
    '''          {:else}\n            <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void verifySetup()}>Check Again</button>\n            {#if !snapshot?.readiness.meetingReady}<button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void fixSetup()}>Check Setup</button>{/if}\n            <button type="button" class="ti-button" disabled={busy || !snapshot?.readiness.meetingReady} onclick={() => void completeSetup()}><Check size={16} /> Open Meeting</button>\n          {/if}''',
    '''          {:else}\n            <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void verifySetup()}>Check Again</button>\n            {#if !snapshot?.readiness.meetingReady && myVoiceReady}<button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void fixSetup()}>Check Setup</button>{/if}\n            {#if myVoiceReady}\n              <button type="button" class="ti-button" disabled={busy || !snapshot?.readiness.meetingReady} onclick={() => void completeSetup()}><Check size={16} /> Open Meeting</button>\n            {:else}\n              <button type="button" class="ti-button" disabled={busy} onclick={() => void openVoiceLab()}>Create My Voice <ChevronRight size={16} /></button>\n            {/if}\n          {/if}''',
    'FirstSetup final actions',
)
setup_path.write_text(setup, encoding='utf-8')

# Meeting: required readiness is microphone + My Voice + meeting microphone.
# Incoming translation becomes a separate optional row.
meeting_path = ROOT / 'pages' / 'Meeting.svelte'
meeting = meeting_path.read_text(encoding='utf-8')
meeting = replace_once(
    meeting,
    '  import { ArrowRight, Languages, Mic, Radio } from "@lucide/svelte";\n',
    '  import { ArrowRight, AudioLines, Languages, Mic, Radio } from "@lucide/svelte";\n',
    'Meeting icon import',
)
meeting = replace_once(
    meeting,
    '  import type { ProductRuntimeSnapshot } from "../app/bridge/runtimeProductFacade";\n',
    '  import type { ProductRuntimeSnapshot } from "../app/bridge/runtimeProductFacade";\n  import { voiceLabBuildApi } from "../app/bridge/voiceLabBuildApi";\n',
    'Meeting VoiceLab import',
)
meeting = replace_once(
    meeting,
    '''    onRefresh,\n    onFixSetup,\n  }: {\n    snapshot: ProductRuntimeSnapshot;\n    meetingStatus: MeetingSessionStatus | null;\n    meetingTurns: MeetingCommittedTurnsSnapshot | null;\n    actionBusy?: boolean;\n    onMeetingAction: () => void | Promise<void>;\n    onRefresh: () => void | Promise<void>;\n    onFixSetup: () => void | Promise<void>;\n  } = $props();''',
    '''    onRefresh,\n    onFixSetup,\n    onOpenVoiceLab,\n  }: {\n    snapshot: ProductRuntimeSnapshot;\n    meetingStatus: MeetingSessionStatus | null;\n    meetingTurns: MeetingCommittedTurnsSnapshot | null;\n    actionBusy?: boolean;\n    onMeetingAction: () => void | Promise<void>;\n    onRefresh: () => void | Promise<void>;\n    onFixSetup: () => void | Promise<void>;\n    onOpenVoiceLab: () => void;\n  } = $props();''',
    'Meeting props',
)
meeting = replace_once(
    meeting,
    '  let routeStatus = $state<VirtualMicRouteContractStatus | null>(null);\n',
    '  let routeStatus = $state<VirtualMicRouteContractStatus | null>(null);\n  let myVoiceReady = $state<boolean | null>(null);\n',
    'Meeting My Voice state',
)
meeting = replace_once(
    meeting,
    '''  const readyMessage = $derived(\n    runtimeUnavailable\n      ? "TranslateIT can't reach the local translator right now. Retry the check."\n      : checking\n        ? "Checking your microphone and meeting output..."\n        : readiness.meetingReady\n          ? "Ready to translate. Start when your meeting is open."\n          : meeting.canStart\n            ? "Start Translation will run a quick final translation check before going live."\n            : "Finish the setup items below before starting translation.",\n  );''',
    '''  const readyMessage = $derived(\n    runtimeUnavailable\n      ? "TranslateIT can't reach the local translator right now. Retry the check."\n      : checking || myVoiceReady === null\n        ? "Checking your microphone, My Voice, and meeting output..."\n        : myVoiceReady === false\n          ? "Create My Voice before starting Meeting translation."\n          : readiness.meetingReady\n            ? "Ready to translate. Start when your meeting is open."\n            : meeting.canStart\n              ? "Start Translation will run a quick final translation check before going live."\n              : "Finish the setup items below before starting translation.",\n  );''',
    'Meeting ready message',
)
meeting = replace_once(
    meeting,
    '''  async function refreshRouteStatus(): Promise<void> {\n    try {\n      routeStatus = await runtimeApi.getVirtualMicRouteStatus();\n    } catch {\n      routeStatus = null;\n    }\n  }\n\n  async function refreshMeetingSetup(): Promise<void> {\n    await onRefresh();\n    await refreshRouteStatus();\n  }\n\n  onMount(() => {\n    void refreshRouteStatus();\n  });''',
    '''  async function refreshRouteStatus(): Promise<void> {\n    try {\n      routeStatus = await runtimeApi.getVirtualMicRouteStatus();\n    } catch {\n      routeStatus = null;\n    }\n  }\n\n  async function refreshMyVoiceStatus(): Promise<void> {\n    try {\n      myVoiceReady = (await voiceLabBuildApi.getStatus()).approved_voice_ready;\n    } catch {\n      myVoiceReady = null;\n    }\n  }\n\n  async function refreshMeetingSetup(): Promise<void> {\n    await onRefresh();\n    await Promise.all([refreshRouteStatus(), refreshMyVoiceStatus()]);\n  }\n\n  onMount(() => {\n    void refreshRouteStatus();\n    void refreshMyVoiceStatus();\n  });''',
    'Meeting My Voice refresh',
)
start = meeting.find('      <div class="grid grid-cols-3 divide-x divide-[var(--ti-border)]">')
end_marker = '      </div>\n    {/if}\n\n    <footer'
end = meeting.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('missing Meeting readiness grid anchors')
new_grid = '''      <div class="grid grid-cols-3 divide-x divide-[var(--ti-border)]">\n        <section class="min-w-0 p-5">\n          <div class="flex items-center gap-2 text-[var(--ti-text-muted)]">\n            <Mic size={15} strokeWidth={1.8} />\n            <span class="ti-field-label">Your microphone</span>\n          </div>\n          <strong class="mt-2 block break-words text-[13px] font-semibold leading-5">{microphone}</strong>\n          <p class="mb-0 mt-1.5 text-[11.5px] leading-[1.55] text-[var(--ti-text-soft)]">The microphone you speak into.</p>\n          {#if !readiness.microphoneReady}\n            <div class="mt-3">\n              <StatusBadge\n                label={microphoneUnavailable ? "Unavailable" : checking ? "Checking" : "Setup Needed"}\n                tone={microphoneTone}\n              />\n            </div>\n          {/if}\n        </section>\n\n        <section class="min-w-0 p-5">\n          <div class="flex items-center gap-2 text-[var(--ti-text-muted)]">\n            <AudioLines size={15} strokeWidth={1.8} />\n            <span class="ti-field-label">My Voice</span>\n          </div>\n          <strong class="mt-2 block text-[13px] font-semibold leading-5">{myVoiceReady ? "Ready" : myVoiceReady === null ? "Checking..." : "Not created"}</strong>\n          <p class="mb-0 mt-1.5 text-[11.5px] leading-[1.55] text-[var(--ti-text-soft)]">{myVoiceReady ? "Your approved English meeting voice." : "Create My Voice in VoiceLab before starting."}</p>\n          {#if !myVoiceReady}\n            <div class="mt-3">\n              <StatusBadge label={myVoiceReady === null ? "Checking" : "Setup Needed"} tone={myVoiceReady === null ? "neutral" : "warning"} />\n            </div>\n          {/if}\n        </section>\n\n        <section class="min-w-0 p-5">\n          <div class="flex items-center gap-2 text-[var(--ti-text-muted)]">\n            <Radio size={15} strokeWidth={1.8} />\n            <span class="ti-field-label">Meeting microphone</span>\n          </div>\n          <strong class="mt-2 block break-words text-[13px] font-semibold leading-5">{meetingMicrophoneDevice}</strong>\n          <p class="mb-0 mt-1.5 text-[11.5px] leading-[1.55] text-[var(--ti-text-soft)]">\n            {readiness.meetingRouteReady\n              ? "Choose this exact microphone in your meeting app."\n              : "Meeting microphone setup is required before you start."}\n          </p>\n          {#if !readiness.meetingRouteReady}\n            <div class="mt-3">\n              <StatusBadge\n                label={runtimeUnavailable ? "Unavailable" : checking ? "Checking" : "Setup Needed"}\n                tone={routeTone}\n              />\n            </div>\n          {/if}\n        </section>\n      </div>\n\n      <section class="flex items-start justify-between gap-5 border-t border-[var(--ti-border)] px-5 py-4">\n        <div class="min-w-0">\n          <div class="flex items-center gap-2 text-[var(--ti-text-muted)]">\n            <Languages size={15} strokeWidth={1.8} />\n            <span class="ti-field-label">Incoming translation</span>\n          </div>\n          <strong class="mt-2 block text-[13px] font-semibold leading-5">English → Indonesian text</strong>\n          <p class="mb-0 mt-1.5 text-[11.5px] leading-[1.55] text-[var(--ti-text-soft)]">Optional · listens to {meetingSound}</p>\n        </div>\n        <StatusBadge label="Optional" tone="neutral" />\n      </section>\n'''
meeting = meeting[:start] + new_grid + meeting[end + len('      </div>\n'):]
meeting = replace_once(
    meeting,
    '''        <button type="button" class={`ti-button min-w-40 ${meeting.canStop ? "ti-button-danger" : ""}`} disabled={primaryDisabled} onclick={onMeetingAction}>{primaryLabel}</button>''',
    '''        {#if myVoiceReady === false && !meeting.live && !meeting.busy}\n          <button type="button" class="ti-button min-w-40" onclick={onOpenVoiceLab}>Create My Voice</button>\n        {:else}\n          <button type="button" class={`ti-button min-w-40 ${meeting.canStop ? "ti-button-danger" : ""}`} disabled={primaryDisabled || myVoiceReady === null} onclick={onMeetingAction}>{primaryLabel}</button>\n        {/if}''',
    'Meeting primary My Voice action',
)
meeting_path.write_text(meeting, encoding='utf-8')

# Bounded source contract checks.
checks = {
    app_path: ['onOpenVoiceLab={openVoiceLabFromSetup}', 'onOpenVoiceLab={() => navigate("voicelab")}', 'Create My Voice before starting Meeting translation.'],
    setup_path: ['voiceLabBuildApi', 'Create My Voice in VoiceLab', 'onOpenVoiceLab(settings)', 'persistSetupFact("deferred", 5)', 'label="My Voice"'],
    meeting_path: ['label">My Voice', 'Create My Voice in VoiceLab before starting.', 'StatusBadge label="Optional" tone="neutral"', 'onOpenVoiceLab', 'Meeting microphone setup is required before you start.'],
}
for path, markers in checks.items():
    value = path.read_text(encoding='utf-8')
    for marker in markers:
        if marker not in value:
            raise SystemExit(f'missing post-patch marker in {path}: {marker}')

print('[frontend-p0] First Setup -> VoiceLab handoff + Meeting My Voice hierarchy patched')
