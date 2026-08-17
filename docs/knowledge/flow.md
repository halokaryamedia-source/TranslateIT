# TranslateIT Work Routing

Root `AGENTS.md` is the canonical work-mode/boot owner. `GITHUB_RULES.md` is the canonical GitHub execution owner. This file is only a compact routing reference.

```text
User request
    |
    v
Pin TranslateIT / intended ref
    |
    v
Select real mode
    |
    +--> Context Recovery
    |      AGENTS → GitHub Core → CONTEXT → next-action
    |      → smallest owner → report → STOP / NO EDIT
    |
    +--> Plan
    |      recover authority → resolve material method/ownership decision
    |      → NO IMPLEMENTATION → STOP
    |
    +--> Developing
    |      continuity boot
    |      → development-brief
    |      → zero/one project specialist
    |      → smallest current owner
    |
    +--> Maintenance
           exact defect
           → first wrong owner
           → zero/one specialist only if useful
    |
    v
Root-cause / edit gate
    |
    v
Minimum complete change
(or No change required)
    |
    v
Minimum proof that can falsify the claim
    |
    v
Acceptance POV
    |
    +--> proof sufficient       → Selesai
    +--> target proof missing   → Perlu pemeriksaan
    +--> material blocker       → Terhenti
    |
    v
Update only canonical state owners that actually changed
    |
    v
Exactly one Next step
    |
    v
STOP
```

## Key routing rules

- `amati` / inspect / understand is read-only unless the user also asks to continue/change something.
- Plan never silently becomes Developing.
- Non-trivial Developing always uses `development-brief`.
- Maintenance starts from a reproduced/concrete defect and fixes the first wrong owner.
- Do not route by Rust, Python, Svelte, Tauri, CUDA, or file type; route by semantic responsibility.
- Do not stack TranslateIT project specialists.
- If `next-action.md` disagrees with current source/state, verify the current owner and reconcile the stale record before continuing.
- Historical TODOs, audits, deleted branches, `DevelopingData`, and old proof runs are not active work by themselves.
- Hosted CI proves only what it executes; it does not automatically prove target Windows/device/audio/clean-machine behavior.
- Stop when the current requested acceptance boundary is satisfied.

## Canonical specialist routes

```text
desktop shell / navigation / state / readiness / settings integration
→ desktop-runtime-development

visual hierarchy / layout / tokens / rendered UI acceptance
→ desktop-ui-design-development

ASR / translation / TTS / model / AI worker runtime
→ local-ai-runtime-development

physical mic / capture / segmentation / Windows devices / Meeting route
→ windows-audio-runtime-development

installer / private runtime / models / provider distribution / clean-machine
→ release-packaging-development
```

Use `docs/knowledge/skills/activation-matrix.md` only when specialist selection is genuinely ambiguous.
