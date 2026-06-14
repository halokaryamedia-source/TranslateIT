from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MAIN_TS = ROOT / "EngineData" / "LauncherApp" / "RustApp" / "src" / "main.ts"
STYLES = ROOT / "EngineData" / "LauncherApp" / "RustApp" / "src" / "styles.css"

MAIN_TERMS = [
    "workerPill",
    "LocalWorkerManifestReport",
    "Realtime latency target",
    "Quality latency target",
    "ASR model ready",
    "Realtime translate model ready",
    "Quality translate model ready",
    "Piper ready",
    "get_runtime_status_bundle",
]

STYLE_TERMS = [
    "status-pills",
    "runtime-card",
    "developer-panel",
    "translator-card",
]


def require_terms(path: Path, terms: list[str], label: str) -> int:
    if not path.exists():
        print(f"{label}_MISSING")
        print(path.relative_to(ROOT))
        return 1
    text = path.read_text(encoding="utf-8")
    missing = [term for term in terms if term not in text]
    if missing:
        print(f"{label}_INCOMPLETE")
        for term in missing:
            print("-", term)
        return 1
    return 0


def main() -> int:
    failed = 0
    failed |= require_terms(MAIN_TS, MAIN_TERMS, "FRONTEND_RUNTIME_CONTRACT")
    failed |= require_terms(STYLES, STYLE_TERMS, "FRONTEND_RUNTIME_STYLE")
    if failed:
        return 1
    print("PASS: Frontend exposes runtime bundle, local worker readiness, model readiness, latency targets, and clean runtime panels")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
