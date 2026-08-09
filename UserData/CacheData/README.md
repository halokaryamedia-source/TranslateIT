# CacheData

Disposable TranslateIT runtime working data belongs here.

Examples:

```text
temporary microphone/audio segments
temporary generated TTS audio
current-session working artifacts
temporary document-processing data
Audio Studio working/rejected material when applicable
```

Rules:

- contents must be safe to delete and regenerate;
- do not use this as permanent History/Saved storage;
- do not store developer/source-validation reports here;
- do not persist raw audio for debugging by default;
- cleanup/lifecycle must follow the owning runtime feature.
