# TranslateIT Decision Register

Durable decisions store **why a current rule exists**. Current product law belongs in `docs/foundation/`; active status belongs in `next-action.md`; proof belongs in `current-validation.md`; historical detail belongs in Git history or `history-legacy.md`.

## Current decisions

### D-001 — Local working authority; main stable/default authority

`Local` owns active development. `main` owns stable repository history/default browsing and changes only by explicit stable promotion or another exact user-authorized stable mutation.

Reason: development and stable state need distinct, truthful roles without a nonexistent recovery branch acting as authority.

### D-002 — One desktop product and one canonical local worker

Keep one Tauri/Rust desktop application and one normal Python worker path for ASR, translation and voice inference. Parallel normal engines/fallback stacks require a new explicit product decision.

### D-003 — Reliable translation before feature breadth

Meeting/Text reliability, completeness, understandable translation and safe delivery outrank additional modes/workspaces/automation.

### D-004 — One Meeting lifecycle authority

The Rust Meeting session/runtime owner controls Ready → Starting → Live → Stopping → Ended, stale-work rejection and safe Stop/Close behavior.

### D-011 — Svelte 5 desktop architecture is current

The active frontend is Svelte 5 + Vite + TypeScript inside Tauri 2, with Tailwind CSS 4, semantic CSS tokens, selective Bits UI and Lucide Svelte. This is current architecture, not a pending migration.

### D-019 — CUDA preferred; capability failures remain truthful

Use validated acceleration when available. CPU/capability fallback handles named supported conditions only; unknown failures are not masked as healthy degradation.

### D-020 — My Voice is one trained GPT-SoVITS V2ProPlus upgrade

My Voice uses authorized guided recordings, held-out evaluation and explicit approval. Training is occasional; normal Meeting inference reuses the approved actor.

### D-021 — Standard VB-CABLE is the initial Meeting audio-provider direction

Provider delivery is a release boundary; detection/configuration/use remains Windows-audio runtime ownership.

### D-022 — Shared GitHub operating discipline

TranslateIT follows the same reusable governance discipline as PRD-Creator/BuildIT:

```text
PIN
→ EXECUTION CONTEXT
→ GitHub-first partition
→ READ MINIMUM
→ DIAGNOSE first wrong owner
→ TOOL + TRANSFER GATE
→ WRITE ONCE
→ VERIFY + FAILURE POLICY
→ STOP
```

Domain-specific proof contexts are `REMOTE_GITHUB | LOCAL_CODE | TARGET_WINDOWS`.

### D-023 — Offline Setup + colocated payload

Controlled distribution uses one user-facing Setup plus colocated payload files. Users do not manually operate Python/pip/core-model setup.

### D-033 — Asymmetric Meeting context

Outbound translation may use the last three committed own-voice translation pairs from the same session. Incoming meeting audio remains context-free.

### D-034 — Current product direction locks

- one canonical translation pipeline;
- no Realtime/Quality user modes;
- Text paste/type only; no document translation;
- Indonesian ↔ English only;
- full English UI;
- personal/owned-machine distribution;
- Built-in Male/Female Meeting voices available without training;
- My Voice optional after explicit approval.

### D-035 — Built-in voice source provenance

Built-in references are LibriSpeech/OpenSLR-derived CC-BY-4.0 material with exact source/utterance/hash metadata. They are **not** described as public-domain material.

### D-036 — First stable promotion may retire main-only legacy residue

Before the first `Local → main` stable promotion, `main` contained a historical RenderBridge self-audit workflow that did not exist in current `Local` and would otherwise survive the Git merge candidate. One exact user-authorized direct stable mutation retired that obsolete main-only workflow so the first promotion could be evaluated against the current governance contract rather than legacy CI residue.

This is a bootstrap exception, not the normal development model. After the bootstrap cleanup, product/governance state reaches `main` through explicit stable promotion; direct `main` mutations remain exceptional and require exact user authority under `GITHUB_RULES.md`.

Reason: merging `main` history back into `Local` solely to create a deletion record would pollute the working authority with retired stable-only CI history. Removing the exact obsolete stable residue preserves the intended `Local → main` boundary without weakening the verifier.

Proof boundary: this decision records repository-history/governance rationale only. It does not create product/runtime or target-Windows proof.

## Recording policy

Record a durable decision only when architecture/workflow/reasoning must survive sessions, multiple owners depend on it, a meaningful tradeoff exists, or an old method is explicitly superseded.

Minimum shape for substantial new entries:

```text
Context
Decision
Why
Tradeoffs / not chosen
Evidence / proof boundary
Follow-up owner
```

Do not create a decision entry for ordinary wording changes, straightforward bug fixes or generated artifacts.

## Historical register

`history-legacy.md` preserves the former monolithic decision log. It is historical evidence and may contain superseded branch/product language.
