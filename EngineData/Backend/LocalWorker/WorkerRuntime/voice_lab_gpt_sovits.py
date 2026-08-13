"""Pinned GPT-SoVITS V2ProPlus provider adapter for VoiceLab build only."""

from __future__ import annotations

import json
import math
import os
import shutil
import subprocess
import sys
import wave
from pathlib import Path
from typing import Any, Callable

from voice_lab_upstream_stage import install_headless_my_utils

ENGINE = "gpt-sovits-v2proplus"
ENGINE_REVISION = "d523079fc05d9a8028d6085bffe4a2757c32abb6"
VERSION = "v2ProPlus"
REFERENCE_MIN_MS = 3_000
REFERENCE_MAX_MS = 10_000
REFERENCE_TARGET_MS = 5_000
SOVITS_EPOCHS = 8
GPT_EPOCHS = 15


class VoiceLabProviderError(RuntimeError):
    pass


def require_file(path: Path, label: str) -> None:
    if not path.is_file() or path.stat().st_size <= 0:
        raise VoiceLabProviderError(f"missing_asset:{label}")


def require_dir(path: Path, label: str) -> None:
    if not path.is_dir():
        raise VoiceLabProviderError(f"missing_asset:{label}")


def source_assets(source_root: Path) -> dict[str, Path]:
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
    s2 = json.loads(assets["s2_config"].read_text(encoding="utf-8"))
    s2["train"].update({"batch_size": batch if half else max(1, batch // 2), "epochs": SOVITS_EPOCHS, "text_low_lr_rate": 0.4, "pretrained_s2G": str(assets["pretrained_sovits_g"]), "pretrained_s2D": str(assets["pretrained_sovits_d"]), "if_save_latest": True, "if_save_every_weights": True, "save_every_epoch": SOVITS_EPOCHS, "gpu_numbers": "0", "grad_ckpt": False, "lora_rank": "32", "fp16_run": half})
    s2["model"]["version"] = VERSION
    s2["data"]["exp_dir"] = str(exp)
    s2["s2_ckpt_dir"] = str(exp)
    s2["save_weight_dir"] = str(sovits_dir)
    s2["name"] = "translateit_myvoice"
    s2["version"] = VERSION
    s2_path = exp.parent / "translateit_s2.json"
    s2_path.write_text(json.dumps(s2, indent=2) + "\n", encoding="utf-8", newline="\n")

    s1 = yaml.safe_load(assets["s1_config"].read_text(encoding="utf-8"))
    s1["train"].update({"precision": "16-mixed" if half else "32", "batch_size": batch if half else max(1, batch // 2), "epochs": GPT_EPOCHS, "save_every_n_epoch": GPT_EPOCHS, "if_save_every_weights": True, "if_save_latest": True, "if_dpo": False, "half_weights_save_dir": str(gpt_dir), "exp_name": "translateit_myvoice"})
    s1["pretrained_s1"] = str(assets["pretrained_gpt"])
    s1["train_semantic_path"] = str(exp / "6-name2semantic.tsv")
    s1["train_phoneme_path"] = str(exp / "2-name2text.txt")
    s1["output_dir"] = str(exp / f"logs_s1_{VERSION}")
    s1_path = exp.parent / "translateit_s1.yaml"
    s1_path.write_text(yaml.safe_dump(s1, sort_keys=False), encoding="utf-8", newline="\n")
    return s2_path, s1_path, {"version": VERSION, "hz": "25hz", "is_half": str(half), "_CUDA_VISIBLE_DEVICES": "0"}


def single_output(directory: Path, suffix: str, label: str) -> Path:
    files = [x for x in directory.glob(f"*{suffix}") if x.is_file() and x.stat().st_size > 0]
    if len(files) != 1:
        raise VoiceLabProviderError(f"{label}_output_count:{len(files)}")
    return files[0]


def train(source_root: Path, assets: dict[str, Path], exp: Path, candidate: Path) -> None:
    sovits_dir = candidate / "_sovits_weights"
    gpt_dir = candidate / "_gpt_weights"
    sovits_dir.mkdir(parents=True, exist_ok=True)
    gpt_dir.mkdir(parents=True, exist_ok=True)
    s2, s1, env = training_configs(assets, exp, sovits_dir, gpt_dir)
    run_stage(source_root, assets["sovits_train"], env, "--config", str(s2))
    shutil.copy2(single_output(sovits_dir, ".pth", "sovits"), candidate / "sovits.pth")
    run_stage(source_root, assets["gpt_train"], env, "--config_file", str(s1))
    shutil.copy2(single_output(gpt_dir, ".ckpt", "gpt"), candidate / "gpt.ckpt")
    shutil.rmtree(sovits_dir, ignore_errors=True)
    shutil.rmtree(gpt_dir, ignore_errors=True)


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


def embedding(tts: Any, wav_path: Path) -> Any:
    import torchaudio
    wav, sr = torchaudio.load(str(wav_path))
    wav = wav.mean(dim=0, keepdim=True)
    if sr != 16_000:
        wav = torchaudio.functional.resample(wav, sr, 16_000)
    return tts.sv_model.compute_embedding3(wav.to(tts.configs.device)).detach().float().cpu()


def evaluate(source_root: Path, assets: dict[str, Path], candidate: Path, evaluation: Path, manifest: dict[str, Any], reference: dict[str, Any]) -> list[dict[str, Any]]:
    import torch
    import torch.nn.functional as functional
    install_headless_my_utils(source_root)
    os.environ["NLTK_DATA"] = str(source_root / "nltk_data")
    os.environ["version"] = VERSION
    from TTS_infer_pack.TTS import TTS, TTS_Config

    config = TTS_Config({"custom": {"device": "cuda:0" if torch.cuda.is_available() else "cpu", "is_half": torch.cuda.is_available(), "version": VERSION, "t2s_weights_path": str(candidate / "gpt.ckpt"), "vits_weights_path": str(candidate / "sovits.pth"), "cnhuhbert_base_path": str(assets["hubert_model"]), "bert_base_path": str(assets["bert_model"])}})
    config.configs_path = str(evaluation / "tts_runtime.yaml")
    tts = TTS(config)
    reference_wav = candidate / "reference.wav"
    ref_embedding = embedding(tts, reference_wav)
    samples: list[dict[str, Any]] = []
    for held in manifest["held_out_lines"]:
        line_id = int(held["line_id"])
        text = str(held["exact_text"]).strip()
        outputs = list(tts.run({"text": text, "text_lang": "en", "ref_audio_path": str(reference_wav), "prompt_text": str(reference["exact_text"]), "prompt_lang": "en", "batch_size": 1, "parallel_infer": False, "return_fragment": False, "seed": 233333}))
        if len(outputs) != 1:
            raise VoiceLabProviderError(f"evaluation_output_count:{line_id}:{len(outputs)}")
        sr, audio = outputs[0]
        wav_file = f"held_out_{line_id}.wav"
        wav_path = evaluation / wav_file
        write_wav(wav_path, int(sr), audio)
        score = float(functional.cosine_similarity(ref_embedding, embedding(tts, wav_path), dim=-1).mean().item())
        if not math.isfinite(score):
            raise VoiceLabProviderError(f"evaluation_similarity_invalid:{line_id}")
        samples.append({"line_id": line_id, "exact_text": text, "wav_file": wav_file, "speaker_similarity": round(score, 6)})
    return samples


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
    status_writer("training", "Creating the Voice Actor from accepted recordings.")
    train(source_root, assets, exp, candidate_dir)
    shutil.copy2(reference["wav_path"], candidate_dir / "reference.wav")

    status_writer("evaluating", "Creating held-out voice samples for review.")
    samples = evaluate(source_root, assets, candidate_dir, evaluation_dir, manifest, reference)
    if len(samples) != len(manifest["held_out_lines"]):
        raise VoiceLabProviderError("held_out_evaluation_incomplete")
    (evaluation_dir / "evaluation.json").write_text(json.dumps({"schema_version": 1, "engine": ENGINE, "engine_revision": ENGINE_REVISION, "samples": samples}, indent=2) + "\n", encoding="utf-8", newline="\n")
    (candidate_dir / "actor.json").write_text(json.dumps({"schema_version": 1, "engine": ENGINE, "engine_revision": ENGINE_REVISION, "gpt_weight_file": "gpt.ckpt", "sovits_weight_file": "sovits.pth", "reference_wav_file": "reference.wav", "reference_text": reference["exact_text"], "reference_duration_ms": int(reference["duration_ms"]), "held_out_evaluation_complete": True}, indent=2) + "\n", encoding="utf-8", newline="\n")