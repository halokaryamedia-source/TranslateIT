from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
WORKER_ROOT = ROOT / "EngineData" / "LauncherApp" / "Workers"
WORKER_SCRIPT = WORKER_ROOT / "realtime_local_worker.py"
REQUIREMENTS = WORKER_ROOT / "requirements-realtime.txt"
STACK_MANIFEST = WORKER_ROOT / "realtime_stack_manifest.json"

REQUIRED_WORKER_TERMS = [
    "faster-whisper-large-v3-turbo",
    "marianmt-id-en",
    "nllb-200-distilled-600M",
    "piper.exe",
    "transcribe",
    "translate",
    "synthesize",
]

REQUIRED_REQUIREMENTS = [
    "faster-whisper",
    "ctranslate2",
    "transformers",
    "sentencepiece",
]


def main() -> int:
    required_files = [WORKER_SCRIPT, REQUIREMENTS, STACK_MANIFEST]
    missing = [str(path.relative_to(ROOT)) for path in required_files if not path.exists()]
    if missing:
        print("LOCAL_REALTIME_WORKER_STACK_MISSING")
        for item in missing:
            print("-", item)
        return 1

    worker_text = WORKER_SCRIPT.read_text(encoding="utf-8")
    missing_worker_terms = [term for term in REQUIRED_WORKER_TERMS if term not in worker_text]
    if missing_worker_terms:
        print("LOCAL_REALTIME_WORKER_RUNTIME_TERMS_MISSING")
        for term in missing_worker_terms:
            print("-", term)
        return 1

    requirements_text = REQUIREMENTS.read_text(encoding="utf-8")
    missing_requirements = [term for term in REQUIRED_REQUIREMENTS if term not in requirements_text]
    if missing_requirements:
        print("LOCAL_REALTIME_WORKER_REQUIREMENTS_INCOMPLETE")
        for term in missing_requirements:
            print("-", term)
        return 1

    manifest = json.loads(STACK_MANIFEST.read_text(encoding="utf-8"))
    modes = manifest.get("modes", {})
    for mode in ("Realtime", "Quality"):
        if mode not in modes:
            print("LOCAL_REALTIME_STACK_MODE_MISSING")
            print("-", mode)
            return 1
        for stage in ("asr", "translation", "tts"):
            if stage not in modes[mode]:
                print("LOCAL_REALTIME_STACK_STAGE_MISSING")
                print("-", mode, stage)
                return 1

    if not manifest.get("truth_policy", {}).get("local_only"):
        print("LOCAL_REALTIME_STACK_TRUTH_POLICY_INCOMPLETE")
        return 1

    print("PASS: Local realtime worker stack files, commands, dependencies, modes, and truth policy are present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
