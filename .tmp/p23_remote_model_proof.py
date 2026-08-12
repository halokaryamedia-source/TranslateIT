from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import wave
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
WORKER_ROOT = ROOT / "EngineData" / "Backend" / "LocalWorker" / "WorkerRuntime"
WORKER = WORKER_ROOT / "realtime_local_worker.py"
ASR_PRIMARY = (
    ROOT
    / "EngineData"
    / "Backend"
    / "RuntimeAssets"
    / "ASR"
    / "ModelData"
    / "faster-whisper-large-v3-turbo"
)
TRANSLATION_ID_EN = (
    ROOT
    / "EngineData"
    / "Backend"
    / "RuntimeAssets"
    / "Translation"
    / "ModelData"
    / "marianmt-id-en"
)
TRANSLATION_EN_ID = (
    ROOT
    / "EngineData"
    / "Backend"
    / "RuntimeAssets"
    / "Translation"
    / "ModelData"
    / "marianmt-en-id"
)
TTS_RELATIVE_PATH = "UserData/CacheData/p23/tts_probe.wav"
TTS_ABSOLUTE_PATH = ROOT / "UserData" / "CacheData" / "p23" / "tts_probe.wav"
RESULT_PATH = ROOT / ".tmp" / "p23_remote_result.json"


def emit(label: str, payload: dict[str, Any]) -> None:
    print(f"P23::{label}::{json.dumps(payload, ensure_ascii=True, sort_keys=True)}", flush=True)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def download_assets() -> None:
    from huggingface_hub import snapshot_download

    specs = [
        (
            "dropbox-dash/faster-whisper-large-v3-turbo",
            ASR_PRIMARY,
            None,
        ),
        (
            "Helsinki-NLP/opus-mt-id-en",
            TRANSLATION_ID_EN,
            [
                "config.json",
                "generation_config.json",
                "pytorch_model.bin",
                "model.safetensors",
                "source.spm",
                "target.spm",
                "tokenizer_config.json",
                "special_tokens_map.json",
                "vocab.json",
                "tokenizer.json",
            ],
        ),
        (
            "Helsinki-NLP/opus-mt-en-id",
            TRANSLATION_EN_ID,
            [
                "config.json",
                "generation_config.json",
                "pytorch_model.bin",
                "model.safetensors",
                "source.spm",
                "target.spm",
                "tokenizer_config.json",
                "special_tokens_map.json",
                "vocab.json",
                "tokenizer.json",
            ],
        ),
    ]

    for repo_id, destination, allow_patterns in specs:
        destination.mkdir(parents=True, exist_ok=True)
        started = time.monotonic()
        snapshot_download(
            repo_id=repo_id,
            local_dir=str(destination),
            allow_patterns=allow_patterns,
            max_workers=8,
        )
        file_count = sum(1 for item in destination.rglob("*") if item.is_file())
        size_bytes = sum(
            item.stat().st_size for item in destination.rglob("*") if item.is_file()
        )
        emit(
            "asset_download",
            {
                "repo_id": repo_id,
                "file_count": file_count,
                "size_bytes": size_bytes,
                "elapsed_ms": round((time.monotonic() - started) * 1000),
            },
        )


def start_worker() -> subprocess.Popen[str]:
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    return subprocess.Popen(
        [sys.executable, str(WORKER)],
        cwd=str(WORKER_ROOT),
        env=env,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=None,
        text=True,
        bufsize=1,
    )


def request(process: subprocess.Popen[str], command: str, **payload: Any) -> dict[str, Any]:
    require(process.stdin is not None and process.stdout is not None, "worker pipes unavailable")
    body = {"command": command, **payload}
    process.stdin.write(json.dumps(body, separators=(",", ":")) + "\n")
    process.stdin.flush()
    line = process.stdout.readline()
    require(bool(line.strip()), f"worker returned no response for {command}")
    response = json.loads(line)
    require(isinstance(response, dict), f"worker returned non-object response for {command}")
    return response


def stop_worker(process: subprocess.Popen[str]) -> None:
    if process.stdin is not None:
        try:
            process.stdin.close()
        except Exception:
            pass
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=10)


