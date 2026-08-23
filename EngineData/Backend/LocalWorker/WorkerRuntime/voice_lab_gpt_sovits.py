"""Pinned GPT-SoVITS V2ProPlus provider for VoiceLab build and trained-actor inference."""

from __future__ import annotations

import gc
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import wave
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable, Iterator

from voice_lab_upstream_stage import install_headless_my_utils

ENGINE = "gpt-sovits-v2proplus"
ENGINE_REVISION = "d523079fc05d9a8028d6085bffe4a2757c32abb6"
VERSION = "v2ProPlus"
REFERENCE_MIN_MS = 3_000
REFERENCE_MAX_MS = 10_000
REFERENCE_TARGET_MS = 5_000
SOVITS_EPOCHS = 8
GPT_EPOCHS = 15
MAX_TRAINING_CANDIDATES = 3
ACTOR_SCHEMA_VERSION = 1
ACTOR_MANIFEST_FILE = "actor.json"
ACTOR_GPT_WEIGHT_FILE = "gpt.ckpt"
ACTOR_SOVITS_WEIGHT_FILE = "sovits.pth"
ACTOR_REFERENCE_WAV_FILE = "reference.wav"
MAX_ACTOR_MANIFEST_BYTES = 64 * 1024


class VoiceLabProviderError(RuntimeError):
    pass


def require_file(path: Path, label: str) -> None:
    if not path.is_file() or path.stat().st_size <= 0:
        raise VoiceLabProviderError(f"missing_asset:{label}")


def require_dir(path: Path, label: str) -> None:
    if not path.is_dir():
        raise VoiceLabProviderError(f"missing_asset:{label}")


def validate_source_revision(source_root: Path) -> Path:
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


def wav_duration_ms(path: Path) -> int:
    try:
        with wave.open(str(path), "rb") as reader:
            if reader.getnchannels() != 1 or reader.getsampwidth() != 2 or reader.getframerate() != 32_000:
                raise VoiceLabProviderError(f"noncanonical_take:{path.name}")
            frames = reader.getnframes()
    except VoiceLabProviderError:
        raise
    except Exception as exc:
        raise VoiceLabProviderError(f"invalid_take:{path.name}") from exc
    if frames <= 0:
        raise VoiceLabProviderError(f"empty_take:{path.name}")
    return frames * 1_000 // 32_000


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


