from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
WORKER_ROOT = ROOT / "EngineData" / "LauncherApp" / "Workers"
WORKER_SCRIPT = WORKER_ROOT / "realtime_local_worker.py"
REQUIREMENTS = WORKER_ROOT / "requirements-realtime.txt"
STACK_MANIFEST = WORKER_ROOT / "realtime_stack_manifest.json"
SETUP_SCRIPT = WORKER_ROOT / "setup_realtime_worker.ps1"
SMOKE_LAUNCHER = WORKER_ROOT / "run_realtime_worker_smoke.ps1"
SMOKE_SCRIPT = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "run_local_realtime_worker_smoke_tests.py"
MODEL_CHECK_SCRIPT = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "check_local_runtime_models.py"

REQUIRED_WORKER_TERMS = [
    "faster-whisper-large-v3-turbo",
    "marianmt-id-en",
    "nllb-200-distilled-600M",
    "piper.exe",
    "torch_cuda_available",
    "translation_device",
    "move_inputs_to_device",
    "nllb_generate_kwargs",
    "transcribe",
    "translate",
    "synthesize",
]

REQUIRED_REQUIREMENTS = [
    "faster-whisper",
    "ctranslate2",
    "transformers",
    "torch",
    "sentencepiece",
]

REQUIRED_SETUP_TERMS = [
    "requirements-realtime.txt",
    "realtime_local_worker.py",
    "check_local_runtime_models.py",
    "python -m venv",
    "pip install",
]

REQUIRED_SMOKE_TERMS = [
    "PersistentWorker",
    "persistent_worker",
    "latency_summary",
    "latest_local_worker_smoke_evidence.json",
    "asr_transcript_smoke",
    "translation_smoke",
    "tts_synthesis_smoke",
]

REQUIRED_WORKER_COMMANDS = [
    "status",
    "asr_preload",
    "transcribe",
    "translation_preload",
    "translate",
    "tts_preflight",
    "synthesize",
]

REQUIRED_MODEL_CHECK_TERMS = [
    "asr_faster_whisper_large_v3_turbo",
    "translation_marianmt_id_en",
    "translation_nllb_200_distilled_600m",
    "voice_piper",
]


def require_terms(label: str, text: str, terms: list[str]) -> int:
    missing = [term for term in terms if term not in text]
    if missing:
        print(label)
        for term in missing:
            print("-", term)
        return 1
    return 0


def main() -> int:
    required_files = [WORKER_SCRIPT, REQUIREMENTS, STACK_MANIFEST, SETUP_SCRIPT, SMOKE_LAUNCHER, SMOKE_SCRIPT, MODEL_CHECK_SCRIPT]
    missing = [str(path.relative_to(ROOT)) for path in required_files if not path.exists()]
    if missing:
        print("LOCAL_REALTIME_WORKER_STACK_MISSING")
        for item in missing:
            print("-", item)
        return 1

    if require_terms("LOCAL_REALTIME_WORKER_RUNTIME_TERMS_MISSING", WORKER_SCRIPT.read_text(encoding="utf-8"), REQUIRED_WORKER_TERMS):
        return 1
    if require_terms("LOCAL_REALTIME_WORKER_REQUIREMENTS_INCOMPLETE", REQUIREMENTS.read_text(encoding="utf-8"), REQUIRED_REQUIREMENTS):
        return 1
    if require_terms("LOCAL_REALTIME_WORKER_SETUP_INCOMPLETE", SETUP_SCRIPT.read_text(encoding="utf-8"), REQUIRED_SETUP_TERMS):
        return 1
    if require_terms("LOCAL_RUNTIME_MODEL_CHECK_INCOMPLETE", MODEL_CHECK_SCRIPT.read_text(encoding="utf-8"), REQUIRED_MODEL_CHECK_TERMS):
        return 1
    smoke_text = SMOKE_SCRIPT.read_text(encoding="utf-8") + "\n" + SMOKE_LAUNCHER.read_text(encoding="utf-8")
    if require_terms("LOCAL_REALTIME_WORKER_SMOKE_INCOMPLETE", smoke_text, REQUIRED_SMOKE_TERMS):
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
        budget = modes[mode].get("latency_budget_ms", {})
        for budget_key in ("vad_chunk", "asr", "translation", "tts"):
            if not isinstance(budget.get(budget_key), int):
                print("LOCAL_REALTIME_STACK_LATENCY_BUDGET_MISSING")
                print("-", mode, budget_key)
                return 1

    worker_commands = manifest.get("worker_commands", {})
    for command in REQUIRED_WORKER_COMMANDS:
        if command not in worker_commands:
            print("LOCAL_REALTIME_STACK_WORKER_COMMAND_MISSING")
            print("-", command)
            return 1

    if not manifest.get("truth_policy", {}).get("local_only"):
        print("LOCAL_REALTIME_STACK_TRUTH_POLICY_INCOMPLETE")
        return 1

    print("PASS: Local realtime worker stack files, setup script, model checker, persistent smoke scripts, GPU-aware translation worker, latency budgets, commands, dependencies, modes, and truth policy are present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
