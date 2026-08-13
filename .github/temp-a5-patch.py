from __future__ import annotations

import json
import subprocess
import wave
from pathlib import Path

ROOT = Path.cwd()
PROVIDER_PATH = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/voice_lab_gpt_sovits.py"
WORKER_PATH = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"
TEST_PATH = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_voice_actor_inference.py"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one exact anchor, found {count}")
    return text.replace(old, new, 1)


def patch_provider() -> None:
    text = PROVIDER_PATH.read_text(encoding="utf-8")
    text = replace_once(text, '"""Pinned GPT-SoVITS V2ProPlus provider adapter for VoiceLab build only."""', '"""Pinned GPT-SoVITS V2ProPlus provider for VoiceLab build and trained-actor inference."""', "provider-docstring")
    text = replace_once(text, "import wave\nfrom pathlib import Path\nfrom typing import Any, Callable\n", "import wave\nfrom contextlib import contextmanager\nfrom pathlib import Path\nfrom typing import Any, Callable, Iterator\n", "provider-imports")
    text = replace_once(text, "GPT_EPOCHS = 15\n", "GPT_EPOCHS = 15\nACTOR_SCHEMA_VERSION = 1\nACTOR_MANIFEST_FILE = \"actor.json\"\nACTOR_GPT_WEIGHT_FILE = \"gpt.ckpt\"\nACTOR_SOVITS_WEIGHT_FILE = \"sovits.pth\"\nACTOR_REFERENCE_WAV_FILE = \"reference.wav\"\nMAX_ACTOR_MANIFEST_BYTES = 64 * 1024\n", "provider-actor-constants")

    old = '''def source_assets(source_root: Path) -> dict[str, Path]:
    marker = source_root / "TRANSLATEIT_GPTSOVITS_REVISION.txt"
    require_file(marker, "revision_marker")
    if marker.read_text(encoding="utf-8").strip() != ENGINE_REVISION:
        raise VoiceLabProviderError("source_revision_mismatch")

    gsv = source_root / "GPT_SoVITS"
    assets = {
        "gsv": gsv,
        "text": gsv / "prepare_datasets" / "1-get-text.py",
        "hubert": gsv / "prepare_datasets" / "2-get-hubert-wav32k.py",
        "sv": gsv / "prepare_datasets" / "2-get-sv.py",
        "semantic": gsv / "prepare_datasets" / "3-get-semantic.py",
        "sovits_train": gsv / "s2_train.py",
        "gpt_train": gsv / "s1_train.py",
        "s2_config": gsv / "configs" / "s2v2ProPlus.json",
        "s1_config": gsv / "configs" / "s1longer-v2.yaml",
        "pretrained_gpt": gsv / "pretrained_models" / "s1v3.ckpt",
        "pretrained_sovits_g": gsv / "pretrained_models" / "v2Pro" / "s2Gv2ProPlus.pth",
        "pretrained_sovits_d": gsv / "pretrained_models" / "v2Pro" / "s2Dv2ProPlus.pth",
        "hubert_model": gsv / "pretrained_models" / "chinese-hubert-base",
        "bert_model": gsv / "pretrained_models" / "chinese-roberta-wwm-ext-large",
        "sv_model": gsv / "pretrained_models" / "sv" / "pretrained_eres2netv2w24s4ep4.ckpt",
    }
    require_dir(gsv, "GPT_SoVITS")
    require_dir(assets["hubert_model"], "chinese_hubert_base")
    require_dir(assets["bert_model"], "chinese_bert_base")
    for key, path in assets.items():
        if key not in {"gsv", "hubert_model", "bert_model"}:
            require_file(path, key)

    require_file(source_root / "ffmpeg.exe", "ffmpeg")
    nltk_root = source_root / "nltk_data"
    require_dir(nltk_root / "corpora" / "cmudict", "nltk_cmudict")
    require_dir(nltk_root / "taggers" / "averaged_perceptron_tagger", "nltk_averaged_perceptron_tagger")
    require_dir(nltk_root / "taggers" / "averaged_perceptron_tagger_eng", "nltk_averaged_perceptron_tagger_eng")
    return assets
'''
    new = '''def validate_source_revision(source_root: Path) -> Path:
    marker = source_root / "TRANSLATEIT_GPTSOVITS_REVISION.txt"
    require_file(marker, "revision_marker")
    if marker.read_text(encoding="utf-8").strip() != ENGINE_REVISION:
        raise VoiceLabProviderError("source_revision_mismatch")
    gsv = source_root / "GPT_SoVITS"
    require_dir(gsv, "GPT_SoVITS")
    return gsv


def inference_source_assets(source_root: Path) -> dict[str, Path]:
    gsv = validate_source_revision(source_root)
    assets = {
        "gsv": gsv,
        "hubert_model": gsv / "pretrained_models" / "chinese-hubert-base",
        "bert_model": gsv / "pretrained_models" / "chinese-roberta-wwm-ext-large",
        "sv_model": gsv / "pretrained_models" / "sv" / "pretrained_eres2netv2w24s4ep4.ckpt",
    }
    require_dir(assets["hubert_model"], "chinese_hubert_base")
    require_dir(assets["bert_model"], "chinese_bert_base")
    require_file(assets["sv_model"], "sv_model")
    nltk_root = source_root / "nltk_data"
    require_dir(nltk_root / "corpora" / "cmudict", "nltk_cmudict")
    require_dir(nltk_root / "taggers" / "averaged_perceptron_tagger", "nltk_averaged_perceptron_tagger")
    require_dir(nltk_root / "taggers" / "averaged_perceptron_tagger_eng", "nltk_averaged_perceptron_tagger_eng")
    return assets


def source_assets(source_root: Path) -> dict[str, Path]:
    assets = inference_source_assets(source_root)
    gsv = assets["gsv"]
    assets.update({
        "text": gsv / "prepare_datasets" / "1-get-text.py",
        "hubert": gsv / "prepare_datasets" / "2-get-hubert-wav32k.py",
        "sv": gsv / "prepare_datasets" / "2-get-sv.py",
        "semantic": gsv / "prepare_datasets" / "3-get-semantic.py",
        "sovits_train": gsv / "s2_train.py",
        "gpt_train": gsv / "s1_train.py",
        "s2_config": gsv / "configs" / "s2v2ProPlus.json",
        "s1_config": gsv / "configs" / "s1longer-v2.yaml",
        "pretrained_gpt": gsv / "pretrained_models" / "s1v3.ckpt",
        "pretrained_sovits_g": gsv / "pretrained_models" / "v2Pro" / "s2Gv2ProPlus.pth",
        "pretrained_sovits_d": gsv / "pretrained_models" / "v2Pro" / "s2Dv2ProPlus.pth",
    })
    for key in ("text", "hubert", "sv", "semantic", "sovits_train", "gpt_train", "s2_config", "s1_config", "pretrained_gpt", "pretrained_sovits_g", "pretrained_sovits_d"):
        require_file(assets[key], key)
    require_file(source_root / "ffmpeg.exe", "ffmpeg")
    return assets
'''
    text = replace_once(text, old, new, "provider-source-assets")

    anchor = "    return frames * 1_000 // 32_000\n\n\ndef training_takes"
    insert = '''    return frames * 1_000 // 32_000


def require_regular_file(path: Path, label: str) -> tuple[int, int]:
    if path.is_symlink() or not path.is_file():
        raise VoiceLabProviderError(f"invalid_actor_asset:{label}")
    stat = path.stat()
    if stat.st_size <= 0:
        raise VoiceLabProviderError(f"invalid_actor_asset:{label}")
    return int(stat.st_size), int(stat.st_mtime_ns)


def validate_actor_package(actor_dir: Path) -> dict[str, Any]:
    if actor_dir.is_symlink() or not actor_dir.is_dir():
        raise VoiceLabProviderError("approved_actor_missing")
    manifest_path = actor_dir / ACTOR_MANIFEST_FILE
    manifest_size, manifest_mtime = require_regular_file(manifest_path, "actor_manifest")
    if manifest_size > MAX_ACTOR_MANIFEST_BYTES:
        raise VoiceLabProviderError("actor_manifest_size_invalid")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise VoiceLabProviderError("actor_manifest_invalid_json") from exc
    if not isinstance(manifest, dict):
        raise VoiceLabProviderError("actor_manifest_invalid_json")
    if type(manifest.get("schema_version")) is not int or manifest["schema_version"] != ACTOR_SCHEMA_VERSION:
        raise VoiceLabProviderError("actor_schema_mismatch")
    if manifest.get("engine") != ENGINE or manifest.get("engine_revision") != ENGINE_REVISION:
        raise VoiceLabProviderError("actor_engine_contract_mismatch")
    if manifest.get("gpt_weight_file") != ACTOR_GPT_WEIGHT_FILE or manifest.get("sovits_weight_file") != ACTOR_SOVITS_WEIGHT_FILE or manifest.get("reference_wav_file") != ACTOR_REFERENCE_WAV_FILE:
        raise VoiceLabProviderError("actor_package_filename_mismatch")
    reference_text = str(manifest.get("reference_text", "")).strip()
    if not reference_text:
        raise VoiceLabProviderError("actor_reference_text_missing")
    if manifest.get("held_out_evaluation_complete") is not True:
        raise VoiceLabProviderError("actor_evaluation_incomplete")
    reference_duration = manifest.get("reference_duration_ms")
    if type(reference_duration) is not int:
        raise VoiceLabProviderError("actor_reference_duration_invalid")
    gpt_path = actor_dir / ACTOR_GPT_WEIGHT_FILE
    sovits_path = actor_dir / ACTOR_SOVITS_WEIGHT_FILE
    reference_wav = actor_dir / ACTOR_REFERENCE_WAV_FILE
    gpt_identity = require_regular_file(gpt_path, "gpt_weight")
    sovits_identity = require_regular_file(sovits_path, "sovits_weight")
    reference_identity = require_regular_file(reference_wav, "reference_wav")
    duration_ms = wav_duration_ms(reference_wav)
    if duration_ms < REFERENCE_MIN_MS or duration_ms > REFERENCE_MAX_MS or reference_duration != duration_ms:
        raise VoiceLabProviderError("actor_reference_duration_invalid")
    fingerprint = ((ACTOR_MANIFEST_FILE, manifest_size, manifest_mtime), (ACTOR_GPT_WEIGHT_FILE, *gpt_identity), (ACTOR_SOVITS_WEIGHT_FILE, *sovits_identity), (ACTOR_REFERENCE_WAV_FILE, *reference_identity))
    return {"actor_dir": actor_dir, "manifest": manifest, "gpt_path": gpt_path, "sovits_path": sovits_path, "reference_wav": reference_wav, "reference_text": reference_text, "reference_duration_ms": duration_ms, "fingerprint": fingerprint}


def training_takes'''
    text = replace_once(text, anchor, insert, "provider-actor-validation")

    anchor = "def embedding(tts: Any, wav_path: Path) -> Any:\n"
    insert = '''@contextmanager
def source_working_directory(source_root: Path) -> Iterator[None]:
    previous = Path.cwd()
    os.chdir(source_root)
    try:
        yield
    finally:
        os.chdir(previous)


def create_tts_runtime(source_root: Path, assets: dict[str, Path], gpt_weight: Path, sovits_weight: Path, reference_wav: Path) -> dict[str, Any]:
    require_regular_file(gpt_weight, "gpt_weight")
    require_regular_file(sovits_weight, "sovits_weight")
    require_regular_file(reference_wav, "reference_wav")
    try:
        import torch
        cuda_available = bool(torch.cuda.is_available())
    except Exception as exc:
        raise VoiceLabProviderError(f"cuda_probe_failed:{type(exc).__name__}") from exc
    device = "cuda:0" if cuda_available else "cpu"
    with source_working_directory(source_root):
        install_headless_my_utils(source_root)
        os.environ["NLTK_DATA"] = str(source_root / "nltk_data")
        os.environ["version"] = VERSION
        from TTS_infer_pack.TTS import TTS, TTS_Config
        config = TTS_Config({"custom": {"device": device, "is_half": cuda_available, "version": VERSION, "t2s_weights_path": str(gpt_weight), "vits_weights_path": str(sovits_weight), "cnhuhbert_base_path": str(assets["hubert_model"]), "bert_base_path": str(assets["bert_model"])}})
        config.configs_path = str(source_root / "GPT_SoVITS" / "configs" / "translateit_tts_runtime.yaml")
        tts = TTS(config)
        tts.set_ref_audio(str(reference_wav))
    return {"tts": tts, "device": device, "reference_wav": reference_wav, "reference_cached": True}


def english_tts_inputs(text: str, reference_wav: Path, reference_text: str) -> dict[str, Any]:
    return {"text": text, "text_lang": "en", "ref_audio_path": str(reference_wav), "prompt_text": reference_text, "prompt_lang": "en", "batch_size": 1, "parallel_infer": False, "return_fragment": False, "streaming_mode": False, "seed": 233333}


def embedding(tts: Any, wav_path: Path) -> Any:
'''
    text = replace_once(text, anchor, insert, "provider-runtime-helpers")

    start = text.index("def evaluate(source_root: Path")
    end = text.index("\n\ndef build_candidate", start)
    old_eval = text[start:end]
    new_eval = '''def evaluate(source_root: Path, assets: dict[str, Path], candidate: Path, evaluation: Path, manifest: dict[str, Any], reference: dict[str, Any]) -> list[dict[str, Any]]:
    import torch.nn.functional as functional
    reference_wav = candidate / "reference.wav"
    runtime = create_tts_runtime(source_root, assets, candidate / "gpt.ckpt", candidate / "sovits.pth", reference_wav)
    tts = runtime["tts"]
    ref_embedding = embedding(tts, reference_wav)
    samples: list[dict[str, Any]] = []
    for held in manifest["held_out_lines"]:
        line_id = int(held["line_id"])
        held_text = str(held["exact_text"]).strip()
        outputs = list(tts.run(english_tts_inputs(held_text, reference_wav, str(reference["exact_text"]))))
        if len(outputs) != 1:
            raise VoiceLabProviderError(f"evaluation_output_count:{line_id}:{len(outputs)}")
        sr, audio = outputs[0]
        wav_file = f"held_out_{line_id}.wav"
        wav_path = evaluation / wav_file
        write_wav(wav_path, int(sr), audio)
        score = float(functional.cosine_similarity(ref_embedding, embedding(tts, wav_path), dim=-1).mean().item())
        if not math.isfinite(score):
            raise VoiceLabProviderError(f"evaluation_similarity_invalid:{line_id}")
        samples.append({"line_id": line_id, "exact_text": held_text, "wav_file": wav_file, "speaker_similarity": round(score, 6)})
    return samples


def load_voice_actor_runtime(source_root: Path, actor_dir: Path) -> dict[str, Any]:
    package = validate_actor_package(actor_dir)
    assets = inference_source_assets(source_root)
    runtime = create_tts_runtime(source_root, assets, package["gpt_path"], package["sovits_path"], package["reference_wav"])
    runtime.update({"actor_dir": actor_dir, "reference_text": package["reference_text"], "reference_duration_ms": package["reference_duration_ms"], "fingerprint": package["fingerprint"]})
    return runtime


def synthesize_voice_actor(runtime: dict[str, Any], text: str, output_path: Path) -> dict[str, Any]:
    tts = runtime.get("tts")
    reference_wav = runtime.get("reference_wav")
    reference_text = str(runtime.get("reference_text", "")).strip()
    if tts is None or not isinstance(reference_wav, Path) or not reference_text:
        raise VoiceLabProviderError("voice_actor_runtime_invalid")
    outputs = list(tts.run(english_tts_inputs(text, reference_wav, reference_text)))
    if len(outputs) != 1:
        raise VoiceLabProviderError(f"inference_output_count:{len(outputs)}")
    sample_rate, audio = outputs[0]
    write_wav(output_path, int(sample_rate), audio)
    if not output_path.is_file() or output_path.stat().st_size <= 44:
        raise VoiceLabProviderError("inference_audio_invalid")
    return {"sample_rate": int(sample_rate), "device": str(runtime.get("device", "unknown")), "reference_cached": bool(runtime.get("reference_cached"))}
'''
    text = text[:start] + new_eval + text[end:]
    PROVIDER_PATH.write_text(text, encoding="utf-8", newline="\n")


