from pathlib import Path

ROOT = Path('EngineData/Frontend/RustApp/src')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)


# App shell: remove redundant global direction projection/pill only.
app_path = ROOT / 'App.svelte'
app = app_path.read_text(encoding='utf-8')
app = replace_once(
    app,
    '  const currentSettings = $derived(snapshot?.settings ?? setupSettings);\n\n',
    '',
    'App currentSettings projection',
)
app = replace_once(
    app,
    '''  const direction = $derived(\n    route === "meeting"\n      ? "ID → EN voice"\n      : route === "voicelab"\n        ? "My Voice"\n        : `${currentSettings.source_language.toUpperCase()} → ${currentSettings.target_language.toUpperCase()}`,\n  );\n\n''',
    '',
    'App direction projection',
)
app = replace_once(
    app,
    '''\n        <span class="ti-pill">{direction}</span>\n''',
    '\n',
    'App direction pill',
)
app_path.write_text(app, encoding='utf-8')

# Meeting: live activity already owns Listening/Translating/Speaking; keep only attention/status badges.
meeting_path = ROOT / 'pages' / 'Meeting.svelte'
meeting = meeting_path.read_text(encoding='utf-8')
meeting = replace_once(
    meeting,
    '''    {#if meeting.live || meeting.busy || runtimeUnavailable || !readiness.meetingReady}\n      <StatusBadge\n        label={meeting.live ? "Live" : meeting.busy ? meeting.label : runtimeUnavailable ? "Unavailable" : checking ? "Checking" : "Setup Needed"}\n        tone={meetingTone}\n      />\n    {/if}''',
    '''    {#if meeting.busy || runtimeUnavailable || !readiness.meetingReady}\n      <StatusBadge\n        label={meeting.busy ? meeting.label : runtimeUnavailable ? "Unavailable" : checking ? "Checking" : "Setup Needed"}\n        tone={meetingTone}\n      />\n    {/if}''',
    'Meeting header badge condition',
)
meeting_path.write_text(meeting, encoding='utf-8')

# Source contract.
app = app_path.read_text(encoding='utf-8')
meeting = meeting_path.read_text(encoding='utf-8')

for marker in [
    'aria-live="polite" title={notice}>{notice}</p>',
    'Meeting {snapshot.meeting.label.toLowerCase()}',
]:
    if marker not in app:
        raise SystemExit(f'missing preserved App shell marker: {marker}')

for forbidden in [
    'const direction = $derived(',
    'const currentSettings = $derived(',
    '<span class="ti-pill">{direction}</span>',
]:
    if forbidden in app:
        raise SystemExit(f'global direction redundancy remains: {forbidden}')

required_meeting = [
    '{#if meeting.busy || runtimeUnavailable || !readiness.meetingReady}',
    'label={meeting.busy ? meeting.label : runtimeUnavailable ? "Unavailable" : checking ? "Checking" : "Setup Needed"}',
    '<MeetingActivity status={meetingStatus} turns={meetingTurns} />',
]
for marker in required_meeting:
    if marker not in meeting:
        raise SystemExit(f'missing Meeting P3 marker: {marker}')

for forbidden in [
    '{#if meeting.live || meeting.busy || runtimeUnavailable || !readiness.meetingReady}',
    'label={meeting.live ? "Live"',
]:
    if forbidden in meeting:
        raise SystemExit(f'redundant Meeting Live badge remains: {forbidden}')

print('[shell-p3] global direction + redundant live badge cleanup -> PASS')
