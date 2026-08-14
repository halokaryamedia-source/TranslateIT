from pathlib import Path

path = Path('EngineData/Frontend/RustApp/src/pages/Settings.svelte')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    '      deviceMessage = devices.ok ? "Choose a device to check it before saving." : "Audio devices are unavailable right now. Try again.";',
    '      deviceMessage = devices.ok ? "Choose a device. TranslateIT checks it before saving." : "Audio devices are unavailable right now. Try again.";',
    'device guidance',
)

replace_once(
    '''              {snapshot.readiness.meetingRouteReady\n                ? "Choose this exact microphone inside your meeting app."\n                : "A matched Windows virtual-audio cable pair is required for translated meeting output."}''',
    '''              {snapshot.readiness.meetingRouteReady\n                ? "Choose this exact microphone inside your meeting app."\n                : "Meeting microphone isn't ready yet. Run Check Setup before starting Meeting translation."}''',
    'meeting microphone copy',
)

check_button = '''            <button type="button" class="ti-button ti-button-secondary" disabled={setupBusy || deviceSaving} onclick={() => void onSetupAction("check-microphone")}>{setupBusy ? "Checking..." : "Check Microphone"}</button>\n'''
if text.count(check_button) != 1:
    raise SystemExit(f'Check Microphone button: expected one anchor, found {text.count(check_button)}')
text = text.replace(check_button, '', 1)

path.write_text(text, encoding='utf-8')

# P2 source contract: normal Meeting settings are simple, Diagnostics remains technical.
final = path.read_text(encoding='utf-8')
required = [
    'Choose a device. TranslateIT checks it before saving.',
    "Meeting microphone isn't ready yet. Run Check Setup before starting Meeting translation.",
    '>Mic Test</button>',
    '>Check Setup</button>',
    '<span class="ti-field-label">Worker</span>',
    '<span class="ti-field-label">Outbound provider</span>',
    'snapshot.helper?.cuda_ready ? "CUDA"',
    '> Verify Models</button>',
    'Recent command errors',
]
for marker in required:
    if marker not in final:
        raise SystemExit(f'missing Settings P2 marker: {marker}')

for forbidden in [
    '>Check Microphone</button>',
    'onSetupAction("check-microphone")',
    'matched Windows virtual-audio cable pair',
]:
    if forbidden in final:
        raise SystemExit(f'Settings P2 leakage remains: {forbidden}')

print('[settings-p2] normal Settings cleanup + Diagnostics containment -> PASS')
