# TranscriptEngine

## Purpose
- Hold microphone capture, calibration, VAD, segment building, ASR loading, and transcript quality filtering.

## Allowed files
- `README.md`
- Audio capture modules
- Calibration modules
- VAD modules
- Segment builder modules
- ASR loader and quality filter modules
- Transcript segment data structures
- `ModelData/` for local ASR model files required by runtime

## Must not be placed here
- UI layout files
- Translation engine files
- Translation model files
- Documentation files
- User cache or saved-session exports

## Naming rules
- Use English only.
- Keep module names specific to their audio or transcript responsibility.
- Keep the engine side free of UI code.

## Related documentation path
- `../../DevelopingData/DocumentationData/SourceDocument/MASTER_PROJECT_DOCUMENTATION.md`