def patch_worker() -> None:
    text = WORKER_PATH.read_text(encoding="utf-8")
    text = replace_once(text, "from typing import Any\n", "from typing import Any\n\nimport voice_lab_gpt_sovits as voice_actor_provider\n", "worker-provider-import")
    text = replace_once(text, 'PIPER_ROOT = RUNTIME_ASSETS_ROOT / "Voice" / "Piper"\n', 'PIPER_ROOT = RUNTIME_ASSETS_ROOT / "Voice" / "Piper"\nGPT_SOVITS_SOURCE_ROOT = RUNTIME_ASSETS_ROOT / "Voice" / "GPTSoVITS" / "Source"\nVOICE_ACTOR_ROOT = USER_DATA_ROOT / "SavedProject" / "VoiceLab" / "MyVoice"\n', "worker-roots")
    text = replace_once(text, 'SAPI_STATUS: tuple[bool, list[dict[str, str]], str] | None = None\n', 'SAPI_STATUS: tuple[bool, list[dict[str, str]], str] | None = None\nVOICE_ACTOR_RUNTIME: dict[str, Any] | None = None\nVOICE_ACTOR_RUNTIME_FINGERPRINT: Any | None = None\n', "worker-cache")
    anchor = "def resolve_worker_path(value: Any, default_path: Path, allowed_roots: list[Path]) -> Path:\n"
    insert = '''def clear_voice_actor_runtime() -> None:
    global VOICE_ACTOR_RUNTIME, VOICE_ACTOR_RUNTIME_FINGERPRINT
    VOICE_ACTOR_RUNTIME = None
    VOICE_ACTOR_RUNTIME_FINGERPRINT = None


def voice_actor_blocker(exc: Exception) -> str:
    detail = str(exc).strip()
    if isinstance(exc, voice_actor_provider.VoiceLabProviderError) and detail:
        safe = "".join(character for character in detail if character.isascii() and (character.isalnum() or character in "_:-"))
        if safe:
            return f"voice_actor:{safe[:160]}"
    return f"voice_actor:runtime_failed:{type(exc).__name__}"


def get_voice_actor_runtime() -> dict[str, Any]:
    global VOICE_ACTOR_RUNTIME, VOICE_ACTOR_RUNTIME_FINGERPRINT
    try:
        package = voice_actor_provider.validate_actor_package(VOICE_ACTOR_ROOT)
    except Exception:
        clear_voice_actor_runtime()
        raise
    fingerprint = package["fingerprint"]
    if VOICE_ACTOR_RUNTIME is not None and VOICE_ACTOR_RUNTIME_FINGERPRINT == fingerprint:
        return VOICE_ACTOR_RUNTIME
    clear_voice_actor_runtime()
    runtime = voice_actor_provider.load_voice_actor_runtime(GPT_SOVITS_SOURCE_ROOT, VOICE_ACTOR_ROOT)
    if runtime.get("fingerprint") != fingerprint:
        clear_voice_actor_runtime()
        raise voice_actor_provider.VoiceLabProviderError("actor_changed_during_load")
    latest = voice_actor_provider.validate_actor_package(VOICE_ACTOR_ROOT)
    if latest["fingerprint"] != fingerprint:
        clear_voice_actor_runtime()
        raise voice_actor_provider.VoiceLabProviderError("actor_changed_during_load")
    VOICE_ACTOR_RUNTIME = runtime
    VOICE_ACTOR_RUNTIME_FINGERPRINT = fingerprint
    return runtime


def resolve_worker_path(value: Any, default_path: Path, allowed_roots: list[Path]) -> Path:
'''
    text = replace_once(text, anchor, insert, "worker-runtime-owner")
    anchor = "def handle_tts_preflight(payload: dict[str, Any]) -> dict[str, Any]:\n"
    insert = '''def handle_voice_actor_preflight(_payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    try:
        runtime = get_voice_actor_runtime()
        return {"ok": True, "stage": "voice_actor_preflight", "voice_id": "MyVoice", "language_code": "en", "device": str(runtime.get("device", "unknown")), "reference_cached": bool(runtime.get("reference_cached")), "elapsed_ms": now_ms() - started, "blocker": "", "note": "The approved My Voice actor is loaded for local English synthesis."}
    except Exception as exc:
        return {"ok": False, "stage": "voice_actor_preflight", "voice_id": "MyVoice", "language_code": "en", "blocker": voice_actor_blocker(exc), "elapsed_ms": now_ms() - started, "note": "The approved My Voice actor could not be loaded."}


def handle_voice_actor_synthesize(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    if runtime_text_too_large(payload.get("text", ""), MAX_TTS_TEXT_CHARS):
        return {"ok": False, "stage": "voice_actor_synthesize", "blocker": "voice_actor:text_too_large", "max_chars": MAX_TTS_TEXT_CHARS}
    actor_text = compact_runtime_text(payload.get("text", ""), MAX_TTS_TEXT_CHARS)
    if not actor_text:
        return {"ok": False, "stage": "voice_actor_synthesize", "blocker": "voice_actor:empty_text"}
    try:
        output_path = resolve_worker_path(payload.get("output_path", ""), CACHE_ROOT / "voice_actor_output.wav", ALLOWED_OUTPUT_ROOTS)
    except Exception as exc:
        return {"ok": False, "stage": "voice_actor_synthesize", "blocker": type(exc).__name__, "note": str(exc), "elapsed_ms": now_ms() - started}
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.unlink(missing_ok=True)
    try:
        runtime = get_voice_actor_runtime()
        synthesis = voice_actor_provider.synthesize_voice_actor(runtime, actor_text, output_path)
        if not output_path.is_file() or output_path.stat().st_size <= 44:
            raise voice_actor_provider.VoiceLabProviderError("inference_audio_invalid")
        return {"ok": True, "stage": "voice_actor_synthesize", "voice_id": "MyVoice", "language_code": "en", "device": synthesis["device"], "reference_cached": synthesis["reference_cached"], "sample_rate": synthesis["sample_rate"], "output_path": str(output_path), "elapsed_ms": now_ms() - started, "blocker": ""}
    except Exception as exc:
        output_path.unlink(missing_ok=True)
        return {"ok": False, "stage": "voice_actor_synthesize", "voice_id": "MyVoice", "language_code": "en", "blocker": voice_actor_blocker(exc), "elapsed_ms": now_ms() - started, "note": "My Voice synthesis failed without switching to another voice."}


def handle_tts_preflight(payload: dict[str, Any]) -> dict[str, Any]:
'''
    text = replace_once(text, anchor, insert, "worker-handlers")
    text = replace_once(text, '    "tts_preflight": handle_tts_preflight,\n    "synthesize": handle_synthesize,\n', '    "tts_preflight": handle_tts_preflight,\n    "synthesize": handle_synthesize,\n    "voice_actor_preflight": handle_voice_actor_preflight,\n    "voice_actor_synthesize": handle_voice_actor_synthesize,\n', "worker-handler-registration")
    WORKER_PATH.write_text(text, encoding="utf-8", newline="\n")


