from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]

REQUIRED_PATHS = [
    ROOT / "DeveloperData" / "README.md",
    ROOT / "DeveloperData" / "Guides" / "Repository" / "README.md",
    ROOT / "DeveloperData" / "Guides" / "Repository" / "GitHubSetupGuide.md",
    ROOT / "DeveloperData" / "Templates" / "Repository" / "gitignore_template.txt",
    ROOT / "DeveloperData" / "Research" / "VoiceLab" / "README.md",
    ROOT / "DeveloperData" / "Research" / "VoiceLab" / "VoiceLabResearchBrief.md",
    ROOT / "DeveloperData" / "Research" / "VoiceLab" / "VoiceLabResearchNotes.md",
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
    ROOT / "DeveloperData" / "TechnicalDocumentation",
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

    helper_dir = ROOT / "DevelopingData" / "LauncherHelpers"
    if helper_dir.exists():
        for path in sorted(helper_dir.iterdir()):
            if path.is_file() and path.suffix.lower() in {".bat", ".cmd", ".ps1", ".vbs"}:
                problems.append(f"old helper script remains: {path.relative_to(ROOT)}")

    if problems:
        print("ENGINE_DEVELOPER_STRUCTURE_INCOMPLETE")
        for problem in problems:
            print("-", problem)
        return 1

    print("PASS: DeveloperData and EngineData are modular, single-route, and free of old Python engine files except the approved local AI worker")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
