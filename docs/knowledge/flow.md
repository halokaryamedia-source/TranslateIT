# TranslateIT Work Flow

## Canonical flow

```text
User request
→ PIN repository/ref
→ classify EXECUTION CONTEXT
→ choose Context Recovery | Plan | Maintenance | Standard | Complex
→ read minimum current authority
→ identify first wrong owner
→ define acceptance + proof ceiling
→ finish current-context partition
→ TOOL + TRANSFER GATE
→ minimum complete change
→ cheapest falsifiable proof
→ update only changed canonical state owners
→ exactly one next step when work remains
→ STOP
```

## Execution contexts

```text
REMOTE_GITHUB
→ source/static/CI-verifiable work

LOCAL_CODE
→ exact checkout + development toolchain/filesystem

TARGET_WINDOWS
→ installed TranslateIT + real GPU/audio/device/meeting environment
```

Never transfer an entire task because one residue requires a higher context. Finish independent GitHub-valid source/test/harness/provenance work first and hand off only the intrinsic residue.

## Modes

### Context Recovery

Read-only. Current authority only. Never execute a historical next step merely because it exists.

### Plan

Resolve a material product/architecture/release choice. No implementation.

### Bounded Maintenance

```text
Goal
Failure Classification / first wrong owner
Acceptance
Proof Required
STOP Condition
```

### Standard Development

```text
Goal
Success Metric
Forbidden Proxy / Non-Goal
First Evidence Required / first wrong owner
In Scope / Out of Scope
Execution Partition / higher-context residue
Proof Required
STOP Condition
```

### Complex / Ambiguous Development

Use `.agents/skills/development-brief/SKILL.md`, then at most one semantic specialist.

## First-wrong-owner examples

```text
product rule wrong
→ docs/foundation

source violates correct rule
→ source owner

source correct, test stale
→ test owner

source/test correct, workflow wrong
→ CI owner

claim needs real mic/GPU/installer evidence
→ TARGET_WINDOWS proof owner
```

## Proof rule

One scenario proves one claim. Source/static proof is never upgraded to target-Windows proof. Run only the proof that can falsify the changed claim; stable promotion is the deliberate broader source gate.

## State routing

```text
what is active?       → next-action.md
what is proven?       → current-validation.md
who owns it?          → source-ownership.md
what must it do?      → docs/foundation/
why was it chosen?    → decisions/
what does it do now?  → source + matching proof
```
