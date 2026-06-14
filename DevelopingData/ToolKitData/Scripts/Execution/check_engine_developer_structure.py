from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]

REQUIRED_PATHS = [
    ROOT / "DevelopingData" / "README.md",
    ROOT / "DevelopingData" / "Documentation" / "Guides" / "Repository" / "README.md",
    ROOT / "DevelopingData" / "Documentation" / "Guides" / "Repository" / "GitHubSetupGuide.md",
    ROOT / "DevelopingData" / "Documentation" / "Templates" / "Repository" / "gitignore_template.txt",
    ROOT / "DevelopingData" / "Documentation" / "Research" / "VoiceLab" / "README.md",
    ROOT / "DevelopingData" / "Documentation" / "Research" / "VoiceLab" / "VoiceLabResearchBrief.md",
    ROOT / "DevelopingData" / "Documentation" / "Research" / "VoiceLab" / "VoiceLabResearchNotes.md",
    ROOT / "DevelopingData" / "Documentation" / "Orientation" / "README.md",
    ROOT / "DevelopingData" / "Quality" / "Diagnostics" / "README.md",
    ROOT / "DevelopingData" / "Quality" / "Tests" / "README.md",
    ROOT / "DevelopingData" / "Samples" / "README.md",
    ROOT / "EngineData" / "README.md",
    ROOT / "EngineData" / "LauncherApp" / "README.md",
    ROOT / "EngineData" / "LauncherApp" / "RustApp" / "package.json",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "README.md",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "realtime_local_worker.py",
    ROOT / "EngineData" / "TranscriptEngine" / "README.md",
    ROOT / "EngineData" / "TranslateEngine" / "README.md",
    ROOT / "EngineData" / "VoiceEngine" / "README.md",
]

RETIRED_PATHS = [
    ROOT / "DeveloperData",
    ROOT / "DevelopingData" / "Diagnostics",
    ROOT / "DevelopingData" / "Docs",
    ROOT / "DevelopingData" / "LauncherHelpers",
    ROOT / "DevelopingData" / "SampleData",
    ROOT / "DevelopingData" / "Tests",
    ROOT / "DevelopingData" / "LauncherHelpers" / "TranslateIt.bat",
    ROOT / "DevelopingData" / "LauncherHelpers" / "TranslateIT_Debug.bat",
    ROOT / "DevelopingData" / "LauncherHelpers" / "run_translateit_legacy_tts.bat",
    ROOT / "DevelopingData" / "LauncherHelpers" / "run_translateit_sapi_direct_async.bat",
    ROOT / "EngineData" / "TranslateEngine" / "tts_placeholder.py",
    ROOT / "EngineData" / "TranslateEngine" / "translation_engine.py",
    ROOT / "EngineData" / "TranslateEngine" / "translation_context.py",
    ROOT / "EngineData" / "TranslateEngine" / "voice_provider_selection.py",
]

ALLOWED_ENGINE_PYTHON = {
    "EngineData/LauncherApp/Workers/realtime_local_worker.py",
}


def main() -> int:
    problems: list[str] = []

    for path in REQUIRED_PATHS:
        if not path.exists():
            problems.append(f"required path missing: {path.relative_to(ROOT)}")

    for path in RETIRED_PATHS:
        if path.exists():
            problems.append(f"retired path still exists: {path.relative_to(ROOT)}")

    engine_root = ROOT / "EngineData"
    if engine_root.exists():
        for path in sorted(engine_root.rglob("*.py")):
            rel_path = path.relative_to(ROOT).as_posix()
            if rel_path not in ALLOWED_ENGINE_PYTHON:
                problems.append(f"unexpected EngineData Python file: {rel_path}")

    if problems:
        print("ENGINE_DEVELOPING_STRUCTURE_INCOMPLETE")
        for problem in problems:
            print("-", problem)
        return 1

    print("PASS: DevelopingData owns developer docs/tooling/quality/samples, DeveloperData and old ad hoc root folders are retired, and EngineData is single-route with Python limited to the approved local AI worker")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
