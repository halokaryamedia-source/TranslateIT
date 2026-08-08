# Developing Flow

Root `AGENTS.md` and `.agents/skills/development-brief/SKILL.md` own the rules. This
file is the compact end-to-end Developing reference.

```text
User create/change request
        |
        v
development-brief
        |
        v
goal / suggested method / fixture / authority grounded
        |
        v
development needed?
        |
        +--> No
        |     -> No change required / redirect / Plan / Context Recovery
        |
        +--> Yes
              |
              v
        semantic owner proven
              |
              v
        specialist adds real domain value?
              |
              +--> No -> development-brief only
              |
              +--> Yes -> load ONE project specialist
              |
              v
        root-cause / edit gate
              |
              v
        minimum complete implementation
              |
              v
        minimum useful engineering proof
              |
              v
        Acceptance POV check
              |
              v
        criteria supported by actual proof?
              |
              +--> No, target proof unavailable
              |     -> Perlu pemeriksaan
              |
              +--> No, material decision/dependency blocks work
              |     -> Terhenti
              |
              +--> Yes
                    -> Selesai
              |
              v
        update changed canonical repository state
              |
              v
        exactly one Next step
              |
              v
             STOP
```

## Development Necessity Gate

```text
Current behavior already satisfies goal
-> No change required

Requirement unresolved
-> Plan / Context Recovery

Method unsupported
-> Redirect

Grounded change required
-> Develop
```

## Completion Gate

Before completion return to the original brief and verify:

- Goal;
- Expected output;
- Acceptance POV;
- 2-5 acceptance criteria;
- In scope / Out of scope;
- proof actually obtained;
- no unsupported claim or silent scope expansion.

`Implemented` is not automatically `Verified`.
