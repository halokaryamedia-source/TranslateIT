from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]

ALLOWED_ROOT_FILES = {
    ".gitattributes",
    ".gitignore",
    "README.md",
    "TranslateIT.vbs",
}

ALLOWED_ROOT_SUFFIXES = {
    ".md",
    ".vbs",
    ".gitignore",
    ".gitattributes",
}

ALLOWED_ROOT_DIRS = {
    ".github",
    "DevelopingData",
    "EngineData",
    "Launcher",
    "UserData",
}

FORBIDDEN_ROOT_SUFFIXES = {
    ".py",
    ".bat",
    ".ps1",
    ".cmd",
    ".log",
    ".tmp",
    ".bak",
    ".old",
}

FORBIDDEN_ROOT_DIRS = {
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    "node_modules",
    "dist",
    "build",
    "target",
    "DeveloperData",
}


def main() -> int:
    problems: list[str] = []
    for item in sorted(ROOT.iterdir(), key=lambda path: path.name.lower()):
        if item.name == ".git":
            continue
        if item.is_dir():
            if item.name in FORBIDDEN_ROOT_DIRS:
                problems.append(f"forbidden root directory: {item.name}")
            elif item.name not in ALLOWED_ROOT_DIRS:
                problems.append(f"unexpected root directory: {item.name}")
            continue
        if item.suffix.lower() in FORBIDDEN_ROOT_SUFFIXES:
            problems.append(f"forbidden root file type: {item.name}")
            continue
        if item.name not in ALLOWED_ROOT_FILES and item.suffix.lower() not in ALLOWED_ROOT_SUFFIXES:
            problems.append(f"unexpected root file: {item.name}")

    if problems:
        print("ROOT_CLEANLINESS_INCOMPLETE")
        for problem in problems:
            print("-", problem)
        print("Move documentation and tooling into DevelopingData, runtime code into EngineData, user outputs into UserData, and keep root limited to the launcher plus repository docs.")
        return 1

    print("PASS: Repository root is clean: no root Python/scripts/cache/build artifacts, no separate DeveloperData tree, and only professional top-level folders/files are present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
