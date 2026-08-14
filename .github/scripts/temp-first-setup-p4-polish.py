from pathlib import Path

path = Path('EngineData/Frontend/RustApp/src/pages/FirstSetup.svelte')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    '<div class="flex items-center justify-between text-[11px] font-semibold text-[var(--ti-text-muted)]"><span>Step {step} of 5</span><span>{step * 20}%</span></div>',
    '<div class="text-[11px] font-semibold text-[var(--ti-text-muted)]">Step {step} of 5</div>',
    'setup progress label',
)

replace_once(
    '<div><span class="ti-kicker">Meeting microphone</span><h1 class="ti-page-title">Choose the configured meeting microphone</h1><p class="ti-page-copy">In Zoom, Meet, Teams, or another meeting app, choose the exact Windows microphone shown below.</p></div>',
    '<div><span class="ti-kicker">Meeting microphone</span><h1 class="ti-page-title">Set your meeting microphone</h1><p class="ti-page-copy">In your meeting app, choose the exact microphone shown below.</p></div>',
    'meeting microphone heading',
)

replace_once(
    '<div class="ti-subtle-card overflow-hidden"><StatusRow label="Meeting microphone device" value={currentMeetingMicrophone()} detail="TranslateIT sends the translated English voice through the paired virtual-audio route behind this Windows input device." status={snapshot?.readiness.meetingRouteReady ? "" : snapshot?.readiness.level === "checking" ? "Checking" : "Setup Needed"} tone={snapshot?.readiness.level === "checking" ? "neutral" : "warning"} /></div>',
    '<div class="ti-subtle-card overflow-hidden"><StatusRow label="Meeting microphone" value={currentMeetingMicrophone()} detail="TranslateIT uses this microphone to send your English voice into the meeting." status={snapshot?.readiness.meetingRouteReady ? "" : snapshot?.readiness.level === "checking" ? "Checking" : "Setup Needed"} tone={snapshot?.readiness.level === "checking" ? "neutral" : "warning"} /></div>',
    'meeting microphone status copy',
)

path.write_text(text, encoding='utf-8')

final = path.read_text(encoding='utf-8')
required = [
    'Step {step} of 5</div>',
    'style={`width:${step * 20}%`}',
    'Set your meeting microphone',
    'In your meeting app, choose the exact microphone shown below.',
    'StatusRow label="Meeting microphone"',
    'TranslateIT uses this microphone to send your English voice into the meeting.',
    'Set Up Later',
    'Create My Voice',
    'Open Meeting',
]
for marker in required:
    if marker not in final:
        raise SystemExit(f'missing First Setup P4 marker: {marker}')

for forbidden in [
    '<span>{step * 20}%</span>',
    'Choose the configured meeting microphone',
    'paired virtual-audio route',
    'Meeting microphone device',
]:
    if forbidden in final:
        raise SystemExit(f'First Setup P4 leakage remains: {forbidden}')

print('[first-setup-p4] normal-user polish contract -> PASS')