def write_tests() -> None:
    TEST_PATH.write_text('''from __future__ import annotations

import json
import wave
from pathlib import Path

import pytest

from test_worker_contract import load_worker_module


def load_provider_module():
    return load_worker_module().voice_actor_provider


def write_reference_wav(path: Path, duration_ms: int = 4_000) -> None:
    sample_rate = 32_000
    frames = sample_rate * duration_ms // 1_000
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(sample_rate)
        writer.writeframes(b"\\0\\0" * frames)


def write_actor(root: Path, revision: str | None = None) -> None:
    root.mkdir(parents=True, exist_ok=True)
    (root / "gpt.ckpt").write_bytes(b"gpt")
    (root / "sovits.pth").write_bytes(b"sovits")
    write_reference_wav(root / "reference.wav")
    (root / "actor.json").write_text(json.dumps({"schema_version": 1, "engine": "gpt-sovits-v2proplus", "engine_revision": revision or "d523079fc05d9a8028d6085bffe4a2757c32abb6", "gpt_weight_file": "gpt.ckpt", "sovits_weight_file": "sovits.pth", "reference_wav_file": "reference.wav", "reference_text": "Tomorrow we will review the final project timeline.", "reference_duration_ms": 4_000, "held_out_evaluation_complete": True}), encoding="utf-8")


def test_actor_package_validation_matches_approved_contract(tmp_path: Path) -> None:
    provider = load_provider_module()
    actor = tmp_path / "MyVoice"
    write_actor(actor)
    package = provider.validate_actor_package(actor)
    assert package["reference_duration_ms"] == 4_000
    assert package["gpt_path"] == actor / "gpt.ckpt"
    assert len(package["fingerprint"]) == 4
    write_actor(actor, revision="0" * 40)
    with pytest.raises(provider.VoiceLabProviderError, match="actor_engine_contract_mismatch"):
        provider.validate_actor_package(actor)


def test_source_working_directory_is_restored(tmp_path: Path) -> None:
    provider = load_provider_module()
    original = Path.cwd()
    target = tmp_path / "source"
    target.mkdir()
    with provider.source_working_directory(target):
        assert Path.cwd() == target
    assert Path.cwd() == original


def test_worker_reuses_actor_runtime_until_package_identity_changes(monkeypatch) -> None:
    worker = load_worker_module()
    worker.clear_voice_actor_runtime()
    current = {"fingerprint": (("actor.json", 1, 1),)}
    loads: list[object] = []
    monkeypatch.setattr(worker.voice_actor_provider, "validate_actor_package", lambda _path: {"fingerprint": current["fingerprint"]})
    def load_runtime(_source, _actor):
        loads.append(current["fingerprint"])
        return {"fingerprint": current["fingerprint"], "device": "cpu", "reference_cached": True}
    monkeypatch.setattr(worker.voice_actor_provider, "load_voice_actor_runtime", load_runtime)
    first = worker.get_voice_actor_runtime()
    second = worker.get_voice_actor_runtime()
    assert first is second
    assert len(loads) == 1
    current["fingerprint"] = (("actor.json", 2, 2),)
    third = worker.get_voice_actor_runtime()
    assert third is not first
    assert len(loads) == 2


def test_voice_actor_synthesis_uses_only_myvoice_path(tmp_path: Path, monkeypatch) -> None:
    worker = load_worker_module()
    cache = tmp_path / "CacheData"
    cache.mkdir()
    monkeypatch.setattr(worker, "CACHE_ROOT", cache)
    monkeypatch.setattr(worker, "ALLOWED_OUTPUT_ROOTS", [cache])
    monkeypatch.setattr(worker, "select_english_tts_voice", lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("legacy TTS must not run")))
    monkeypatch.setattr(worker, "get_voice_actor_runtime", lambda: {"device": "cpu", "reference_cached": True})
    def synthesize(_runtime, _text, output_path):
        output_path.write_bytes(b"R" * 80)
        return {"sample_rate": 32_000, "device": "cpu", "reference_cached": True}
    monkeypatch.setattr(worker.voice_actor_provider, "synthesize_voice_actor", synthesize)
    output = cache / "myvoice.wav"
    result = worker.handle_voice_actor_synthesize({"text": "Hello from My Voice.", "output_path": str(output)})
    assert result["ok"] is True
    assert result["voice_id"] == "MyVoice"
    assert result["sample_rate"] == 32_000
    assert Path(result["output_path"]) == output


def test_voice_actor_failure_removes_stale_output_and_never_falls_back(tmp_path: Path, monkeypatch) -> None:
    worker = load_worker_module()
    cache = tmp_path / "CacheData"
    cache.mkdir()
    output = cache / "stale.wav"
    output.write_bytes(b"old" * 40)
    monkeypatch.setattr(worker, "CACHE_ROOT", cache)
    monkeypatch.setattr(worker, "ALLOWED_OUTPUT_ROOTS", [cache])
    monkeypatch.setattr(worker, "select_english_tts_voice", lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("legacy TTS must not run")))
    def unavailable():
        raise worker.voice_actor_provider.VoiceLabProviderError("approved_actor_missing")
    monkeypatch.setattr(worker, "get_voice_actor_runtime", unavailable)
    result = worker.handle_voice_actor_synthesize({"text": "Hello.", "output_path": str(output)})
    assert result["ok"] is False
    assert result["blocker"] == "voice_actor:approved_actor_missing"
    assert not output.exists()


def test_worker_protocol_registers_a5_actor_commands() -> None:
    worker = load_worker_module()
    assert worker.HANDLERS["voice_actor_preflight"] is worker.handle_voice_actor_preflight
    assert worker.HANDLERS["voice_actor_synthesize"] is worker.handle_voice_actor_synthesize
''', encoding="utf-8", newline="\n")


def validate() -> None:
    for path in (PROVIDER_PATH, WORKER_PATH, TEST_PATH):
        compile(path.read_text(encoding="utf-8"), str(path), "exec")
    subprocess.run(["git", "diff", "--check"], check=True)
    changed = sorted(subprocess.check_output(["git", "diff", "--name-only"], text=True).splitlines())
    expected = sorted(str(path.relative_to(ROOT)).replace("\\", "/") for path in (PROVIDER_PATH, WORKER_PATH, TEST_PATH))
    if changed != expected:
        raise RuntimeError(f"unexpected changed files: {changed!r} != {expected!r}")
    for path in (WORKER_PATH, PROVIDER_PATH, TEST_PATH):
        blob = subprocess.check_output(["git", "hash-object", str(path)], text=True).strip()
        print(f"A5_LOCAL_BLOB {str(path.relative_to(ROOT)).replace(chr(92), '/')} {blob}")


if __name__ == "__main__":
    patch_provider()
    patch_worker()
    write_tests()
    validate()
