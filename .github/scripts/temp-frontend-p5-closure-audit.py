from pathlib import Path

ROOT = Path('EngineData/Frontend/RustApp/src')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)


# 1) VoiceLab: never pass backend recording messages directly into normal UI.
voice_path = ROOT / 'pages' / 'VoiceLab.svelte'
voice = voice_path.read_text(encoding='utf-8')
old_product_message = '''  function productMessage(result: GuidedRecordingActionResult): string {\n    const message = result.message.trim();\n    if (!message.includes("voice_lab:")) return message;\n\n    switch (result.state) {\n      case "take_unusable":\n        return "This recording is unusable. Record the line again.";\n      case "capture_unavailable":\n      case "capture_failed":\n        return "VoiceLab couldn't use the microphone. Stop Meeting translation or Mic Test, then try again.";\n      default:\n        return "VoiceLab couldn't complete this recording action. Check Diagnostics and try again.";\n    }\n  }'''
new_product_message = '''  function productMessage(result: GuidedRecordingActionResult): string {\n    switch (result.state) {\n      case "recording":\n        return "Recording started. Read the line naturally, then press Stop.";\n      case "needs_review":\n        return "Recording stopped. Replay it, then accept it or try the line again.";\n      case "accepted":\n        return "Recording accepted.";\n      case "ready":\n        return "Ready for another recording.";\n      case "authorization_required":\n        return "Confirm that this is your voice, or that you have permission to use it.";\n      case "build_active":\n        return "Finish or stop My Voice creation before recording more lines.";\n      case "review_pending":\n        return "Review the current recording before starting another line.";\n      case "microphone_in_use":\n      case "owner_conflict":\n        return "Another TranslateIT action is using the microphone. Finish it, then try again.";\n      case "runtime_unavailable":\n        return "VoiceLab can't check the microphone right now. Try again or check Diagnostics.";\n      case "capture_unavailable":\n      case "capture_failed":\n        return "VoiceLab couldn't use the microphone. Check the microphone and try again.";\n      case "stop_failed":\n      case "cleanup_unverified":\n        return "VoiceLab couldn't finish stopping the microphone safely. Try again or check Diagnostics.";\n      case "take_unusable":\n        return "This recording isn't usable yet. Record the line again.";\n      case "draft_write_failed":\n      case "draft_state_unavailable":\n      case "save_failed":\n        return "VoiceLab couldn't save this recording. Check Diagnostics and try again.";\n      case "invalid_line":\n      case "line_mismatch":\n      case "no_review":\n        return "This recording action is no longer current. Choose the line again and try again.";\n      case "frontend_bridge_error":\n        return "VoiceLab is unavailable right now. Try again or check Diagnostics.";\n      default:\n        return result.ok ? "VoiceLab action completed." : "VoiceLab couldn't complete this recording action. Check Diagnostics and try again.";\n    }\n  }'''
voice = replace_once(voice, old_product_message, new_product_message, 'VoiceLab product message projection')
voice_path.write_text(voice, encoding='utf-8')


# 2) Text: use the shared semantic status vocabulary for non-ready product states.
text_path = ROOT / 'pages' / 'Text.svelte'
text = text_path.read_text(encoding='utf-8')
text = replace_once(
    text,
    '  import type { RuntimeSettings } from "../app/shared/types";\n',
    '  import type { RuntimeSettings } from "../app/shared/types";\n  import StatusBadge from "../components/ui/StatusBadge.svelte";\n',
    'Text StatusBadge import',
)
text = replace_once(
    text,
    '''    {#if textStatus !== "Ready"}\n      <span class="ti-pill">{textStatus}</span>\n    {/if}''',
    '''    {#if textStatus !== "Ready"}\n      <StatusBadge\n        label={textStatus}\n        tone={textStatus === "Unavailable" ? "danger" : textStatus === "Setup Needed" ? "warning" : "neutral"}\n      />\n    {/if}''',
    'Text semantic status',
)
text_path.write_text(text, encoding='utf-8')


