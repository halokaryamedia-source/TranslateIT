from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
ALLOWED_ENGINE_PYTHON = {"EngineData/LauncherApp/Workers/realtime_local_worker.py"}
REQUIRED_PATHS = [
    ROOT / "DevelopingData" / "Documentation" / "Guides" / "Repository" / "GitHubSetupGuide.md",
    ROOT / "DevelopingData" / "Documentation" / "Templates" / "Repository" / "gitignore_template.txt",
    ROOT / "DevelopingData" / "Documentation" / "Research" / "VoiceLab" / "README.md",
    ROOT / "DevelopingData" / "Quality" / "Diagnostics" / "README.md",
    ROOT / "DevelopingData" / "Quality" / "Tests" / "README.md",
    ROOT / "DevelopingData" / "Samples" / "README.md",
    ROOT / "EngineData" / "LauncherApp" / "RustApp" / "package.json",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "realtime_local_worker.py",
]
RETIRED_PATHS = [ROOT / "DeveloperData", ROOT / "DevelopingData" / "ToolKitData", ROOT / "DevelopingData" / "Diagnostics", ROOT / "DevelopingData" / "Docs", ROOT / "DevelopingData" / "LauncherHelpers", ROOT / "DevelopingData" / "SampleData", ROOT / "DevelopingData" / "Tests"]


def main() -> int:
    problems: list[str] = []
    for path in REQUIRED_PATHS:
        if not path.exists():
            problems.append(f"missing: {path.relative_to(ROOT)}")
    for path in RETIRED_PATHS:
        if path.exists():
            problems.append(f"retired path exists: {path.relative_to(ROOT)}")
    for path in sorted((ROOT / "EngineData").rglob("*.py")):
        rel_path = path.relative_to(ROOT).as_posix()
        if rel_path not in ALLOWED_ENGINE_PYTHON:
            problems.append(f"unexpected EngineData Python file: {rel_path}")
    if problems:
        print("ENGINE_DEVELOPING_STRUCTURE_INCOMPLETE")
        for problem in problems:
            print("-", problem)
        return 1
    print("PASS: DevelopingData and EngineData structure is consolidated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