def tts_preflight_only() -> None:
    process = start_worker()
    try:
        response = request(process, "tts_preflight")
    finally:
        stop_worker(process)
    emit(
        "tts_preflight",
        {
            "ok": bool(response.get("ok")),
            "provider": response.get("provider"),
            "voice_id": response.get("voice_id"),
            "language_code": response.get("language_code"),
            "blocker": response.get("blocker"),
        },
    )
    require(bool(response.get("ok")), f"English TTS preflight failed: {response.get('blocker')}")


def wave_summary(path: Path) -> dict[str, Any]:
    require(path.is_file(), "TTS WAV was not created")
    require(path.stat().st_size > 44, "TTS WAV is empty")
    with wave.open(str(path), "rb") as audio:
        frames = audio.getnframes()
        sample_rate = audio.getframerate()
        return {
            "bytes": path.stat().st_size,
            "frames": frames,
            "sample_rate_hz": sample_rate,
            "channels": audio.getnchannels(),
            "sample_width": audio.getsampwidth(),
            "duration_ms": round((frames / sample_rate) * 1000) if sample_rate else 0,
        }


def translation_summary(response: dict[str, Any]) -> dict[str, Any]:
    translated = str(response.get("translated_text") or "")
    return {
        "ok": bool(response.get("ok")),
        "direction_pair": response.get("direction_pair"),
        "model_id": response.get("model_id"),
        "device": response.get("device"),
        "device_note": response.get("device_note"),
        "translation_gpu_requested": response.get("translation_gpu_requested"),
        "translation_torch_cuda_available": response.get("translation_torch_cuda_available"),
        "translation_degraded": response.get("translation_degraded"),
        "translation_fallback_reason": response.get("translation_fallback_reason"),
        "complete": response.get("complete"),
        "finished_with_eos": response.get("finished_with_eos"),
        "translated_chars": len(translated),
        "elapsed_ms": response.get("elapsed_ms"),
        "blocker": response.get("blocker"),
    }


