# UserData

`UserData` is the runtime/user-data boundary. It is not source code, build input, project memory, or developer-validation storage.

```text
CacheData
-> disposable runtime working data

LogData
-> minimal/redacted operational diagnostics produced by the running product

SavedProject
-> explicit user-approved persistent content
```

## Rules

- Runtime may read/write these roots through canonical application paths.
- Repository/source validation must not use UserData as its output or source-of-truth location.
- Fresh installs start from empty runtime content; development-machine UserData is never a package input.
- Do not commit real conversations, transcripts, raw recordings, generated voice, personal data, runtime logs, or saved user content.
- Raw/TTS audio is temporary by default unless the user explicitly saves an allowed persistent artifact.
- Automatic History and explicit Saved are different product semantics; do not collapse them merely because both are persistent concepts.

Git keeps only the structural README placeholders. Actual runtime contents are ignored.
