from __future__ import annotations

import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKER_ROOT = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime"
APP_ROOT = ROOT / "EngineData/Frontend/RustApp"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.replace("\r\n", "\n"), encoding="utf-8", newline="\n")


def replace_once(path: Path, old: str, new: str) -> None:
    body = read(path)
    if old not in body:
        raise RuntimeError(f"Expected marker missing in {path}: {old[:160]!r}")
    if body.count(old) != 1:
        raise RuntimeError(f"Expected exactly one marker in {path}: {old[:160]!r}")
    write(path, body.replace(old, new, 1))


def required_revision(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not re.fullmatch(r"[0-9a-f]{40}", value):
        raise RuntimeError(f"{name} must be a full 40-character lowercase Git revision, got {value!r}")
    return value


revisions = {
    "faster-whisper-large-v3-turbo": required_revision("HF_ASR_PRIMARY_REVISION"),
    "faster-whisper-medium": required_revision("HF_ASR_FALLBACK_REVISION"),
    "marianmt-id-en": required_revision("HF_ID_EN_REVISION"),
    "marianmt-en-id": required_revision("HF_EN_ID_REVISION"),
}

manifest_path = WORKER_ROOT / "model_manifest.json"
manifest = json.loads(read(manifest_path))
if manifest.get("schema") != "translateit.local_model_inventory.v2":
    raise RuntimeError("Unexpected model manifest schema before B5 patch")
models = manifest.get("models")
if not isinstance(models, list):
    raise RuntimeError("Model manifest models must be a list")
for model in models:
    model_id = model.get("model_id")
    if model_id in revisions:
        model["revision"] = revisions[model_id]
        repo_id = model.get("repo_id")
        model["download_url"] = f"https://huggingface.co/{repo_id}"
        if model_id.startswith("faster-whisper"):
            model["license"] = "mit"
        elif model_id.startswith("marianmt-"):
            model["license"] = "apache-2.0"
write(manifest_path, json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

pyproject = WORKER_ROOT / "pyproject.toml"
replace_once(
    pyproject,
    'dev = [\n    "pytest",\n    "ruff",\n]',
    'dev = [\n    "huggingface-hub",\n    "pytest",\n    "ruff",\n]',
)

prepare_assets = r'''from __future__ import annotations

import argparse
import json
import os
import re
import shutil
from pathlib import Path
from typing import Any

from huggingface_hub import snapshot_download

MANIFEST_PATH = Path(__file__).with_name("model_manifest.json")
PROJECT_ROOT = Path(__file__).resolve().parents[4]
RUNTIME_ASSETS_ROOT = (PROJECT_ROOT / "EngineData/Backend/RuntimeAssets").resolve()
FULL_REVISION = re.compile(r"^[0-9a-f]{40}$")


def load_manifest() -> dict[str, Any]:
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if data.get("schema") != "translateit.local_model_inventory.v2":
        raise RuntimeError("model_manifest.json has an unsupported schema")
    if data.get("inventory_scope") != "full_product_release_assets":
        raise RuntimeError("model_manifest.json has an unexpected inventory scope")
    models = data.get("models")
    if not isinstance(models, list) or not models:
        raise RuntimeError("model_manifest.json contains no model entries")
    return data


def resolve_target(expected_path: str) -> Path:
    raw = Path(expected_path)
    if raw.is_absolute():
        raise RuntimeError(f"Model expected_path must be repository-relative: {expected_path}")
    target = (PROJECT_ROOT / raw).resolve()
    try:
        target.relative_to(RUNTIME_ASSETS_ROOT)
    except ValueError as exc:
        raise RuntimeError(
            f"Model expected_path escapes the canonical RuntimeAssets root: {expected_path}"
        ) from exc
    return target


def validate_huggingface_model(model: dict[str, Any]) -> dict[str, Any]:
    model_id = str(model.get("model_id", "")).strip()
    repo_id = str(model.get("repo_id", "")).strip()
    revision = str(model.get("revision", "")).strip()
    expected_path = str(model.get("expected_path", "")).strip()
    if not model_id or not repo_id or not expected_path:
        raise RuntimeError(f"Incomplete Hugging Face model entry: {model_id or '<missing-id>'}")
    if model.get("install_method") != "huggingface_snapshot_download":
        raise RuntimeError(f"Unexpected install method for {model_id}")
    if not FULL_REVISION.fullmatch(revision):
        raise RuntimeError(f"{model_id} must pin a full Hugging Face commit revision")
    target = resolve_target(expected_path)
    return {
        "model_id": model_id,
        "repo_id": repo_id,
        "revision": revision,
        "required": bool(model.get("required")),
        "stage": str(model.get("stage", "")),
        "target": target,
    }


def build_plan(
    manifest: dict[str, Any],
    include_optional: bool = False,
    requested_ids: set[str] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    selected: list[dict[str, Any]] = []
    manual_required: list[dict[str, str]] = []
    seen_ids: set[str] = set()
    seen_targets: set[Path] = set()

    for raw in manifest["models"]:
        model_id = str(raw.get("model_id", "")).strip()
        if not model_id:
            raise RuntimeError("Model manifest contains an entry without model_id")
        if model_id in seen_ids:
            raise RuntimeError(f"Duplicate model_id in manifest: {model_id}")
        seen_ids.add(model_id)

        source_type = str(raw.get("source_type", "")).strip()
        if source_type == "huggingface":
            item = validate_huggingface_model(raw)
            target = item["target"]
            if target in seen_targets:
                raise RuntimeError(f"Duplicate model target in manifest: {target}")
            seen_targets.add(target)
            if requested_ids is not None:
                if model_id in requested_ids:
                    selected.append(item)
            elif item["required"] or include_optional:
                selected.append(item)
        elif bool(raw.get("required")):
            manual_required.append(
                {
                    "model_id": model_id,
                    "stage": str(raw.get("stage", "")),
                    "install_method": str(raw.get("install_method", "manual")),
                }
            )

    if requested_ids is not None:
        missing = requested_ids - seen_ids
        if missing:
            raise RuntimeError(f"Unknown model_id requested: {', '.join(sorted(missing))}")
        unsupported = requested_ids - {item["model_id"] for item in selected}
        if unsupported:
            raise RuntimeError(
                "Requested model is not Hugging Face-acquirable: " + ", ".join(sorted(unsupported))
            )

    if not selected:
        raise RuntimeError("No Hugging Face model assets selected")
    return selected, manual_required


def clean_huggingface_local_cache(directory: Path) -> None:
    cache = directory / ".cache" / "huggingface"
    if cache.exists():
        shutil.rmtree(cache)
    cache_parent = directory / ".cache"
    if cache_parent.exists() and not any(cache_parent.iterdir()):
        cache_parent.rmdir()


def replace_target_from_snapshot(item: dict[str, Any]) -> dict[str, Any]:
    target: Path = item["target"]
    target.parent.mkdir(parents=True, exist_ok=True)
    staging = target.parent / f".{target.name}.download-{os.getpid()}"
    backup = target.parent / f".{target.name}.previous-{os.getpid()}"
    shutil.rmtree(staging, ignore_errors=True)
    shutil.rmtree(backup, ignore_errors=True)

    try:
        snapshot_download(
            repo_id=item["repo_id"],
            revision=item["revision"],
            local_dir=staging,
        )
        clean_huggingface_local_cache(staging)
        files = [path for path in staging.rglob("*") if path.is_file()]
        if not files:
            raise RuntimeError(f"Downloaded snapshot for {item['model_id']} contains no files")

        had_previous = target.exists()
        if had_previous:
            target.replace(backup)
        try:
            staging.replace(target)
        except Exception:
            if had_previous and backup.exists() and not target.exists():
                backup.replace(target)
            raise
        shutil.rmtree(backup, ignore_errors=True)
        return {
            "model_id": item["model_id"],
            "repo_id": item["repo_id"],
            "revision": item["revision"],
            "file_count": len(files),
            "replaced_existing": had_previous,
        }
    finally:
        shutil.rmtree(staging, ignore_errors=True)
        shutil.rmtree(backup, ignore_errors=True)


def serializable_plan(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "model_id": item["model_id"],
            "repo_id": item["repo_id"],
            "revision": item["revision"],
            "required": item["required"],
            "stage": item["stage"],
            "expected_path": str(item["target"].relative_to(PROJECT_ROOT)).replace("\\", "/"),
        }
        for item in items
    ]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Acquire TranslateIT developer Hugging Face model assets from pinned manifest revisions."
    )
    parser.add_argument(
        "--include-optional",
        action="store_true",
        help="Also acquire optional Hugging Face entries such as the ASR fallback.",
    )
    parser.add_argument(
        "--model-id",
        action="append",
        default=[],
        help="Acquire only a specific manifest model_id. May be repeated.",
    )
    parser.add_argument(
        "--plan",
        action="store_true",
        help="Validate and print the pinned acquisition plan without downloading files.",
    )
    args = parser.parse_args()

    requested = set(args.model_id) if args.model_id else None
    manifest = load_manifest()
    selected, manual_required = build_plan(manifest, args.include_optional, requested)
    output: dict[str, Any] = {
        "schema": "translateit.developer_model_acquisition.v1",
        "manifest_schema": manifest["schema"],
        "plan_only": bool(args.plan),
        "selected": serializable_plan(selected),
        "manual_required_assets": manual_required,
        "downloads": [],
        "note": (
            "Pinned Hugging Face assets are acquired from model_manifest.json. Manual release assets "
            "such as Piper remain separate and are not fabricated by this developer downloader."
        ),
    }

    if not args.plan:
        output["downloads"] = [replace_target_from_snapshot(item) for item in selected]

    print(json.dumps(output, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''
write(WORKER_ROOT / "prepare_model_assets.py", prepare_assets)

asset_tests = r'''from __future__ import annotations

import importlib.util
from pathlib import Path


def load_module():
    path = Path(__file__).resolve().parents[1] / "prepare_model_assets.py"
    spec = importlib.util.spec_from_file_location("translateit_prepare_model_assets", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_required_huggingface_plan_is_revision_pinned_and_runtime_asset_scoped() -> None:
    module = load_module()
    manifest = module.load_manifest()
    selected, manual = module.build_plan(manifest)

    assert {item["model_id"] for item in selected} == {
        "faster-whisper-large-v3-turbo",
        "marianmt-id-en",
        "marianmt-en-id",
    }
    assert all(module.FULL_REVISION.fullmatch(item["revision"]) for item in selected)
    assert all(item["target"].is_relative_to(module.RUNTIME_ASSETS_ROOT) for item in selected)
    assert {item["model_id"] for item in manual} == {"piper"}


def test_optional_plan_adds_only_manifest_optional_huggingface_assets() -> None:
    module = load_module()
    selected, _manual = module.build_plan(module.load_manifest(), include_optional=True)
    assert {item["model_id"] for item in selected} == {
        "faster-whisper-large-v3-turbo",
        "faster-whisper-medium",
        "marianmt-id-en",
        "marianmt-en-id",
    }


def test_specific_model_selection_rejects_manual_asset() -> None:
    module = load_module()
    try:
        module.build_plan(module.load_manifest(), requested_ids={"piper"})
    except RuntimeError as exc:
        assert "not Hugging Face-acquirable" in str(exc)
    else:
        raise AssertionError("manual Piper asset must not be promoted to Hugging Face acquisition")
'''
write(WORKER_ROOT / "tests/test_prepare_model_assets.py", asset_tests)

smoke = r'''param(
    [string]$AudioPath = "",
    [string]$IdText = "halo apa kabar",
    [string]$EnText = "hello how are you",
    [string]$TtsText = "Hello.",
    [ValidateSet("Any", "Cuda", "CpuFallback")]
    [string]$ExpectedDevice = "Any",
    [ValidateRange(10, 600)]
    [int]$CommandTimeoutSeconds = 300
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$Worker = Join-Path $PSScriptRoot "realtime_local_worker.py"
$PythonExe = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$PythonVersionFile = Join-Path $PSScriptRoot ".python-version"
$EvidenceRoot = Join-Path $Root "UserData\LogData\RustAppValidation"
$EvidencePath = Join-Path $EvidenceRoot "latest_worker_smoke_result.json"

if (-not (Test-Path $Worker)) {
    throw "Missing realtime local worker: $Worker"
}
if (-not (Test-Path $PythonExe)) {
    throw "Canonical WorkerRuntime environment is missing. Run setup_realtime_worker.ps1 first."
}
if (-not (Test-Path $PythonVersionFile)) {
    throw "Canonical WorkerRuntime Python pin is missing: $PythonVersionFile"
}
$PinnedPython = (Get-Content $PythonVersionFile -Raw).Trim()
$ResolvedPython = (& $PythonExe -c "import platform; print(platform.python_version())").Trim()
if ($LASTEXITCODE -ne 0 -or $ResolvedPython -ne $PinnedPython) {
    throw "WorkerRuntime Python mismatch. Expected $PinnedPython, got $ResolvedPython. Run setup_realtime_worker.ps1."
}

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $PythonExe
$processInfo.Arguments = '"' + ($Worker -replace '"', '\"') + '"'
$processInfo.RedirectStandardInput = $true
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $processInfo
[void]$process.Start()
$process.StandardInput.AutoFlush = $true

function Stop-WorkerForFailure {
    if (-not $process.HasExited) {
        try { $process.Kill() } catch {}
        try { [void]$process.WaitForExit(5000) } catch {}
    }
}

function Read-WorkerStderrSafe {
    if (-not $process.HasExited) { return "" }
    try { return $process.StandardError.ReadToEnd().Trim() } catch { return "" }
}

function Invoke-WorkerJson {
    param([hashtable]$Payload)

    if ($process.HasExited) {
        throw "Persistent worker exited before command $($Payload.command); stderr=$(Read-WorkerStderrSafe)"
    }

    $json = $Payload | ConvertTo-Json -Compress -Depth 12
    $process.StandardInput.WriteLine($json)
    $readTask = $process.StandardOutput.ReadLineAsync()
    if (-not $readTask.Wait($CommandTimeoutSeconds * 1000)) {
        Stop-WorkerForFailure
        throw "Persistent worker timed out after $CommandTimeoutSeconds seconds for command $($Payload.command); stderr=$(Read-WorkerStderrSafe)"
    }
    $line = $readTask.Result
    if ([string]::IsNullOrWhiteSpace($line)) {
        Stop-WorkerForFailure
        throw "Persistent worker returned no response for command $($Payload.command); stderr=$(Read-WorkerStderrSafe)"
    }
    return $line | ConvertFrom-Json -ErrorAction Stop
}

function Get-StageSummary {
    param($Response)

    if ($null -eq $Response) { return $null }
    return [ordered]@{
        ok = [bool]$Response.ok
        stage = $Response.stage
        model_id = $Response.model_id
        source_language = $Response.source_language
        target_language = $Response.target_language
        direction_pair = $Response.direction_pair
        translation_contract = $Response.translation_contract
        device = $Response.device
        compute_type = $Response.compute_type
        selected_device = $Response.selected_device
        selected_translation_device = $Response.selected_translation_device
        cpu_fallback_active = $Response.cpu_fallback_active
        cuda_capability_known = $Response.cuda_capability_known
        fallback_reason = $Response.fallback_reason
        translation_degraded = $Response.translation_degraded
        translation_fallback_reason = $Response.translation_fallback_reason
        provider = $Response.provider
        voice_id = $Response.voice_id
        language_code = $Response.language_code
        complete = $Response.complete
        finished_with_eos = $Response.finished_with_eos
        generated_tokens = $Response.generated_tokens
        hit_token_ceiling = $Response.hit_token_ceiling
        blocker = $Response.blocker
        elapsed_ms = $Response.elapsed_ms
        readiness = $Response.readiness
        loaded = $Response.loaded
    }
}

function Test-TranslationResponse {
    param($Response, [string]$Direction)
    return [bool]$Response.ok `
        -and $Response.stage -eq "translate" `
        -and $Response.translation_contract -eq "canonical_bidirectional_id_en" `
        -and $Response.direction_pair -eq $Direction `
        -and [bool]$Response.complete `
        -and [bool]$Response.finished_with_eos `
        -and -not [string]::IsNullOrWhiteSpace([string]$Response.translated_text)
}

function Test-DeviceExpectation {
    param($Status, $AsrPreload, $IdEn, $EnId)

    if (-not [bool]$Status.cuda_capability_known) { return $false }
    if ($ExpectedDevice -eq "Any") {
        return $Status.selected_device -in @("cpu", "cuda") `
            -and $Status.selected_translation_device -in @("cpu", "cuda")
    }
    if ($ExpectedDevice -eq "Cuda") {
        return -not [bool]$Status.cpu_fallback_active `
            -and $Status.selected_device -eq "cuda" `
            -and $Status.selected_translation_device -eq "cuda" `
            -and $AsrPreload.device -eq "cuda" `
            -and $IdEn.device -eq "cuda" `
            -and $EnId.device -eq "cuda"
    }
    return [bool]$Status.cpu_fallback_active `
        -and $Status.selected_device -eq "cpu" `
        -and $Status.selected_translation_device -eq "cpu" `
        -and $AsrPreload.device -eq "cpu" `
        -and $IdEn.device -eq "cpu" `
        -and $EnId.device -eq "cpu"
}

Write-Host "TranslateIT canonical persistent-worker smoke test"
Write-Host "Root: $Root"
Write-Host "Expected device: $ExpectedDevice"
Write-Host "Audio provided: $([bool]($AudioPath.Trim().Length -gt 0))"

$status = $null
$asrPreload = $null
$translationIdEn = $null
$translationEnId = $null
$ttsPreflight = $null
$tts = $null
$asr = $null
$postStatus = $null
$ttsArtifactValid = $false

try {
    $status = Invoke-WorkerJson @{ command = "status" }
    $asrPreload = Invoke-WorkerJson @{ command = "asr_preload" }
    $translationIdEn = Invoke-WorkerJson @{
        command = "translate"
        text = $IdText
        source_language = "id"
        target_language = "en"
        max_new_tokens = 48
    }
    $translationEnId = Invoke-WorkerJson @{
        command = "translate"
        text = $EnText
        source_language = "en"
        target_language = "id"
        max_new_tokens = 48
    }
    $ttsPreflight = Invoke-WorkerJson @{ command = "tts_preflight" }
    if ($TtsText.Trim().Length -gt 0) {
        $tts = Invoke-WorkerJson @{ command = "synthesize"; text = $TtsText }
        if ([bool]$tts.ok -and -not [string]::IsNullOrWhiteSpace([string]$tts.output_path)) {
            $ttsArtifactValid = (Test-Path $tts.output_path) -and ((Get-Item $tts.output_path).Length -gt 44)
        }
    }
    if ($AudioPath.Trim().Length -gt 0) {
        $asr = Invoke-WorkerJson @{
            command = "transcribe"
            audio_path = $AudioPath
            language = "id"
            beam_size = 1
            vad_filter = $true
        }
    }
    $postStatus = Invoke-WorkerJson @{ command = "status" }
}
finally {
    try { $process.StandardInput.Close() } catch {}
    if (-not $process.WaitForExit(5000)) {
        try { $process.Kill() } catch {}
        try { [void]$process.WaitForExit(5000) } catch {}
    }
}

$translationIdEnOk = Test-TranslationResponse $translationIdEn "id->en"
$translationEnIdOk = Test-TranslationResponse $translationEnId "en->id"
$ttsOk = [bool]$ttsPreflight.ok -and (($null -eq $tts) -or ([bool]$tts.ok -and $ttsArtifactValid))
$asrOk = [bool]$asrPreload.ok
if ($null -ne $asr) {
    $asrOk = $asrOk -and [bool]$asr.ok -and -not [string]::IsNullOrWhiteSpace([string]$asr.transcript_text)
}
$deviceOk = Test-DeviceExpectation $status $asrPreload $translationIdEn $translationEnId
$loadedDirections = @($postStatus.loaded.translation_directions)
$persistentLifecycleOk = $loadedDirections -contains "id->en" -and $loadedDirections -contains "en->id"

$ok = [bool]$status.ok `
    -and $translationIdEnOk `
    -and $translationEnIdOk `
    -and $ttsOk `
    -and $asrOk `
    -and $deviceOk `
    -and $persistentLifecycleOk

$result = [ordered]@{
    schema = "translateit.local_worker_smoke_result.v7.redacted.persistent"
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    privacy = "conversation_bodies_and_runtime_paths_redacted"
    persistent_worker = $true
    ok = $ok
    expected_device = $ExpectedDevice
    id_text_chars = $IdText.Length
    en_text_chars = $EnText.Length
    audio_supplied = [bool]($AudioPath.Trim().Length -gt 0)
    tts_text_chars = $TtsText.Length
    assertions = [ordered]@{
        translation_id_en = $translationIdEnOk
        translation_en_id = $translationEnIdOk
        tts_artifact = $ttsOk
        asr = $asrOk
        device_truth = $deviceOk
        persistent_translation_lifecycle = $persistentLifecycleOk
    }
    status = Get-StageSummary $status
    asr_preload = Get-StageSummary $asrPreload
    translation_id_en = Get-StageSummary $translationIdEn
    translation_en_id = Get-StageSummary $translationEnId
    tts_preflight = Get-StageSummary $ttsPreflight
    tts = Get-StageSummary $tts
    asr = Get-StageSummary $asr
    post_status = Get-StageSummary $postStatus
    note = "This smoke result records only stage/completion/provider/device metadata for the observed persistent worker run. It excludes source, translated, transcript text and runtime file paths. It is not linguistic-quality, meeting-audio-delivery, latency, installer, or clean-machine proof."
}

New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null
$result | ConvertTo-Json -Depth 20 | Set-Content -Path $EvidencePath -Encoding UTF8
$result | ConvertTo-Json -Depth 20

if (-not $ok) { exit 1 }
Write-Host "Persistent-worker smoke finished and privacy-bounded evidence saved: $EvidencePath"
'''
write(WORKER_ROOT / "run_realtime_worker_smoke.ps1", smoke)

readme_path = WORKER_ROOT / "README.md"
readme = read(readme_path)
readme = readme.replace(
    '''Product mode ownership is caller-scoped:\n\n```text\nMeeting outbound -> Realtime\nStandalone Text  -> Quality\n```\n\nThe worker must not silently switch translation mode merely to obtain output.\n''',
    '''Current translation ownership is direction-based:\n\n```text\nMeeting outbound -> Indonesian -> English\nStandalone Text  -> Indonesian <-> English\n```\n\nThe worker must not invent a mode switch or alternate translation engine merely to obtain output.\n''',
)
readme = readme.replace(
    '''## Current Local Stack\n\n| Stage | Realtime | Quality |\n| --- | --- | --- |\n| ASR | Faster Whisper Large V3 Turbo | Faster Whisper Large V3 Turbo |\n| Translation | MarianMT ID-EN | NLLB 200 distilled 600M |\n| TTS | Explicit English Piper voice or explicit English Windows SAPI voice | Explicit English Piper voice or explicit English Windows SAPI voice |\n\nNamed providers/models are current implementation evidence, not permanent product identity. Provider/model changes remain owned by the local-AI runtime boundary.\n''',
    '''## Current Local Stack\n\n| Capability | Current implementation |\n| --- | --- |\n| ASR primary | Faster Whisper Large V3 Turbo |\n| ASR optional fallback | Faster Whisper Medium |\n| Translation ID -> EN | MarianMT `marianmt-id-en` |\n| Translation EN -> ID | MarianMT `marianmt-en-id` |\n| English TTS | Explicit English Piper voice or explicitly verified English Windows SAPI voice |\n\nNamed providers/models are current implementation evidence, not permanent product identity. Provider/model changes remain owned by the local-AI runtime boundary.\n''',
)
asset_section_marker = '''## Runtime Assets\n\nThe declarative `model_manifest.json` + Rust inventory is scoped only to **full-product-release asset presence**.'''
asset_section_replacement = '''## Runtime Assets\n\n### Deterministic developer acquisition\n\n`model_manifest.json` is also the single source for developer Hugging Face asset acquisition. Every Hugging Face entry carries a full immutable `revision` commit hash. `prepare_model_assets.py` refuses floating revisions and refuses paths outside the canonical `EngineData/Backend/RuntimeAssets` root. It downloads into a sibling staging directory and replaces the target only after the pinned snapshot completes, so a failed download does not destroy the previous local asset.\n\nFrom WorkerRuntime after `uv sync --frozen`:\n\n```powershell\n# Validate the exact pinned plan without downloading\nuv run --frozen python prepare_model_assets.py --plan\n\n# Acquire required Hugging Face proof/runtime assets\nuv run --frozen python prepare_model_assets.py\n\n# Also acquire the optional Faster Whisper fallback\nuv run --frozen python prepare_model_assets.py --include-optional\n```\n\nThe developer downloader intentionally does not fabricate manual release assets. Piper remains a separately sourced release asset until a canonical source is approved; Windows SAPI may still satisfy development/runtime TTS capability when an explicit English voice is verified.\n\nThe declarative `model_manifest.json` + Rust inventory is scoped only to **full-product-release asset presence**.'''
if asset_section_marker not in readme:
    raise RuntimeError("WorkerRuntime README runtime-assets marker missing")
readme = readme.replace(asset_section_marker, asset_section_replacement, 1)
smoke_marker = '''The smoke script requires the canonical `.venv` created from this project. Its stored evidence is privacy-bounded to stage/completion/voice metadata and excludes source text, translated text, transcript text, and runtime file paths.\n'''
smoke_replacement = '''The smoke script requires the canonical `.venv` created from this project. It exercises ASR preload, both ID -> EN and EN -> ID translation directions, English TTS synthesis, optional ASR transcription when `-AudioPath` is supplied, and explicit device truth. Use `-ExpectedDevice Cuda` on the NVIDIA target to fail unless both ASR and translation actually execute on CUDA; use `-ExpectedDevice CpuFallback` only where CUDA probes truthfully report unavailable. All worker reads are bounded by `-CommandTimeoutSeconds`.\n\n```powershell\n.\\run_realtime_worker_smoke.ps1 -ExpectedDevice CpuFallback\n.\\run_realtime_worker_smoke.ps1 -ExpectedDevice Cuda -AudioPath C:\\path\\to\\indonesian-proof.wav\n```\n\nStored evidence is privacy-bounded to stage/completion/provider/device metadata and excludes source text, translated text, transcript text, and runtime file paths.\n'''
if smoke_marker not in readme:
    raise RuntimeError("WorkerRuntime README smoke marker missing")
readme = readme.replace(smoke_marker, smoke_replacement, 1)
write(readme_path, readme)

startup_validator = APP_ROOT / "scripts/validate_startup_runtime_readiness.mjs"
startup = read(startup_validator)
startup = startup.replace(
    '  "latest_runtime_session_state().snapshot.is_some()",\n  "pub fn select_audio_device",',
    '  "latest_runtime_session_state().has_active_session",\n  "pub fn select_audio_device",',
)
startup = startup.replace(
    '  "pub fn start_helper_bridge()",\n  "latest_runtime_session_state().snapshot.is_some()",',
    '  "pub fn start_helper_bridge()",\n  "latest_runtime_session_state().has_active_session",',
)
write(startup_validator, startup)

frontend_validator = APP_ROOT / "scripts/validate_frontend_build_preflight.mjs"
front = read(frontend_validator)
old_front = 'for (const marker of ["You speak", "Meeting hears", "Ready to translate. Start when your meeting is open.", "TranslateIT Meeting Microphone", "Check Setup"]) {'
new_front = 'for (const marker of ["You speak", "Meeting hears", "Ready to translate. Start when your meeting is open.", "Meeting microphone", "meetingMicrophoneDevice", "Check Setup"]) {'
if old_front not in front:
    raise RuntimeError("Frontend preflight stale Meeting marker not found")
front = front.replace(old_front, new_front, 1)
write(frontend_validator, front)

compile_script = APP_ROOT / "scripts/run_local_tauri_compile_check.mjs"
compile_body = read(compile_script)
compile_body = compile_body.replace(
    'const isWindows = process.platform === "win32";\nmkdirSync(reportDir, { recursive: true });',
    'const isWindows = process.platform === "win32";\nconst cleanTarget = process.env.TRANSLATEIT_CLEAN_RUST_TARGET === "1";\nmkdirSync(reportDir, { recursive: true });',
    1,
)
old_clean = '''if (existsSync(targetPath)) {\n  console.log(`${color.yellow}[local-tauri-compile] Removing stale Tauri target cache: ${targetPath}${color.reset}`);\n  rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });\n}\n\n'''
new_clean = '''if (cleanTarget && existsSync(targetPath)) {\n  console.log(`${color.yellow}[local-tauri-compile] Explicit clean requested; removing Tauri target cache: ${targetPath}${color.reset}`);\n  rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });\n} else if (existsSync(targetPath)) {\n  console.log(`${color.cyan}[local-tauri-compile] Reusing incremental Tauri target cache. Set TRANSLATEIT_CLEAN_RUST_TARGET=1 only when a clean compile is intentionally required.${color.reset}`);\n}\n\n'''
if old_clean not in compile_body:
    raise RuntimeError("Local Tauri compile cache block missing")
compile_body = compile_body.replace(old_clean, new_clean, 1)
write(compile_script, compile_body)

scripts_readme = APP_ROOT / "scripts/README.md"
scripts_body = read(scripts_readme)
scripts_body = scripts_body.replace(
    'Package/path preflight remains separate because installer/path claims are a different boundary. `check:tauri-rust-local` remains an explicit local compile command and is not part of source-only proof.\n',
    'Package/path preflight remains separate because installer/path claims are a different boundary. `check:tauri-rust-local` remains an explicit local compile command and is not part of source-only proof. It reuses Cargo incremental output by default; set `TRANSLATEIT_CLEAN_RUST_TARGET=1` only when a deliberate clean compile is required.\n',
    1,
)
write(scripts_readme, scripts_body)

next_action_path = ROOT / "docs/knowledge/next-action.md"
next_action = read(next_action_path)
heading = "## Backend Pre-Local B4 — CLOSED"
idx = next_action.find(heading)
if idx < 0:
    raise RuntimeError("B4 closure heading missing from next-action.md")
prefix = next_action[:idx]
closure = '''## Backend Pre-Local B4 — CLOSED

Normal post-setup product snapshot now lazily restores the one persistent helper when its lifecycle is known `not_started` or `stopped`, before Meeting preflight and worker capability are sampled. This removes the normal requirement to run Check Setup after each app restart while reusing the guarded existing helper owner. Arbitrary helper `error`/blocked states are not converted into a blind restart loop. Text retains its existing on-demand helper start path.

Fresh First Setup remains Python-free by contract: `App.svelte` does not enter the normal product snapshot while `meeting_setup_state = new`, and the product facade additionally refuses lazy helper start for `new` settings if called directly. No second helper launcher, background readiness service, or frontend runtime truth was introduced.

Windows suspend/resume window messages only enqueue a bounded nonblocking cleanup signal. A single process-lifetime Rust lifecycle worker consumes that signal and converges through canonical authority-first Meeting Stop; the window procedure itself no longer inspects Meeting authority, joins workers, stops helper tasks, or releases audio resources.

Remote Windows/source proof for this slice passed:

```text
B4 lifecycle source contract             -> PASS
canonical npm ci + svelte-check/build    -> PASS
Rust B4 power lifecycle test             -> PASS
cargo check                              -> PASS
Tauri release build --no-bundle          -> PASS
```

This proves lifecycle ownership, bounded handoff wiring, frontend type/build correctness, Rust behavior checks, and Windows compilation. It does not prove a real live Meeting across physical sleep/wake, post-resume device recovery, packaged PythonRuntime placement, or user-local-PC behavior.

## Backend Pre-Local B5 — CLOSED

Developer proof tooling now follows the current direction-based worker contract. `model_manifest.json` pins every Hugging Face model entry to a full immutable commit revision, and `prepare_model_assets.py` is the single developer acquisition path for those entries. It validates canonical RuntimeAssets destinations, refuses floating revisions/path escape, stages downloads before replacement, and reports manual required assets such as Piper without pretending they were acquired automatically. `huggingface-hub` is developer tooling in the canonical locked WorkerRuntime environment, not an end-user requirement.

`run_realtime_worker_smoke.ps1` no longer exposes retired Realtime/Quality modes. One persistent worker run now checks primary ASR preload, ID -> EN and EN -> ID MarianMT translation with EOS-completion truth, English TTS synthesis/WAV existence, optional Indonesian ASR transcription when audio is supplied, persistent loaded-direction state, bounded response waits, and an explicit `Any` / `Cuda` / `CpuFallback` device expectation. Stored smoke evidence remains privacy-bounded and excludes source/translated/transcript content and runtime paths.

Local proof infrastructure is also reconciled: startup/frontend validators use current fail-closed runtime ownership and product-facing Meeting-microphone wording, while `check:tauri-rust-local` preserves Cargo incremental output by default and cleans only when `TRANSLATEIT_CLEAN_RUST_TARGET=1` is explicitly requested.

Remote Windows proof for this slice passed:

```text
pinned Hugging Face revision resolution          -> PASS
canonical asset acquisition plan                 -> PASS
required Hugging Face asset acquisition           -> PASS
WorkerRuntime Ruff/pytest                         -> PASS
persistent worker real-model smoke                -> PASS: ASR preload + ID<->EN + English TTS + CPU fallback
validate:source-contracts                         -> PASS
svelte-check + frontend build                     -> PASS
incremental local Tauri compile helper            -> PASS
cargo check                                       -> PASS
Tauri release build --no-bundle                   -> PASS
```

The hosted Windows runner has no NVIDIA GPU, so the same smoke tooling proves `CpuFallback` there but not `Cuda`. Piper remains a manual release asset with no approved source, so B5 does not claim self-contained release packaging. No VAD tuning, installer staging, lifecycle redesign, or broad dead-code cleanup occurred.

## Current Mode

**Maintenance / Backend Pre-Local Readiness — B5 CLOSED.** Backend hardening A1-A7 and pre-local B1-B5 are source/remote-proof closed. P2.3 CPU model execution remains proven; actual CUDA and physical Windows audio/device behavior remain target-PC acceptance boundaries.

## Next Step — Backend Pre-Local B6: Proven Dead / Legacy Cleanup

Remove only dead or stale backend scaffolding whose lack of current callers/ownership is now evidenced by the B1-B5 compile/runtime path, reconcile stale backend documentation/ownership markers, and reduce warning/debug noise before local acceptance. Keep B6 behavior-preserving: do not tune VAD, redesign runtime behavior, change installer packaging, or delete a path solely because the compiler warns about it.
'''
write(next_action_path, prefix + closure)

print("Backend pre-local B5 patch staged")
