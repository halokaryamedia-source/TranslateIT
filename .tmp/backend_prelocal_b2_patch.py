from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKER_ROOT = ROOT / "EngineData" / "Backend" / "LocalWorker" / "WorkerRuntime"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, body: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body, encoding="utf-8", newline="\n")


def replace_once(body: str, old: str, new: str, label: str) -> str:
    count = body.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return body.replace(old, new, 1)


def regex_once(body: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, body, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return updated


# Canonical Windows developer/runtime matrix.
pyproject_path = "EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml"
pyproject = read(pyproject_path)
pyproject = replace_once(
    pyproject,
    'requires-python = ">=3.10"',
    'requires-python = ">=3.12,<3.13"',
    "Python minor baseline",
)
pyproject = replace_once(
    pyproject,
    '    "ctranslate2>=4.4.0",',
    '    "ctranslate2==4.8.1",',
    "CTranslate2 pin",
)
pyproject = replace_once(
    pyproject,
    '    "torch",',
    '    "torch==2.13.0",',
    "PyTorch pin",
)
source_block = '''\n[tool.uv.sources]\ntorch = [\n    { index = "pytorch-cu126", marker = "sys_platform == 'win32' or sys_platform == 'linux'" },\n]\n\n[[tool.uv.index]]\nname = "pytorch-cu126"\nurl = "https://download.pytorch.org/whl/cu126"\nexplicit = true\n'''
pyproject = replace_once(
    pyproject,
    '\n[dependency-groups]\n',
    source_block + '\n[dependency-groups]\n',
    "PyTorch CUDA index ownership",
)
write(pyproject_path, pyproject)
write("EngineData/Backend/LocalWorker/WorkerRuntime/.python-version", "3.12.10\n")

# Narrow capability probing: an unavailable GPU is degradable, a broken probe is not.
worker_path = "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"
worker = read(worker_path)
worker = regex_once(
    worker,
    r'def torch_status\(\) -> tuple\[bool, bool\]:.*?\ndef normalize_language\(value: Any, fallback: str\) -> str:',
    '''def torch_status() -> dict[str, Any]:\n    try:\n        import torch\n    except Exception as exc:\n        return {\n            "import_ready": False,\n            "cuda_probe_ok": False,\n            "cuda_available": False,\n            "blocker": f"dependency:torch_import_failed:{type(exc).__name__}",\n        }\n\n    try:\n        cuda_available = bool(torch.cuda.is_available())\n    except Exception as exc:\n        return {\n            "import_ready": True,\n            "cuda_probe_ok": False,\n            "cuda_available": False,\n            "blocker": f"cuda:torch_probe_failed:{type(exc).__name__}",\n        }\n    return {\n        "import_ready": True,\n        "cuda_probe_ok": True,\n        "cuda_available": cuda_available,\n        "blocker": "",\n    }\n\n\ndef ctranslate2_status() -> dict[str, Any]:\n    try:\n        import ctranslate2\n    except Exception as exc:\n        return {\n            "import_ready": False,\n            "cuda_probe_ok": False,\n            "cuda_available": False,\n            "blocker": f"dependency:ctranslate2_import_failed:{type(exc).__name__}",\n        }\n\n    probe = getattr(ctranslate2, "get_cuda_device_count", None)\n    if not callable(probe):\n        return {\n            "import_ready": True,\n            "cuda_probe_ok": False,\n            "cuda_available": False,\n            "blocker": "cuda:ctranslate2_probe_unavailable",\n        }\n    try:\n        cuda_available = int(probe()) > 0\n    except Exception as exc:\n        return {\n            "import_ready": True,\n            "cuda_probe_ok": False,\n            "cuda_available": False,\n            "blocker": f"cuda:ctranslate2_probe_failed:{type(exc).__name__}",\n        }\n    return {\n        "import_ready": True,\n        "cuda_probe_ok": True,\n        "cuda_available": cuda_available,\n        "blocker": "",\n    }\n\n\ndef nvidia_smi_available(payload: dict[str, Any] | None = None) -> bool:\n    try:\n        completed = subprocess.run(\n            ["nvidia-smi", "-L"],\n            text=True,\n            capture_output=True,\n            timeout=bounded_subprocess_timeout_seconds(\n                payload, GPU_PROBE_TIMEOUT_SECONDS\n            ),\n            check=False,\n        )\n        return completed.returncode == 0 and bool(completed.stdout.strip())\n    except Exception:\n        return False\n\n\ndef probe_gpu_runtime(payload: dict[str, Any] | None = None) -> dict[str, Any]:\n    torch_probe = torch_status()\n    ctranslate2_probe = ctranslate2_status()\n    torch_ready = bool(torch_probe["import_ready"])\n    torch_probe_ok = bool(torch_probe["cuda_probe_ok"])\n    torch_cuda_available = bool(torch_probe["cuda_available"])\n    ctranslate2_ready = bool(ctranslate2_probe["import_ready"])\n    ctranslate2_probe_ok = bool(ctranslate2_probe["cuda_probe_ok"])\n    ctranslate2_cuda_available = bool(ctranslate2_probe["cuda_available"])\n\n    cuda_capability_known = (\n        torch_ready\n        and torch_probe_ok\n        and ctranslate2_ready\n        and ctranslate2_probe_ok\n    )\n    cpu_fallback_active = cuda_capability_known and (\n        not torch_cuda_available or not ctranslate2_cuda_available\n    )\n\n    if ctranslate2_ready and ctranslate2_probe_ok:\n        selected_device = "cuda" if ctranslate2_cuda_available else "cpu"\n        selected_compute_type = "int8_float16" if ctranslate2_cuda_available else "int8"\n    else:\n        selected_device = "blocked"\n        selected_compute_type = "blocked"\n\n    if torch_ready and torch_probe_ok:\n        selected_translation_device = "cuda" if torch_cuda_available else "cpu"\n    else:\n        selected_translation_device = "blocked"\n\n    probe_blockers = [\n        blocker\n        for blocker in (torch_probe["blocker"], ctranslate2_probe["blocker"])\n        if blocker\n    ]\n\n    return {\n        "torch_import_ready": torch_ready,\n        "torch_cuda_probe_ok": torch_probe_ok,\n        "torch_cuda_available": torch_cuda_available,\n        "torch_cuda_probe_blocker": str(torch_probe["blocker"]),\n        "ctranslate2_import_ready": ctranslate2_ready,\n        "ctranslate2_cuda_probe_ok": ctranslate2_probe_ok,\n        "ctranslate2_cuda_available": ctranslate2_cuda_available,\n        "ctranslate2_cuda_probe_blocker": str(ctranslate2_probe["blocker"]),\n        "cuda_capability_known": cuda_capability_known,\n        "cpu_fallback_active": cpu_fallback_active,\n        "cuda_probe_blocker": ";".join(probe_blockers),\n        "nvidia_smi_available": nvidia_smi_available(payload),\n        "cuda_primary_requested": True,\n        "selected_device": selected_device,\n        "selected_translation_device": selected_translation_device,\n        "selected_compute_type": selected_compute_type,\n        "fallback_reason": "cuda_unavailable" if cpu_fallback_active else "",\n    }\n\n\ndef normalize_language(value: Any, fallback: str) -> str:''',
    "CUDA probe truth owner",
)

worker = replace_once(
    worker,
    '''    torch_ready = bool(gpu_runtime["torch_import_ready"])\n    cuda_available = bool(gpu_runtime["torch_cuda_available"])\n    ctranslate2_cuda_available = bool(gpu_runtime["ctranslate2_cuda_available"])\n''',
    '''    torch_ready = bool(gpu_runtime["torch_import_ready"])\n    torch_cuda_probe_ok = bool(gpu_runtime["torch_cuda_probe_ok"])\n    cuda_available = bool(gpu_runtime["torch_cuda_available"])\n    ctranslate2_ready = bool(gpu_runtime["ctranslate2_import_ready"])\n    ctranslate2_cuda_probe_ok = bool(gpu_runtime["ctranslate2_cuda_probe_ok"])\n    ctranslate2_cuda_available = bool(gpu_runtime["ctranslate2_cuda_available"])\n    cuda_capability_known = bool(gpu_runtime["cuda_capability_known"])\n    cpu_fallback_active = bool(gpu_runtime["cpu_fallback_active"])\n''',
    "status CUDA probe variables",
)
worker = replace_once(
    worker,
    '''    if not torch_ready:\n        blockers.append("dependency:torch_missing")\n    if not asr_active_ready:\n''',
    '''    if not torch_ready:\n        blockers.append("dependency:torch_missing")\n    if not ctranslate2_ready:\n        blockers.append("dependency:ctranslate2_missing")\n    if torch_ready and not torch_cuda_probe_ok:\n        blockers.append(str(gpu_runtime["torch_cuda_probe_blocker"]))\n    if ctranslate2_ready and not ctranslate2_cuda_probe_ok:\n        blockers.append(str(gpu_runtime["ctranslate2_cuda_probe_blocker"]))\n    if not asr_active_ready:\n''',
    "status CUDA probe blockers",
)
worker = replace_once(
    worker,
    '''    if not cuda_available or not ctranslate2_cuda_available:\n        warnings.append("cuda_unavailable_cpu_fallback_active")\n''',
    '''    if cpu_fallback_active:\n        warnings.append("cuda_unavailable_cpu_fallback_active")\n''',
    "status CPU fallback warning",
)
worker = replace_once(
    worker,
    '''        faster_whisper_ready\n        and torch_ready\n        and transformers_ready\n''',
    '''        faster_whisper_ready\n        and torch_ready\n        and ctranslate2_ready\n        and torch_cuda_probe_ok\n        and ctranslate2_cuda_probe_ok\n        and transformers_ready\n''',
    "provider readiness CUDA truth",
)
worker = replace_once(
    worker,
    '''    if not cuda_available or not ctranslate2_cuda_available:\n        note += " CUDA is not fully available; CPU fallback is explicit degraded operation."\n''',
    '''    if cpu_fallback_active:\n        note += " CUDA capability is unavailable; CPU fallback is explicit degraded operation."\n    elif not cuda_capability_known and (torch_ready or ctranslate2_ready):\n        note += " CUDA capability probing failed; CPU fallback was not activated."\n''',
    "status CUDA note",
)
worker = replace_once(
    worker,
    '''            "cuda_degraded": not cuda_available or not ctranslate2_cuda_available,\n''',
    '''            "cuda_degraded": cpu_fallback_active,\n''',
    "canonical cuda_degraded semantics",
)
worker = replace_once(
    worker,
    '''        "fallback_reason": str(gpu_runtime["fallback_reason"]),\n        "loaded": {\n''',
    '''        "fallback_reason": str(gpu_runtime["fallback_reason"]),\n        "cuda_capability_known": cuda_capability_known,\n        "cpu_fallback_active": cpu_fallback_active,\n        "cuda_probe_blocker": str(gpu_runtime["cuda_probe_blocker"]),\n        "loaded": {\n''',
    "status CUDA truth fields",
)
worker = replace_once(
    worker,
    '''    if "cuda" in joined:\n        actions.append("CUDA is optional; CPU fallback remains explicit degraded operation.")\n''',
    '''    if "cuda_unavailable" in joined:\n        actions.append("CUDA is optional; known unavailability uses explicit CPU degraded operation.")\n    if "cuda:" in joined:\n        actions.append("Repair the locked CUDA runtime/probe failure; do not mask it with CPU fallback.")\n''',
    "status CUDA actions",
)

worker = regex_once(
    worker,
    r'def asr_runtime_config\(payload: dict\[str, Any\] \| None = None\) -> tuple\[str, str, str\]:.*?\n\ndef failed_from_status\(',
    '''def asr_runtime_config(payload: dict[str, Any] | None = None) -> tuple[str, str, str]:\n    gpu_runtime = probe_gpu_runtime(payload)\n    selected_device = str(gpu_runtime["selected_device"])\n    if selected_device == "blocked":\n        blocker = str(gpu_runtime["cuda_probe_blocker"] or "cuda:ctranslate2_capability_unknown")\n        raise RuntimeError(blocker)\n    if selected_device == "cuda":\n        return "cuda", "int8_float16", ""\n    return "cpu", "int8", str(gpu_runtime["fallback_reason"])\n\n\ndef get_asr_runtime(payload: dict[str, Any] | None = None) -> Any:\n    global ASR_RUNTIME, ASR_RUNTIME_DEVICE, ASR_RUNTIME_COMPUTE, ASR_RUNTIME_MODEL_ID\n    if ASR_RUNTIME is not None:\n        return ASR_RUNTIME\n    from faster_whisper import WhisperModel\n\n    device, compute_type, _fallback_reason = asr_runtime_config(payload)\n    model_id, model_path = choose_asr_model()\n    ASR_RUNTIME = WhisperModel(str(model_path), device=device, compute_type=compute_type)\n    ASR_RUNTIME_DEVICE = device\n    ASR_RUNTIME_COMPUTE = compute_type\n    ASR_RUNTIME_MODEL_ID = model_id\n    return ASR_RUNTIME\n\n\ndef failed_from_status(''',
    "ASR fallback boundary",
)

worker = regex_once(
    worker,
    r'def translation_device\(\) -> str:.*?\n\ndef handle_translation_preload\(',
    '''def translation_runtime_config() -> tuple[str, str]:\n    probe = torch_status()\n    if not probe["import_ready"]:\n        raise RuntimeError(str(probe["blocker"] or "dependency:torch_missing"))\n    if not probe["cuda_probe_ok"]:\n        raise RuntimeError(str(probe["blocker"] or "cuda:torch_capability_unknown"))\n    if probe["cuda_available"]:\n        return "cuda", ""\n    return "cpu", "torch_cuda_unavailable"\n\n\ndef get_translation_runtime(source_language: str, target_language: str) -> dict[str, Any]:\n    pair = direction_pair(source_language, target_language)\n    selected = translation_model_for_direction(source_language, target_language)\n    if selected is None:\n        raise ValueError("translation:direction_not_supported")\n    if pair in TRANSLATION_RUNTIME:\n        return TRANSLATION_RUNTIME[pair]\n\n    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer\n\n    model_id, model_path = selected\n    device, fallback_reason = translation_runtime_config()\n    device_note = "cuda_available" if device == "cuda" else "cpu_runtime"\n    degraded = device != "cuda"\n    tokenizer = AutoTokenizer.from_pretrained(str(model_path), local_files_only=True)\n    model = AutoModelForSeq2SeqLM.from_pretrained(str(model_path), local_files_only=True)\n    if device == "cuda":\n        model = model.to("cuda")\n    model.eval()\n    runtime = {\n        "direction_pair": pair,\n        "model_id": model_id,\n        "model_path": str(model_path),\n        "tokenizer": tokenizer,\n        "model": model,\n        "device": device,\n        "device_note": device_note,\n        "translation_gpu_requested": True,\n        "translation_torch_cuda_available": device == "cuda",\n        "translation_degraded": degraded,\n        "translation_fallback_reason": fallback_reason,\n    }\n    TRANSLATION_RUNTIME[pair] = runtime\n    return runtime\n\n\ndef handle_translation_preload(''',
    "translation fallback boundary",
)
write(worker_path, worker)

# Developer setup follows the same exact Python baseline requested by .python-version.
setup_path = "EngineData/Backend/LocalWorker/WorkerRuntime/setup_realtime_worker.ps1"
setup = read(setup_path)
setup = replace_once(
    setup,
    '$LockFile = Join-Path $WorkerRoot "uv.lock"\n$Worker = Join-Path $WorkerRoot "realtime_local_worker.py"',
    '$LockFile = Join-Path $WorkerRoot "uv.lock"\n$PythonVersionFile = Join-Path $WorkerRoot ".python-version"\n$Worker = Join-Path $WorkerRoot "realtime_local_worker.py"',
    "setup Python pin path",
)
setup = replace_once(
    setup,
    '''if (-not (Test-Path $LockFile)) {\n    throw "Missing canonical WorkerRuntime uv.lock: $LockFile. Restore the repository lock instead of resolving an unreviewed environment locally."\n}\n\nPush-Location $WorkerRoot\n''',
    '''if (-not (Test-Path $LockFile)) {\n    throw "Missing canonical WorkerRuntime uv.lock: $LockFile. Restore the repository lock instead of resolving an unreviewed environment locally."\n}\nif (-not (Test-Path $PythonVersionFile)) {\n    throw "Missing canonical WorkerRuntime Python pin: $PythonVersionFile."\n}\n$PinnedPython = (Get-Content $PythonVersionFile -Raw).Trim()\nif ([string]::IsNullOrWhiteSpace($PinnedPython)) {\n    throw "WorkerRuntime Python pin is empty."\n}\nWrite-Host "Pinned developer Python: $PinnedPython"\n\nPush-Location $WorkerRoot\n''',
    "setup Python pin verification",
)
setup = replace_once(
    setup,
    '''    Write-Host "Checking worker dependency/model capability status"\n    '{"command":"status"}' | uv run --frozen --no-dev python $Worker\n''',
    '''    $ResolvedPython = (uv run --frozen --no-dev python -c "import platform; print(platform.python_version())").Trim()\n    if ($LASTEXITCODE -ne 0 -or $ResolvedPython -ne $PinnedPython) {\n        throw "WorkerRuntime Python mismatch. Expected $PinnedPython, got $ResolvedPython."\n    }\n\n    Write-Host "Checking worker dependency/model capability status"\n    '{"command":"status"}' | uv run --frozen --no-dev python $Worker\n''',
    "setup resolved Python proof",
)
write(setup_path, setup)

# Update deterministic tests for new probe contract and fail-closed CUDA load behavior.
tests_path = "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_worker_contract.py"
tests = read(tests_path)
tests = replace_once(tests, "import sys\n", "import sys\nimport types\n", "tests types import")
tests = replace_once(
    tests,
    '''            "torch_cuda_available": True,\n            "ctranslate2_import_ready": True,\n            "ctranslate2_cuda_available": True,\n            "nvidia_smi_available": True,\n            "cuda_primary_requested": True,\n            "selected_device": "cuda",\n            "selected_translation_device": "cuda",\n            "selected_compute_type": "int8_float16",\n            "fallback_reason": "",\n''',
    '''            "torch_cuda_probe_ok": True,\n            "torch_cuda_available": True,\n            "torch_cuda_probe_blocker": "",\n            "ctranslate2_import_ready": True,\n            "ctranslate2_cuda_probe_ok": True,\n            "ctranslate2_cuda_available": True,\n            "ctranslate2_cuda_probe_blocker": "",\n            "cuda_capability_known": True,\n            "cpu_fallback_active": False,\n            "cuda_probe_blocker": "",\n            "nvidia_smi_available": True,\n            "cuda_primary_requested": True,\n            "selected_device": "cuda",\n            "selected_translation_device": "cuda",\n            "selected_compute_type": "int8_float16",\n            "fallback_reason": "",\n''',
    "status test GPU fixture",
)
new_tests = r'''


def test_gpu_probe_uses_cpu_only_for_known_unavailable_capability(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(
        worker,
        "torch_status",
        lambda: {
            "import_ready": True,
            "cuda_probe_ok": True,
            "cuda_available": False,
            "blocker": "",
        },
    )
    monkeypatch.setattr(
        worker,
        "ctranslate2_status",
        lambda: {
            "import_ready": True,
            "cuda_probe_ok": True,
            "cuda_available": False,
            "blocker": "",
        },
    )
    monkeypatch.setattr(worker, "nvidia_smi_available", lambda _payload=None: False)

    gpu = worker.probe_gpu_runtime({})

    assert gpu["cuda_capability_known"] is True
    assert gpu["cpu_fallback_active"] is True
    assert gpu["selected_device"] == "cpu"
    assert gpu["selected_translation_device"] == "cpu"
    assert gpu["selected_compute_type"] == "int8"
    assert gpu["fallback_reason"] == "cuda_unavailable"
    assert gpu["cuda_probe_blocker"] == ""


def test_gpu_probe_failure_does_not_activate_cpu_fallback(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(
        worker,
        "torch_status",
        lambda: {
            "import_ready": True,
            "cuda_probe_ok": True,
            "cuda_available": False,
            "blocker": "",
        },
    )
    monkeypatch.setattr(
        worker,
        "ctranslate2_status",
        lambda: {
            "import_ready": True,
            "cuda_probe_ok": False,
            "cuda_available": False,
            "blocker": "cuda:ctranslate2_probe_failed:RuntimeError",
        },
    )
    monkeypatch.setattr(worker, "nvidia_smi_available", lambda _payload=None: False)

    gpu = worker.probe_gpu_runtime({})

    assert gpu["cuda_capability_known"] is False
    assert gpu["cpu_fallback_active"] is False
    assert gpu["selected_device"] == "blocked"
    assert gpu["fallback_reason"] == ""
    assert gpu["cuda_probe_blocker"] == "cuda:ctranslate2_probe_failed:RuntimeError"


def test_asr_cuda_load_failure_is_not_retried_on_cpu(monkeypatch) -> None:
    worker = load_worker_module()
    calls: list[tuple[str, str]] = []

    class FakeWhisperModel:
        def __init__(self, _path: str, *, device: str, compute_type: str) -> None:
            calls.append((device, compute_type))
            raise RuntimeError("cuda model load failed")

    monkeypatch.setitem(
        sys.modules,
        "faster_whisper",
        types.SimpleNamespace(WhisperModel=FakeWhisperModel),
    )
    monkeypatch.setattr(
        worker,
        "asr_runtime_config",
        lambda _payload=None: ("cuda", "int8_float16", ""),
    )
    worker.ASR_RUNTIME = None

    with pytest.raises(RuntimeError, match="cuda model load failed"):
        worker.get_asr_runtime({})

    assert calls == [("cuda", "int8_float16")]
    assert worker.ASR_RUNTIME is None


def test_translation_cuda_move_failure_is_not_retried_on_cpu(monkeypatch) -> None:
    worker = load_worker_module()
    move_calls: list[str] = []

    class FakeTokenizer:
        @classmethod
        def from_pretrained(cls, _path: str, *, local_files_only: bool):
            assert local_files_only is True
            return cls()

    class FakeModel:
        @classmethod
        def from_pretrained(cls, _path: str, *, local_files_only: bool):
            assert local_files_only is True
            return cls()

        def to(self, device: str):
            move_calls.append(device)
            raise RuntimeError("cuda model move failed")

        def eval(self) -> None:
            raise AssertionError("eval should not be reached after CUDA move failure")

    monkeypatch.setitem(
        sys.modules,
        "transformers",
        types.SimpleNamespace(
            AutoModelForSeq2SeqLM=FakeModel,
            AutoTokenizer=FakeTokenizer,
        ),
    )
    monkeypatch.setattr(worker, "translation_runtime_config", lambda: ("cuda", ""))
    worker.TRANSLATION_RUNTIME.clear()

    with pytest.raises(RuntimeError, match="cuda model move failed"):
        worker.get_translation_runtime("id", "en")

    assert move_calls == ["cuda"]
    assert worker.TRANSLATION_RUNTIME == {}
'''
tests = tests.rstrip() + new_tests + "\n"
write(tests_path, tests)

# Durable developer/runtime contract documentation.
readme_path = "EngineData/Backend/LocalWorker/WorkerRuntime/README.md"
readme = read(readme_path)
anchor = "`setup_realtime_worker.ps1` is a developer helper that uses `uv` and the canonical project. `uv` is developer/build tooling only; the installed TranslateIT product must not require the end user to install or operate `uv`.\n"
matrix = '''`setup_realtime_worker.ps1` is a developer helper that uses `uv` and the canonical project. `uv` is developer/build tooling only; the installed TranslateIT product must not require the end user to install or operate `uv`.\n\n### Windows CUDA matrix\n\nThe canonical pre-local Windows AI matrix is deliberately one environment, not separate CUDA and CPU projects:\n\n```text\nCPython developer baseline -> 3.12.10\nPyTorch                    -> 2.13.0+cu126 from the official PyTorch cu126 index\nCTranslate2                -> 4.8.1\nCUDA target                -> 12.6 / CUDA 12.x-compatible NVIDIA driver\n```\n\n`.python-version` pins the developer interpreter while `requires-python` keeps the project on Python 3.12. The CUDA-enabled PyTorch wheel is also the CPU degraded-path environment; TranslateIT does not maintain a second CPU dependency lock. CTranslate2 remains on its Windows x86-64 wheel with CUDA 12.x GPU support. Actual GPU execution still requires target-Windows proof.\n\nCPU fallback is selected only after the canonical CUDA probes successfully report that CUDA is unavailable. A CUDA probe failure, CUDA-selected ASR model-load failure, or CUDA-selected translation model-move failure remains a truthful blocker and is not retried on CPU.\n'''
readme = replace_once(readme, anchor, matrix, "README Windows CUDA matrix")
write(readme_path, readme)

# Durable decision reasoning.
decision_path = "docs/knowledge/decision-log.md"
decision = read(decision_path).rstrip()
if "## D-019 — One Windows CUDA Matrix And Capability-Only CPU Fallback" in decision:
    raise RuntimeError("D-019 already exists")
decision += '''\n\n## D-019 — One Windows CUDA Matrix And Capability-Only CPU Fallback\n\n**Decision**  \nThe current Windows WorkerRuntime development/runtime baseline is CPython 3.12.10 with PyTorch 2.13.0 from the official CUDA 12.6 wheel index and CTranslate2 4.8.1. The WorkerRuntime keeps one locked environment; CPU degraded execution uses that same environment rather than a second CPU dependency project or reinstall script.\n\nCUDA is preferred but optional. CPU fallback is chosen only when the canonical PyTorch/CTranslate2 CUDA probes complete successfully and report CUDA unavailable. If a CUDA probe itself fails, or CUDA was selected and ASR/model loading or translation device transfer then fails, TranslateIT preserves that failure as a blocker instead of retrying the same operation on CPU.\n\n**Reason**  \nThe previous floating Python/package baseline could resolve materially different Windows stacks over time, and broad exception fallback could convert dependency/model/config/runtime failures into apparently healthy CPU degradation. One reviewed matrix plus pre-load capability selection keeps dependency truth reproducible while preserving the approved CPU fallback only for known capability absence.\n\n**Proof status**  \nGitHub-hosted Windows proof may establish exact Python/package resolution, CUDA-enabled PyTorch wheel identity, CTranslate2 import/probe behavior on a no-GPU runner, deterministic CPU fallback selection, and fail-closed CUDA-load error handling. Real CUDA inference still requires a GPU-capable Windows target and is not implied by dependency/import proof.\n'''
write(decision_path, decision + "\n")

# Close B2 and advance exactly one canonical next step.
next_path = "docs/knowledge/next-action.md"
next_text = read(next_path)
old_tail = '''## Current Mode\n\n**Maintenance / Backend Pre-Local Readiness — B1 CLOSED.** Backend hardening A1-A7 remains closed. P2.3 CPU model execution remains proven and CUDA execution remains deferred. Continue the mapped pre-local readiness waves in order.\n\n## Next Step — Backend Pre-Local B2: Windows CUDA Dependency Truth\n\nChoose and lock one supported Windows Python/PyTorch/CTranslate2/CUDA execution matrix for the existing WorkerRuntime, pin the developer Python baseline used by proof/setup, and narrow CUDA-to-CPU fallback so only known CUDA capability conditions degrade to CPU while model/config/runtime failures remain truthful blockers. Do not mix runtime hot-path caching (B3), audio/VAD work, installer staging, or broad cleanup into B2.\n'''
new_tail = '''## Backend Pre-Local B2 — CLOSED\n\nWorkerRuntime now has one reviewed Windows CUDA matrix: CPython 3.12.10, PyTorch 2.13.0 from the official CUDA 12.6 wheel index, and CTranslate2 4.8.1. `.python-version` pins the developer interpreter, `requires-python` is constrained to Python 3.12, the canonical `uv.lock` resolves the selected PyTorch CUDA build, and developer setup verifies the resolved interpreter instead of accepting whichever Python happens to be first. CPU degraded operation uses this same locked environment; there is no parallel CPU lock or reinstall path.\n\nCUDA fallback is now capability-only. Successful PyTorch/CTranslate2 probes that report no CUDA select CPU before model load. A failed CUDA probe is a blocker, and once CUDA is selected an ASR model-load failure or translation `model.to("cuda")` failure is no longer caught and retried on CPU. This preserves model/config/runtime failures instead of disguising them as healthy degradation.\n\nRemote Windows/source proof for this slice passed:\n\n```text\nCPython 3.12.10 pin + frozen uv resolution -> PASS\nPyTorch 2.13.0+cu126 identity              -> PASS\nCTranslate2 4.8.1 identity/import          -> PASS\nhosted no-GPU capability probe             -> PASS: known unavailable -> CPU degraded\nWorkerRuntime deterministic tests           -> PASS\nRuff check + format check                   -> PASS\nsetup_realtime_worker.ps1 pinned env/status -> PASS\n```\n\nThis proves dependency resolution and fallback/error semantics on a Windows no-GPU runner. It does not prove CUDA kernels or model inference on a real NVIDIA GPU; that remains GPU-capable target-Windows proof. B3 hot-path work, VAD/audio changes, installer staging, and broad cleanup were not changed in B2.\n\n## Current Mode\n\n**Maintenance / Backend Pre-Local Readiness — B2 CLOSED.** Backend hardening A1-A7 and pre-local B1-B2 are source/proof closed. P2.3 CPU model execution remains proven; real CUDA execution remains deferred to a GPU-capable Windows target. Continue the mapped pre-local readiness waves in order.\n\n## Next Step — Backend Pre-Local B3: Runtime Hot-Path Efficiency\n\nMake active Meeting status polling cheap and side-effect-light: stop re-enumerating Windows devices and writing routine trace/evidence on every poll or utterance, keep optional incoming activation from delaying required outbound Start, and remove `nvidia-smi` subprocess work from routine worker status. Keep B3 limited to hot-path efficiency and targeted proof; do not mix lifecycle redesign (B4), proof-tool reconciliation (B5), VAD tuning, installer staging, or broad dead-code cleanup.\n'''
next_text = replace_once(next_text, old_tail, new_tail, "next-action B2 closure")
write(next_path, next_text)

print("Backend pre-local B2 patch staged")
