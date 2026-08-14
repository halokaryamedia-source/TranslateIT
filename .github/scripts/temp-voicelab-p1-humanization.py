from pathlib import Path

ROOT = Path('EngineData/Frontend/RustApp/src')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'missing patch anchor: {label}')
    if text.count(old) != 1:
        raise SystemExit(f'non-unique patch anchor: {label} ({text.count(old)})')
    return text.replace(old, new, 1)

# VoiceLab recording surface: remove completion pressure and engineering copy.
page_path = ROOT / 'pages' / 'VoiceLab.svelte'
page = page_path.read_text(encoding='utf-8')
page = replace_once(
    page,
    '  const acceptedCount = $derived(recordingState.lines.filter((line) => line.accepted).length);\n',
    '',
    'remove accepted header count',
)
page = replace_once(
    page,
    '''    <div>\n      <h2 class="ti-page-title">VoiceLab</h2>\n      <p class="ti-page-copy">Record clear English lines to build your reusable meeting voice.</p>\n    </div>\n    <span class="ti-pill">{acceptedCount} accepted · {recordingState.lines.length || "—"} available</span>''',
    '''    <div>\n      <h2 class="ti-page-title">VoiceLab</h2>\n      <p class="ti-page-copy">Record and review clear English lines for My Voice.</p>\n    </div>''',
    'VoiceLab header',
)
page = replace_once(
    page,
    '          <span class="ti-kicker">My Voice</span>\n          <h3 class="mb-0 mt-2 text-xl font-semibold tracking-[-0.02em]">Guided recording</h3>\n          <p class="mb-0 mt-2 max-w-[680px] text-sm leading-6 text-[var(--ti-text-muted)]">Use the same microphone and a quiet room. Read naturally rather than performing the lines. If a line feels difficult, Skip it and continue. You do not need to finish every available line before Create My Voice becomes ready.</p>',
    '          <span class="ti-kicker">My Voice</span>\n          <h3 class="mb-0 mt-2 text-xl font-semibold tracking-[-0.02em]">Record your voice</h3>\n          <p class="mb-0 mt-2 max-w-[680px] text-sm leading-6 text-[var(--ti-text-muted)]">Use the same microphone in a quiet room and read each line naturally. If a line feels difficult, skip it and continue with one that feels comfortable.</p>',
    'recording guidance',
)
page = replace_once(
    page,
    '<input class="mt-0.5 size-4 accent-[var(--ti-action)]" type="checkbox" bind:checked={authorized} disabled={isRecording} />\n        <span class="text-sm leading-5 text-[var(--ti-text-muted)]">I own this voice or have permission to create and use this Voice Actor.</span>',
    '<input class="mt-0.5 size-4 accent-[var(--ti-accent)]" type="checkbox" bind:checked={authorized} disabled={isRecording} />\n        <span class="text-sm leading-5 text-[var(--ti-text-muted)]">I confirm this is my voice, or I have permission to use it.</span>',
    'recording authorization',
)
page = replace_once(
    page,
    '''              {recordingState.pending_review.quality_blocker\n                ? "This recording has a basic signal-quality problem. Replay it if useful, then record the line again."\n                : "Listen once before accepting it for your Voice Actor dataset."}''',
    '''              {recordingState.pending_review.quality_blocker\n                ? "This recording isn't clear enough yet. Replay it if useful, then try this line again."\n                : "Listen once. Accept it if the recording sounds clear and natural."}''',
    'review copy',
)
page = replace_once(
    page,
    '<p class="mb-0 mt-7 text-xs leading-5 text-[var(--ti-text-soft)]">Accepted takes stay on this device and are prepared for the later Voice Actor build. Recording count alone is not treated as proof of voice quality.</p>',
    '<p class="mb-0 mt-7 text-xs leading-5 text-[var(--ti-text-soft)]">Accepted recordings stay on this device and are used when you create My Voice.</p>',
    'recording footer copy',
)
page_path.write_text(page, encoding='utf-8')

