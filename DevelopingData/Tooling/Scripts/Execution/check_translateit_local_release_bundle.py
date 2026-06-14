from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOOLING = ROOT / "DevelopingData" / "Tooling" / "Scripts" / "Execution"

REQUIRED_FILES = [
    ROOT / "TranslateIT.vbs",
    ROOT / ".github" / "workflows" / "translateit-rustapp-internal-validation.yml",
    ROOT / "README.md",
    ROOT / "DevelopingData" / "README.md",
    ROOT / "DevelopingData" / "Documentation" / "Guides" / "Repository" / "GitHubSetupGuide.md",
    ROOT / "EngineData" / "README.md",
    ROOT / "EngineData" / "LauncherApp" / "RustApp" / "package.json",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "README.md",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "realtime_local_worker.py",
    TOOLING / "check_launcher_contract.py",
    TOOLING / "check_local_realtime_worker_stack.py",
    TOOLING / "check_local_runtime_models.py",
    TOOLING / "run_local_realtime_worker_smoke_tests.py",
    TOOLING / "summarize_translateit_readiness.py",
]

RETIRED_PATHS = [
    ROOT / "DeveloperData",
    ROOT / "DevelopingData" / "ToolKitData",
    ROOT / "DevelopingData" / "Diagnostics",
    ROOT / "DevelopingData" / "Docs",
    ROOT / "DevelopingData" / "LauncherHelpers",
    ROOT / "DevelopingData" / "SampleData",
    ROOT / "DevelopingData" / "Tests",
]

REQUIRED_TERMS = {
    ROOT / "README.md": ["DevelopingData/", "EngineData/", "TranslateIT.vbs"],
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "realtime_local_worker.py": ["asr_preload", "translate", "synthesize", "resolve_worker_path", "cuda_fallback"],
    ROOT / "EngineData" / "LauncherApp" / "RustApp" / "package.json": ["DevelopingData/Tooling/Scripts/Execution", "validate:full", "validate:worker"],
}


def main() -> int:
    problems: list[str] = []
    for path in REQUIRED_FILES:
        if not path.exists():
            problems.append(f"missing required file: {path.relative_to(ROOT)}")
    for path in RETIRED_PATHS:
        if path.exists():
            problems.append(f"retired path still exists: {path.relative_to(ROOT)}")
    for path, terms in REQUIRED_TERMS.items():
        if path.exists():
            text = path.read_text(encoding="utf-8")
            for term in terms:
                if term not in text:
                    problems.append(f"{path.relative_to(ROOT)} missing term: {term}")
    if problems:
        print("LOCAL_RELEASE_BUNDLE_CONTRACT_INCOMPLETE")
        for problem in problems:
            print("-", problem)
        return 1
    print("PASS: TranslateIT release bundle uses consolidated DevelopingData documentation/tooling and single-route EngineData runtime")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
