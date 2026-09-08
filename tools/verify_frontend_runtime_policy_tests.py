from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = ROOT / "EngineData" / "Frontend" / "RustApp"
TEST_ROOT = APP_ROOT / "scripts" / "tests"
PACKAGE_PATH = APP_ROOT / "package.json"
CANONICAL_GLOB = 'scripts/tests/*.test.ts'


def main() -> int:
    package = json.loads(PACKAGE_PATH.read_text(encoding="utf-8"))
    command = str(package.get("scripts", {}).get("test:frontend-runtime", ""))
    tests = sorted(
        path.relative_to(APP_ROOT).as_posix()
        for path in TEST_ROOT.glob("*.test.ts")
        if path.is_file()
    )

    if not tests:
        print("FRONTEND POLICY TEST REGISTRATION FAILED")
        print("- no scripts/tests/*.test.ts files found")
        return 1

    uses_canonical_glob = CANONICAL_GLOB in command
    missing = [] if uses_canonical_glob else [test for test in tests if test not in command]
    if missing:
        print("FRONTEND POLICY TEST REGISTRATION FAILED")
        for test in missing:
            print(f"- unregistered frontend policy test: {test}")
        print(f"- prefer canonical auto-discovery glob: {CANONICAL_GLOB}")
        return 1

    print("FRONTEND POLICY TEST REGISTRATION PASSED")
    print(f"- discovered tests: {len(tests)}")
    print(f"- registration mode: {'canonical glob' if uses_canonical_glob else 'explicit list'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