# VoiceLab build surface: project backend state into ordinary product language.
build_path = ROOT / 'components' / 'voice-lab' / 'VoiceLabBuild.svelte'
build = build_path.read_text(encoding='utf-8')
build = replace_once(
    build,
    '''  function productMessage(result: VoiceLabBuildActionResult): string {\n    const message = result.message.trim();\n    if (!message.includes("voice_lab:")) return message;\n\n    switch (result.state) {\n      case "build_blocked":\n        return "Stop Meeting translation before creating My Voice, then try again.";\n      case "dataset_prepare_failed":\n        return "VoiceLab couldn't prepare the accepted recordings. Check Diagnostics and try again.";\n      case "approval_failed":\n        return "My Voice couldn't be approved. Stop Meeting translation if it is active, then try again or check Diagnostics.";\n      default:\n        return "VoiceLab couldn't complete this action. Check Diagnostics and try again.";\n    }\n  }''',
    '''  function productMessage(result: VoiceLabBuildActionResult): string {\n    switch (result.state) {\n      case "building":\n        return "Creating My Voice. You can leave VoiceLab open while it works.";\n      case "approved":\n        return "My Voice is ready for Meeting translation.";\n      case "cancelled":\n        return "My Voice creation stopped. Your accepted recordings were kept.";\n      case "authorization_required":\n        return "Confirm that this is your voice, or that you have permission to use it.";\n      case "recording_active":\n        return "Stop the current recording before creating My Voice.";\n      case "build_active":\n        return "My Voice is already being created.";\n      case "more_recording_needed":\n        return "Record a few more clear lines before creating My Voice.";\n      case "build_blocked":\n        return "Stop Meeting translation before creating My Voice, then try again.";\n      case "cancel_pending":\n        return "My Voice is still stopping. Keep VoiceLab open and try again shortly.";\n      case "evaluation_required":\n        return "Review the voice previews before approving My Voice.";\n      case "approval_failed":\n        return "My Voice couldn't be approved. Try again or check Diagnostics.";\n      case "dataset_prepare_failed":\n      case "assets_unavailable":\n      case "python_unavailable":\n      case "build_state_invalid":\n      case "build_storage_failed":\n      case "build_log_failed":\n      case "build_spawn_failed":\n        return "My Voice couldn't be created. Check Diagnostics and try again.";\n      case "cancel_failed":\n        return "My Voice couldn't stop safely yet. Try again or check Diagnostics.";\n      default:\n        return result.ok ? "VoiceLab action completed." : "VoiceLab couldn't complete this action. Check Diagnostics and try again.";\n    }\n  }\n\n  function activeTitle(): string {\n    if (build.phase === "evaluating") return "Preparing voice previews";\n    if (build.phase === "cancelling") return "Stopping My Voice creation";\n    return "Creating My Voice";\n  }\n\n  function activeDetail(): string {\n    if (build.phase === "preparing") return "Getting your accepted recordings ready.";\n    if (build.phase === "training") return "Creating your English meeting voice from your accepted recordings.";\n    if (build.phase === "evaluating") return "Preparing new sentences so you can listen before approving My Voice.";\n    if (build.phase === "cancelling") return "Finishing the current stop safely.";\n    return "VoiceLab is working on My Voice.";\n  }\n\n  function idleGuidance(): string {\n    if (build.approved_voice_ready && !build.can_build) {\n      return "My Voice is ready. Record more clear lines only if you want to create it again.";\n    }\n    if (!build.can_build) {\n      return "Keep recording clear lines. Create My Voice becomes available when there is enough usable speech.";\n    }\n    return "Your accepted recordings are ready.";\n  }''',
    'build product projection',
)
build = replace_once(
    build,
    '<section class="ti-panel mt-5 p-6">',
    '<section class="ti-panel p-6">',
    'remove extra build panel margin',
)
build = replace_once(
    build,
    '''      <span class="ti-kicker">Voice Actor</span>\n      <h3 class="mb-0 mt-2 text-xl font-semibold tracking-[-0.02em]">Create My Voice</h3>\n      <p class="mb-0 mt-2 max-w-[680px] text-sm leading-6 text-[var(--ti-text-muted)]">VoiceLab uses your accepted recordings to create one local English meeting voice, then gives you new sentences to review before anything is approved.</p>''',
    '''      <span class="ti-kicker">My Voice</span>\n      <h3 class="mb-0 mt-2 text-xl font-semibold tracking-[-0.02em]">Create My Voice</h3>\n      <p class="mb-0 mt-2 max-w-[680px] text-sm leading-6 text-[var(--ti-text-muted)]">Use your accepted recordings to create an English meeting voice. You'll hear new preview sentences before you approve it.</p>''',
    'build heading copy',
)
build = replace_once(
    build,
    '''  <div class="mt-5 flex items-center justify-between gap-4 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-4 py-3.5">\n    <div>\n      <strong class="text-sm font-semibold">Accepted speech</strong>\n      <p class="mb-0 mt-1 text-xs text-[var(--ti-text-muted)]">{build.accepted_take_count} reviewed takes · {formatDuration(build.accepted_duration_ms)} recorded</p>\n    </div>\n    <span class="text-xs font-medium text-[var(--ti-text-soft)]">Minimum {formatDuration(build.minimum_duration_ms)}</span>\n  </div>''',
    '''  <div class="mt-5 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-4 py-3.5">\n    <strong class="text-sm font-semibold">Accepted speech</strong>\n    <p class="mb-0 mt-1 text-xs text-[var(--ti-text-muted)]">{build.accepted_take_count} accepted recordings · {formatDuration(build.accepted_duration_ms)} recorded</p>\n  </div>''',
    'accepted speech card',
)
build = replace_once(
    build,
    '''      <strong class="text-sm font-semibold">{build.phase === "evaluating" ? "Checking your new voice" : build.phase === "cancelling" ? "Stopping creation" : "Creating My Voice"}</strong>\n      <p class="mb-0 mt-1 text-sm leading-5 text-[var(--ti-text-muted)]">{build.message}</p>''',
    '''      <strong class="text-sm font-semibold">{activeTitle()}</strong>\n      <p class="mb-0 mt-1 text-sm leading-5 text-[var(--ti-text-muted)]">{activeDetail()}</p>''',
    'active build copy',
)
build = replace_once(
    build,
    '''      <strong class="text-sm font-semibold">Listen before approving</strong>\n      <p class="mb-0 mt-1 text-sm leading-5 text-[var(--ti-text-muted)]">These sentences were not part of your recording script. Approve only if the voice sounds like you.</p>''',
    '''      <strong class="text-sm font-semibold">Review My Voice</strong>\n      <p class="mb-0 mt-1 text-sm leading-5 text-[var(--ti-text-muted)]">Listen to these new sentences. Approve My Voice only if it sounds like you.</p>''',
    'evaluation copy',
)
build = replace_once(
    build,
    '<p class="mb-0 mt-5 text-sm leading-5 text-[var(--ti-text-muted)]">{build.message}</p>',
    '<p class="mb-0 mt-5 text-sm leading-5 text-[var(--ti-text-muted)]">{idleGuidance()}</p>',
    'idle guidance',
)
build = replace_once(
    build,
    '<input class="mt-0.5 size-4 accent-[var(--ti-action)]" type="checkbox" bind:checked={authorized} />',
    '<input class="mt-0.5 size-4 accent-[var(--ti-accent)]" type="checkbox" bind:checked={authorized} />',
    'build authorization token',
)
build = replace_once(
    build,
    '<p class="mb-0 mt-5 text-xs leading-5 text-[var(--ti-text-soft)]">VoiceLab does not treat recording count, training completion, or an internal similarity number as proof that the voice is good. Your held-out listening review is required before approval.</p>',
    '<p class="mb-0 mt-5 text-xs leading-5 text-[var(--ti-text-soft)]">My Voice is saved only after you listen to the previews and approve it.</p>',
    'build footer copy',
)
build_path.write_text(build, encoding='utf-8')

# Source-level product contract checks.
page = page_path.read_text(encoding='utf-8')
build = build_path.read_text(encoding='utf-8')
combined = page + '\n' + build
required = [
    'Record and review clear English lines for My Voice.',
    'Record your voice',
    'Accept it if the recording sounds clear and natural.',
    'Review My Voice',
    'Preparing voice previews',
    'accent-[var(--ti-accent)]',
]
for marker in required:
    if marker not in combined:
        raise SystemExit(f'missing P1 product marker: {marker}')
for forbidden in [
    '128 available',
    'Minimum {formatDuration(build.minimum_duration_ms)}',
    'Voice Actor dataset',
    'training completion',
    'internal similarity number',
    'held-out listening review',
    'accent-[var(--ti-action)]',
    '>{build.message}<',
]:
    if forbidden in combined:
        raise SystemExit(f'P1 normal-UI leakage remains: {forbidden}')
print('[voicelab-p1] humanized product copy + hierarchy contract -> PASS')