def prove() -> None:
    TTS_ABSOLUTE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if TTS_ABSOLUTE_PATH.exists():
        TTS_ABSOLUTE_PATH.unlink()

    process = start_worker()
    try:
        status_before = request(process, "status")
        require(bool(status_before.get("ok")), f"worker status not ready: {status_before.get('blocker')}")
        readiness = status_before.get("readiness") or {}
        require(readiness.get("asr") is True, "ASR readiness false after real asset installation")
        require(readiness.get("translation_id_en") is True, "ID->EN readiness false")
        require(readiness.get("translation_en_id") is True, "EN->ID readiness false")
        require(readiness.get("tts") is True, "English TTS readiness false")

        id_en_preload = request(
            process,
            "translation_preload",
            source_language="id",
            target_language="en",
        )
        require(bool(id_en_preload.get("ok")), f"ID->EN preload failed: {id_en_preload.get('blocker')}")
        id_en = request(
            process,
            "translate",
            text="halo dunia",
            source_language="id",
            target_language="en",
            max_new_tokens=48,
        )
        require(bool(id_en.get("ok")), f"ID->EN inference failed: {id_en.get('blocker')}")
        require(id_en.get("complete") is True, "ID->EN generation did not complete normally")
        require(id_en.get("finished_with_eos") is True, "ID->EN generation missing EOS")
        require(bool(str(id_en.get("translated_text") or "").strip()), "ID->EN output empty")

        en_id_preload = request(
            process,
            "translation_preload",
            source_language="en",
            target_language="id",
        )
        require(bool(en_id_preload.get("ok")), f"EN->ID preload failed: {en_id_preload.get('blocker')}")
        en_id = request(
            process,
            "translate",
            text="hello world",
            source_language="en",
            target_language="id",
            max_new_tokens=48,
        )
        require(bool(en_id.get("ok")), f"EN->ID inference failed: {en_id.get('blocker')}")
        require(en_id.get("complete") is True, "EN->ID generation did not complete normally")
        require(en_id.get("finished_with_eos") is True, "EN->ID generation missing EOS")
        require(bool(str(en_id.get("translated_text") or "").strip()), "EN->ID output empty")

        tts_preflight = request(process, "tts_preflight")
        require(bool(tts_preflight.get("ok")), f"TTS preflight failed: {tts_preflight.get('blocker')}")
        tts = request(
            process,
            "synthesize",
            text="Hello from TranslateIT model execution proof.",
            output_path=TTS_RELATIVE_PATH,
        )
        require(bool(tts.get("ok")), f"English TTS synthesis failed: {tts.get('blocker')}")
        wav = wave_summary(TTS_ABSOLUTE_PATH)

        asr_preload = request(process, "asr_preload")
        require(bool(asr_preload.get("ok")), f"ASR preload failed: {asr_preload.get('blocker')}")
        asr = request(
            process,
            "transcribe",
            audio_path=TTS_RELATIVE_PATH,
            language="en",
            beam_size=1,
            vad_filter=False,
        )
        require(bool(asr.get("ok")), f"ASR inference failed: {asr.get('blocker')}")
        transcript = str(asr.get("transcript_text") or "").strip()
        require(bool(transcript), "ASR transcript empty")

        status_after = request(process, "status")
        loaded = status_after.get("loaded") or {}
        require(loaded.get("asr") is True, "worker did not retain loaded ASR runtime")
        directions = set(loaded.get("translation_directions") or [])
        require({"id->en", "en->id"}.issubset(directions), "worker did not retain both loaded translation directions")
    finally:
        stop_worker(process)

    gpu = status_before.get("gpu") or {}
    cuda_available = bool(gpu.get("torch_cuda_available")) and bool(
        gpu.get("ctranslate2_cuda_available")
    )
    cpu_fallback_proven = not cuda_available
    if cpu_fallback_proven:
        require(asr.get("device") == "cpu", "ASR did not execute on CPU fallback")
        require(id_en.get("device") == "cpu", "ID->EN did not execute on CPU fallback")
        require(en_id.get("device") == "cpu", "EN->ID did not execute on CPU fallback")
        require(id_en.get("translation_degraded") is True, "ID->EN CPU path was not marked degraded")
        require(en_id.get("translation_degraded") is True, "EN->ID CPU path was not marked degraded")

    result = {
        "schema": "translateit.p23.remote_model_execution.v1",
        "real_model_execution_proven": True,
        "persistent_worker": True,
        "locked_environment": True,
        "asr": {
            "ok": bool(asr.get("ok")),
            "model_id": asr.get("model_id"),
            "device": asr.get("device"),
            "compute_type": asr.get("compute_type"),
            "transcript_chars": len(transcript),
            "elapsed_ms": asr.get("elapsed_ms"),
        },
        "translation_id_en": translation_summary(id_en),
        "translation_en_id": translation_summary(en_id),
        "tts": {
            "ok": bool(tts.get("ok")),
            "provider": tts.get("provider"),
            "voice_id": tts.get("voice_id"),
            "language_code": tts.get("language_code"),
            "elapsed_ms": tts.get("elapsed_ms"),
            **wav,
        },
        "gpu": {
            "cuda_primary_requested": gpu.get("cuda_primary_requested"),
            "torch_cuda_available": gpu.get("torch_cuda_available"),
            "ctranslate2_cuda_available": gpu.get("ctranslate2_cuda_available"),
            "nvidia_smi_available": gpu.get("nvidia_smi_available"),
            "selected_device": gpu.get("selected_device"),
            "selected_translation_device": gpu.get("selected_translation_device"),
            "selected_compute_type": gpu.get("selected_compute_type"),
            "fallback_reason": gpu.get("fallback_reason"),
            "cpu_fallback_proven": cpu_fallback_proven,
            "cuda_execution_proven": cuda_available
            and asr.get("device") == "cuda"
            and id_en.get("device") == "cuda"
            and en_id.get("device") == "cuda",
        },
        "loaded_after": {
            "asr": loaded.get("asr"),
            "asr_device": loaded.get("asr_device"),
            "asr_compute_type": loaded.get("asr_compute_type"),
            "asr_model_id": loaded.get("asr_model_id"),
            "translation_directions": sorted(directions),
        },
        "privacy": "fixed proof phrases only; generated text bodies and runtime paths omitted",
    }
    RESULT_PATH.write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")
    emit("result", result)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"download", "tts-preflight", "prove"}:
        raise SystemExit("usage: p23_remote_model_proof.py download|tts-preflight|prove")
    command = sys.argv[1]
    if command == "download":
        download_assets()
    elif command == "tts-preflight":
        tts_preflight_only()
    else:
        prove()