def training_takes(dataset_dir: Path, manifest: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    ids: set[int] = set()
    texts: set[str] = set()
    for item in manifest["takes"]:
        if not isinstance(item, dict):
            raise VoiceLabProviderError("invalid_training_take")
        line_id = int(item.get("line_id", 0))
        text = str(item.get("exact_text", "")).strip()
        wav_file = str(item.get("wav_file", "")).strip()
        if line_id <= 0 or not text or not wav_file or Path(wav_file).name != wav_file:
            raise VoiceLabProviderError("invalid_training_take")
        wav_path = dataset_dir / wav_file
        result.append({"line_id": line_id, "exact_text": text, "wav_file": wav_file, "wav_path": wav_path, "duration_ms": wav_duration_ms(wav_path)})
        ids.add(line_id)
        texts.add(text)

    seen: set[int] = set()
    for item in manifest["held_out_lines"]:
        if not isinstance(item, dict):
            raise VoiceLabProviderError("invalid_held_out_line")
        line_id = int(item.get("line_id", 0))
        text = str(item.get("exact_text", "")).strip()
        if line_id <= 0 or not text or line_id in ids or text in texts or line_id in seen:
            raise VoiceLabProviderError("invalid_held_out_line")
        seen.add(line_id)
    return result


def select_reference(takes: list[dict[str, Any]]) -> dict[str, Any]:
    eligible = [x for x in takes if REFERENCE_MIN_MS <= int(x["duration_ms"]) <= REFERENCE_MAX_MS]
    if not eligible:
        raise VoiceLabProviderError("reference_take_3_to_10_seconds_required")
    return min(eligible, key=lambda x: (abs(int(x["duration_ms"]) - REFERENCE_TARGET_MS), int(x["line_id"])))


def run_stage(source_root: Path, script: Path, env: dict[str, str], *args: str) -> None:
    child_env = os.environ.copy()
    child_env.update(env)
    child_env["PYTHONNOUSERSITE"] = "1"
    child_env["NLTK_DATA"] = str(source_root / "nltk_data")
    runner = Path(__file__).resolve().with_name("voice_lab_upstream_stage.py")
    require_file(runner, "headless_stage_runner")
    result = subprocess.run([sys.executable, "-s", str(runner), str(source_root), str(script), *args], cwd=str(source_root), env=child_env, check=False)
    if result.returncode != 0:
        raise VoiceLabProviderError(f"upstream_stage_failed:{script.name}:{result.returncode}")


def merge_part(source: Path, target: Path, header: str | None = None) -> None:
    require_file(source, source.name)
    body = source.read_text(encoding="utf-8").strip()
    if not body:
        raise VoiceLabProviderError(f"upstream_output_empty:{source.name}")
    target.write_text((f"{header}\n" if header else "") + body + "\n", encoding="utf-8", newline="\n")
    source.unlink(missing_ok=True)


def prepare_dataset(source_root: Path, assets: dict[str, Path], dataset_dir: Path, exp: Path, takes: list[dict[str, Any]]) -> None:
    exp.mkdir(parents=True, exist_ok=True)
    list_path = exp.parent / "translateit.list"
    list_path.write_text("\n".join(f"{x['wav_file']}|MyVoice|en|{x['exact_text']}" for x in takes) + "\n", encoding="utf-8", newline="\n")
    common = {"inp_text": str(list_path), "inp_wav_dir": str(dataset_dir), "exp_name": "translateit_myvoice", "opt_dir": str(exp), "i_part": "0", "all_parts": "1", "is_half": "True", "version": VERSION}
    env = {**common, "bert_pretrained_dir": str(assets["bert_model"])}
    run_stage(source_root, assets["text"], env)
    merge_part(exp / "2-name2text-0.txt", exp / "2-name2text.txt")

    env = {**common, "cnhubert_base_dir": str(assets["hubert_model"])}
    run_stage(source_root, assets["hubert"], env)
    env = {**common, "sv_path": str(assets["sv_model"])}
    run_stage(source_root, assets["sv"], env)
    require_dir(exp / "7-sv_cn", "speaker_embedding_output")

    env = {**common, "pretrained_s2G": str(assets["pretrained_sovits_g"]), "s2config_path": str(assets["s2_config"])}
    run_stage(source_root, assets["semantic"], env)
    merge_part(exp / "6-name2semantic-0.tsv", exp / "6-name2semantic.tsv", "item_name\tsemantic_audio")


def batch_and_half() -> tuple[int, bool]:
    import torch
    if not torch.cuda.is_available():
        return 1, False
    memory_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3) + 0.4
    return max(1, int(memory_gb // 2)), True


def training_configs(assets: dict[str, Path], exp: Path, sovits_dir: Path, gpt_dir: Path) -> tuple[Path, Path, dict[str, str]]:
    import yaml
    batch, half = batch_and_half()
    sovits_save_every = max(1, SOVITS_EPOCHS // MAX_TRAINING_CANDIDATES)
    gpt_save_every = max(1, GPT_EPOCHS // MAX_TRAINING_CANDIDATES)

    s2 = json.loads(assets["s2_config"].read_text(encoding="utf-8"))
    s2["train"].update({"batch_size": batch if half else max(1, batch // 2), "epochs": SOVITS_EPOCHS, "text_low_lr_rate": 0.4, "pretrained_s2G": str(assets["pretrained_sovits_g"]), "pretrained_s2D": str(assets["pretrained_sovits_d"]), "if_save_latest": True, "if_save_every_weights": True, "save_every_epoch": sovits_save_every, "gpu_numbers": "0", "grad_ckpt": False, "lora_rank": "32", "fp16_run": half})
    s2["model"]["version"] = VERSION
    s2["data"]["exp_dir"] = str(exp)
    s2["s2_ckpt_dir"] = str(exp)
    s2["save_weight_dir"] = str(sovits_dir)
    s2["name"] = "translateit_myvoice"
    s2["version"] = VERSION
    s2_path = exp.parent / "translateit_s2.json"
    s2_path.write_text(json.dumps(s2, indent=2) + "\n", encoding="utf-8", newline="\n")

    s1 = yaml.safe_load(assets["s1_config"].read_text(encoding="utf-8"))
    s1["train"].update({"precision": "16-mixed" if half else "32", "batch_size": batch if half else max(1, batch // 2), "epochs": GPT_EPOCHS, "save_every_n_epoch": gpt_save_every, "if_save_every_weights": True, "if_save_latest": True, "if_dpo": False, "half_weights_save_dir": str(gpt_dir), "exp_name": "translateit_myvoice"})
    s1["pretrained_s1"] = str(assets["pretrained_gpt"])
    s1["train_semantic_path"] = str(exp / "6-name2semantic.tsv")
    s1["train_phoneme_path"] = str(exp / "2-name2text.txt")
    s1["output_dir"] = str(exp / f"logs_s1_{VERSION}")
    s1_path = exp.parent / "translateit_s1.yaml"
    s1_path.write_text(yaml.safe_dump(s1, sort_keys=False), encoding="utf-8", newline="\n")
    return s2_path, s1_path, {"version": VERSION, "hz": "25hz", "is_half": str(half), "_CUDA_VISIBLE_DEVICES": "0"}


def checkpoint_epoch(path: Path, family: str) -> int:
    if family == "sovits":
        match = re.search(r"_e(\d+)_s\d+\.pth$", path.name)
    elif family == "gpt":
        match = re.search(r"-e(\d+)\.ckpt$", path.name)
    else:
        raise VoiceLabProviderError(f"unknown_candidate_family:{family}")
    if not match:
        raise VoiceLabProviderError(f"{family}_checkpoint_epoch_unparseable:{path.name}")
    return int(match.group(1))


def epoch_weights(directory: Path, suffix: str, family: str) -> dict[int, Path]:
    result: dict[int, Path] = {}
    for path in directory.glob(f"*{suffix}"):
        if not path.is_file() or path.stat().st_size <= 0:
            continue
        epoch = checkpoint_epoch(path, family)
        if epoch in result:
            raise VoiceLabProviderError(f"{family}_duplicate_checkpoint_epoch:{epoch}")
        result[epoch] = path
    if not result:
        raise VoiceLabProviderError(f"{family}_candidate_checkpoints_missing")
    return result


def nearest_epoch(checkpoints: dict[int, Path], total_epochs: int, progress_numerator: int) -> int:
    if not checkpoints or total_epochs <= 0:
        raise VoiceLabProviderError("candidate_checkpoint_set_invalid")
    denominator = MAX_TRAINING_CANDIDATES
    target = total_epochs * progress_numerator
    return min(checkpoints, key=lambda epoch: (abs(epoch * denominator - target), -epoch))


def select_training_candidates(sovits_dir: Path, gpt_dir: Path) -> list[dict[str, Any]]:
    sovits = epoch_weights(sovits_dir, ".pth", "sovits")
    gpt = epoch_weights(gpt_dir, ".ckpt", "gpt")
    candidates: list[dict[str, Any]] = []
    seen_pairs: set[tuple[int, int]] = set()

    for progress_numerator in range(1, MAX_TRAINING_CANDIDATES + 1):
        sovits_epoch = nearest_epoch(sovits, SOVITS_EPOCHS, progress_numerator)
        gpt_epoch = nearest_epoch(gpt, GPT_EPOCHS, progress_numerator)
        pair = (sovits_epoch, gpt_epoch)
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        candidates.append({
            "candidate_id": f"s{sovits_epoch}-g{gpt_epoch}",
            "candidate_order": len(candidates),
            "sovits_epoch": sovits_epoch,
            "gpt_epoch": gpt_epoch,
            "sovits_path": sovits[sovits_epoch],
            "gpt_path": gpt[gpt_epoch],
        })

    if len(candidates) < 2:
        raise VoiceLabProviderError(f"candidate_checkpoint_set_too_small:{len(candidates)}")
    return candidates[:MAX_TRAINING_CANDIDATES]


def train(source_root: Path, assets: dict[str, Path], exp: Path, candidate: Path) -> list[dict[str, Any]]:
    sovits_dir = candidate / "_sovits_weights"
    gpt_dir = candidate / "_gpt_weights"
    sovits_dir.mkdir(parents=True, exist_ok=True)
    gpt_dir.mkdir(parents=True, exist_ok=True)
    s2, s1, env = training_configs(assets, exp, sovits_dir, gpt_dir)
    run_stage(source_root, assets["sovits_train"], env, "--config", str(s2))
    run_stage(source_root, assets["gpt_train"], env, "--config_file", str(s1))
    return select_training_candidates(sovits_dir, gpt_dir)


def write_wav(path: Path, sample_rate: int, audio: Any) -> None:
    import numpy as np
    values = np.asarray(audio).reshape(-1)
    if values.dtype != np.int16:
        values = np.clip(values, -1.0, 1.0)
        values = (values * 32767.0).astype(np.int16)
    if values.size == 0:
        raise VoiceLabProviderError("evaluation_audio_empty")
    with wave.open(str(path), "wb") as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(sample_rate)
        writer.writeframes(values.tobytes())


@contextmanager
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
        # The GPT-SoVITS import/config path reads process-global env; scope the writes
        # so the resident worker environment is not permanently mutated.
        saved_environment = {key: os.environ.get(key) for key in ("NLTK_DATA", "version")}
        os.environ["NLTK_DATA"] = str(source_root / "nltk_data")
        os.environ["version"] = VERSION
        try:
            from TTS_infer_pack.TTS import TTS, TTS_Config
            config = TTS_Config({"custom": {"device": device, "is_half": cuda_available, "version": VERSION, "t2s_weights_path": str(gpt_weight), "vits_weights_path": str(sovits_weight), "cnhuhbert_base_path": str(assets["hubert_model"]), "bert_base_path": str(assets["bert_model"])}})
            config.configs_path = str(source_root / "GPT_SoVITS" / "configs" / "translateit_tts_runtime.yaml")
            tts = TTS(config)
            tts.set_ref_audio(str(reference_wav))
        finally:
            for key, value in saved_environment.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
    return {"tts": tts, "device": device, "reference_wav": reference_wav, "reference_cached": True}


def english_tts_inputs(text: str, reference_wav: Path, reference_text: str) -> dict[str, Any]:
    return {"text": text, "text_lang": "en", "ref_audio_path": str(reference_wav), "prompt_text": reference_text, "prompt_lang": "en", "batch_size": 1, "parallel_infer": False, "return_fragment": False, "streaming_mode": False, "seed": 233333}


def embedding(tts: Any, wav_path: Path) -> Any:
    import torchaudio
    wav, sr = torchaudio.load(str(wav_path))
    wav = wav.mean(dim=0, keepdim=True)
    if sr != 16_000:
        wav = torchaudio.functional.resample(wav, sr, 16_000)
    return tts.sv_model.compute_embedding3(wav.to(tts.configs.device)).detach().float().cpu()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def evaluate_candidate(source_root: Path, assets: dict[str, Path], candidate: dict[str, Any], evaluation_root: Path, manifest: dict[str, Any], reference: dict[str, Any]) -> dict[str, Any]:
    import torch
    import torch.nn.functional as functional

    candidate_id = str(candidate["candidate_id"])
    candidate_dir = evaluation_root / candidate_id
    candidate_dir.mkdir(parents=True, exist_ok=True)
    reference_wav = Path(reference["wav_path"])
    runtime = create_tts_runtime(source_root, assets, Path(candidate["gpt_path"]), Path(candidate["sovits_path"]), reference_wav)
    tts = runtime["tts"]
    samples: list[dict[str, Any]] = []
    try:
        ref_embedding = embedding(tts, reference_wav)
        for held in manifest["held_out_lines"]:
            line_id = int(held["line_id"])
            held_text = str(held["exact_text"]).strip()
            outputs = list(tts.run(english_tts_inputs(held_text, reference_wav, str(reference["exact_text"]))))
            if len(outputs) != 1:
                raise VoiceLabProviderError(f"evaluation_output_count:{candidate_id}:{line_id}:{len(outputs)}")
            sr, audio = outputs[0]
            wav_path = candidate_dir / f"held_out_{line_id}.wav"
            write_wav(wav_path, int(sr), audio)
            score = float(functional.cosine_similarity(ref_embedding, embedding(tts, wav_path), dim=-1).mean().item())
            if not math.isfinite(score):
                raise VoiceLabProviderError(f"evaluation_similarity_invalid:{candidate_id}:{line_id}")
            samples.append({"line_id": line_id, "exact_text": held_text, "speaker_similarity": round(score, 6), "sha256": sha256_file(wav_path), "_wav_path": wav_path})
    finally:
        del tts
        del runtime
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    if len(samples) != len(manifest["held_out_lines"]):
        raise VoiceLabProviderError(f"held_out_evaluation_incomplete:{candidate_id}")
    similarities = [float(sample["speaker_similarity"]) for sample in samples]
    return {"candidate_id": candidate_id, "candidate_order": int(candidate["candidate_order"]), "sovits_epoch": int(candidate["sovits_epoch"]), "gpt_epoch": int(candidate["gpt_epoch"]), "sovits_path": Path(candidate["sovits_path"]), "gpt_path": Path(candidate["gpt_path"]), "mean_speaker_similarity": round(sum(similarities) / len(similarities), 6), "minimum_speaker_similarity": round(min(similarities), 6), "samples": samples}


def select_best_candidate(evidence: list[dict[str, Any]]) -> dict[str, Any]:
    if len(evidence) < 2 or len(evidence) > MAX_TRAINING_CANDIDATES:
        raise VoiceLabProviderError(f"candidate_evidence_count_invalid:{len(evidence)}")
    for candidate in evidence:
        samples = candidate.get("samples")
        mean_similarity = candidate.get("mean_speaker_similarity")
        minimum_similarity = candidate.get("minimum_speaker_similarity")
        if not isinstance(samples, list) or not samples:
            raise VoiceLabProviderError("candidate_evidence_samples_missing")
        if not isinstance(mean_similarity, (int, float)) or not math.isfinite(float(mean_similarity)):
            raise VoiceLabProviderError("candidate_evidence_mean_invalid")
        if not isinstance(minimum_similarity, (int, float)) or not math.isfinite(float(minimum_similarity)):
            raise VoiceLabProviderError("candidate_evidence_minimum_invalid")
    return max(evidence, key=lambda candidate: (float(candidate["mean_speaker_similarity"]), float(candidate["minimum_speaker_similarity"]), -int(candidate["candidate_order"])))


def public_candidate_evidence(candidate: dict[str, Any]) -> dict[str, Any]:
    return {"candidate_id": str(candidate["candidate_id"]), "sovits_epoch": int(candidate["sovits_epoch"]), "gpt_epoch": int(candidate["gpt_epoch"]), "mean_speaker_similarity": float(candidate["mean_speaker_similarity"]), "minimum_speaker_similarity": float(candidate["minimum_speaker_similarity"]), "samples": [{"line_id": int(sample["line_id"]), "exact_text": str(sample["exact_text"]), "speaker_similarity": float(sample["speaker_similarity"]), "sha256": str(sample["sha256"])} for sample in candidate["samples"]]}


def promote_selected_candidate(selected: dict[str, Any], candidate_dir: Path, evaluation_dir: Path, reference: dict[str, Any]) -> list[dict[str, Any]]:
    shutil.copy2(Path(selected["gpt_path"]), candidate_dir / ACTOR_GPT_WEIGHT_FILE)
    shutil.copy2(Path(selected["sovits_path"]), candidate_dir / ACTOR_SOVITS_WEIGHT_FILE)
    shutil.copy2(Path(reference["wav_path"]), candidate_dir / ACTOR_REFERENCE_WAV_FILE)

    selected_samples: list[dict[str, Any]] = []
    for sample in selected["samples"]:
        line_id = int(sample["line_id"])
        wav_file = f"held_out_{line_id}.wav"
        target = evaluation_dir / wav_file
        shutil.copy2(Path(sample["_wav_path"]), target)
        if sha256_file(target) != str(sample["sha256"]):
            raise VoiceLabProviderError(f"selected_evaluation_copy_hash_mismatch:{line_id}")
        selected_samples.append({"line_id": line_id, "exact_text": str(sample["exact_text"]), "wav_file": wav_file, "speaker_similarity": float(sample["speaker_similarity"])})
    return selected_samples


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


def build_candidate(*, source_root: Path, dataset_dir: Path, candidate_dir: Path, evaluation_dir: Path, work_dir: Path, manifest: dict[str, Any], status_writer: Callable[[str, str], None]) -> None:
    assets = source_assets(source_root)
    takes = training_takes(dataset_dir, manifest)
    reference = select_reference(takes)
    for path in (candidate_dir, evaluation_dir, work_dir):
        if path.exists():
            shutil.rmtree(path)
        path.mkdir(parents=True, exist_ok=True)

    exp = work_dir / "experiment"
    prepare_dataset(source_root, assets, dataset_dir, exp, takes)
    status_writer("training", "Creating bounded Voice Actor training candidates from accepted recordings.")
    candidates = train(source_root, assets, exp, candidate_dir)

    status_writer("evaluating", "Comparing held-out Voice Actor candidates before review.")
    candidate_evaluation_root = work_dir / "candidate_evaluation"
    candidate_evaluation_root.mkdir(parents=True, exist_ok=True)
    evidence = [evaluate_candidate(source_root, assets, candidate, candidate_evaluation_root, manifest, reference) for candidate in candidates]
    selected = select_best_candidate(evidence)
    selected_samples = promote_selected_candidate(selected, candidate_dir, evaluation_dir, reference)

    selection_method = "held_out_mean_speaker_similarity_then_minimum_tiebreak"
    evaluation_payload = {"schema_version": 1, "engine": ENGINE, "engine_revision": ENGINE_REVISION, "selection_method": selection_method, "selected_candidate_id": str(selected["candidate_id"]), "selected_candidate": public_candidate_evidence(selected), "candidate_evidence": [public_candidate_evidence(candidate) for candidate in evidence], "samples": selected_samples}
    (evaluation_dir / "evaluation.json").write_text(json.dumps(evaluation_payload, indent=2) + "\n", encoding="utf-8", newline="\n")
    actor_payload = {"schema_version": 1, "engine": ENGINE, "engine_revision": ENGINE_REVISION, "gpt_weight_file": ACTOR_GPT_WEIGHT_FILE, "sovits_weight_file": ACTOR_SOVITS_WEIGHT_FILE, "reference_wav_file": ACTOR_REFERENCE_WAV_FILE, "reference_text": reference["exact_text"], "reference_duration_ms": int(reference["duration_ms"]), "held_out_evaluation_complete": True, "candidate_selection": {"method": selection_method, "candidate_id": str(selected["candidate_id"]), "sovits_epoch": int(selected["sovits_epoch"]), "gpt_epoch": int(selected["gpt_epoch"]), "mean_speaker_similarity": float(selected["mean_speaker_similarity"]), "minimum_speaker_similarity": float(selected["minimum_speaker_similarity"])}}
    (candidate_dir / "actor.json").write_text(json.dumps(actor_payload, indent=2) + "\n", encoding="utf-8", newline="\n")

    shutil.rmtree(candidate_evaluation_root, ignore_errors=True)
    shutil.rmtree(candidate_dir / "_sovits_weights", ignore_errors=True)
    shutil.rmtree(candidate_dir / "_gpt_weights", ignore_errors=True)