# 3) Meeting: keep one calm ready message, and make busy states neutral rather than success-colored.
meeting_path = ROOT / 'pages' / 'Meeting.svelte'
meeting = meeting_path.read_text(encoding='utf-8')
meeting = replace_once(
    meeting,
    '  const meetingTone = $derived(statusTone(meeting.live || readiness.meetingReady, checking || meeting.busy, runtimeUnavailable));\n',
    '  const meetingTone = $derived(runtimeUnavailable ? "danger" : meeting.busy || checking ? "neutral" : meeting.live || readiness.meetingReady ? "good" : "warning");\n',
    'Meeting busy status tone',
)
ready_marker = '''        {#if readiness.meetingReady}\n          <div class="flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--ti-success)]">\n            <span class="size-1.5 rounded-full bg-[var(--ti-success)]" aria-hidden="true"></span>\n            Ready\n          </div>\n        {/if}\n'''
if meeting.count(ready_marker) != 1:
    raise SystemExit(f'Meeting redundant Ready marker: expected one anchor, found {meeting.count(ready_marker)}')
meeting = meeting.replace(ready_marker, '', 1)
meeting_path.write_text(meeting, encoding='utf-8')


# Closure audit across normal-user frontend surfaces.
app = (ROOT / 'App.svelte').read_text(encoding='utf-8')
settings = (ROOT / 'pages' / 'Settings.svelte').read_text(encoding='utf-8')
setup = (ROOT / 'pages' / 'FirstSetup.svelte').read_text(encoding='utf-8')
build = (ROOT / 'components' / 'voice-lab' / 'VoiceLabBuild.svelte').read_text(encoding='utf-8')
meeting_activity = (ROOT / 'components' / 'meeting' / 'MeetingActivity.svelte').read_text(encoding='utf-8')
text = text_path.read_text(encoding='utf-8')
voice = voice_path.read_text(encoding='utf-8')
meeting = meeting_path.read_text(encoding='utf-8')
normal_surfaces = '\n'.join([app, meeting, text, voice, build, setup])

required = [
    'StatusBadge',
    'tone={textStatus === "Unavailable" ? "danger" : textStatus === "Setup Needed" ? "warning" : "neutral"}',
    'const meetingTone = $derived(runtimeUnavailable ? "danger" : meeting.busy || checking ? "neutral"',
    'Ready to translate. Start when your meeting is open.',
    'Meeting {snapshot.meeting.label.toLowerCase()}',
    'Another TranslateIT action is using the microphone. Finish it, then try again.',
    'VoiceLab couldn\'t save this recording. Check Diagnostics and try again.',
]
for marker in required:
    if marker not in '\n'.join([app, meeting, text, voice, build]):
        raise SystemExit(f'missing frontend P5 closure marker: {marker}')

for forbidden in [
    'if (!message.includes("voice_lab:")) return message;',
    '<span class="ti-pill">{textStatus}</span>',
    'Voice Actor dataset',
    'paired virtual-audio route',
    'matched Windows virtual-audio cable pair',
    '<span class="ti-pill">{direction}</span>',
]:
    if forbidden in normal_surfaces:
        raise SystemExit(f'frontend P5 normal-UI residue remains: {forbidden}')

# Diagnostics is intentionally technical and must retain its troubleshooting vocabulary.
for marker in [
    '<span class="ti-field-label">Worker</span>',
    '<span class="ti-field-label">Outbound provider</span>',
    'snapshot.helper?.cuda_ready ? "CUDA"',
    '> Verify Models</button>',
    'Recent command errors',
]:
    if marker not in settings:
        raise SystemExit(f'Diagnostics technical boundary was accidentally removed: {marker}')

# Meeting activity remains the live phase owner.
for marker in ['Listening', 'Translating', 'Speaking']:
    if marker not in meeting_activity:
        raise SystemExit(f'Meeting activity phase missing: {marker}')

print('[frontend-p5] source closure audit + bounded residue fixes -> PASS')
