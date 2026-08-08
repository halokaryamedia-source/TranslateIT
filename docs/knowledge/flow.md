# TranslateIT Agent Flow

This is a routing reference. Root `AGENTS.md` owns the rules.

```text
User request
   |
   v
Boot repository memory
AGENTS -> CONTEXT -> next-action
   |
   v
Select real mode
   |
   +--> Context Recovery
   |      -> recover bounded current truth
   |
   +--> Plan
   |      -> resolve material method/ownership choice
   |
   +--> Developing
   |      -> development-brief
   |      -> optional max one semantic specialist
   |
   +--> Maintenance
          -> diagnose root cause
          -> optional max one semantic specialist
   |
   v
Current semantic owner / direct boundary
   |
   v
Root-cause and edit gate
   |
   v
Minimum complete change (or No change required)
   |
   v
Minimum useful proof
   |
   v
Acceptance POV
   |
   v
Selesai | Perlu pemeriksaan | Terhenti
   |
   v
Update only changed canonical repository owners
   |
   v
Exactly one Next step
   |
   v
STOP
```

## Guardrails

- Do not broad-scan when one relevant owner/source can resolve the next question.
- Do not silently transition Recovery/Plan/Maintenance into feature development.
- Do not stack project specialists.
- Do not lower acceptance criteria because the current execution channel lacks
  target proof.
- Do not continue into adjacent work after current acceptance is complete.
