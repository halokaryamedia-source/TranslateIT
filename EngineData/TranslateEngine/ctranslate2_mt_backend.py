from __future__ import annotations

from dataclasses import dataclass
import importlib.util
from pathlib import Path
from time import perf_counter
from typing import Any


@dataclass(slots=True)
class FastMTCapability:
    available: bool
    engine_name: str
    mode: str
    message: str
    device: str = "cpu"
    compute_type: str = "int8"


@dataclass(slots=True)
class FastMTResult:
    translated_text: str
    latency_ms: int
    tokenize_ms: int
    inference_ms: int
    decode_ms: int
    engine_name: str
    mode: str
    device: str
    compute_type: str
    status: str
    error: str = ""


class CTranslate2MTBackend:
    """Fast local machine-translation backend for realtime voice mode."""

    supported_engines = {
        "fast-mt-id-en": "ctranslate2-marianmt-id-en",
        "ctranslate2-marianmt-id-en": "ctranslate2-marianmt-id-en",
        "fast-mt-en-id": "ctranslate2-marianmt-en-id",
        "ctranslate2-marianmt-en-id": "ctranslate2-marianmt-en-id",
    }

    def __init__(self, model_root: Path | None = None) -> None:
        self.model_root = model_root
        self._translator: Any | None = None
        self._tokenizer: Any | None = None
        self._loaded_engine_name: str | None = None
        self._loaded_model_path: Path | None = None
        self._device: str = "cpu"
        self._compute_type: str = "int8"

    def supports(self, engine_name: str) -> bool:
        return str(engine_name or "").strip().lower() in self.supported_engines

    def dependency_status(self, engine_name: str) -> FastMTCapability:
        normalized = str(engine_name or "").strip().lower()
        if not self.supports(normalized):
            return FastMTCapability(False, engine_name, "unsupported", "Unsupported fast MT engine.")
        if importlib.util.find_spec("ctranslate2") is None:
            return FastMTCapability(False, normalized, "missing_dependency", "CTranslate2 is not installed.")
        if importlib.util.find_spec("transformers") is None:
            return FastMTCapability(False, normalized, "missing_dependency", "Transformers tokenizer dependency is not installed.")
        model_path = self.local_model_path(normalized)
        if model_path is None:
            return FastMTCapability(False, normalized, "missing_model", "Converted CTranslate2 model files are not available under TranslateEngine/ModelData.")
        device = self._preferred_device()
        compute_type = "float16" if device == "cuda" else "int8"
        return FastMTCapability(True, normalized, "fast_local_mt", "Fast MT backend is available.", device, compute_type)

    def local_model_path(self, engine_name: str) -> Path | None:
        if self.model_root is None:
            return None
        folder_name = self.supported_engines.get(str(engine_name or "").strip().lower())
        if not folder_name:
            return None
        model_path = self.model_root / folder_name
        if (model_path / "model.bin").exists() and (model_path / "config.json").exists():
            return model_path
        return None

    def load(self, engine_name: str) -> FastMTCapability:
        capability = self.dependency_status(engine_name)
        if not capability.available:
            return capability
        model_path = self.local_model_path(capability.engine_name)
        if model_path is None:
            return FastMTCapability(False, capability.engine_name, "missing_model", "Fast MT model path disappeared.")
        if self._translator is not None and self._tokenizer is not None and self._loaded_model_path == model_path:
            return FastMTCapability(True, capability.engine_name, "fast_local_mt", "Fast MT backend is already loaded.", self._device, self._compute_type)
        try:
            import ctranslate2
            from transformers import AutoTokenizer

            self._device = capability.device
            self._compute_type = capability.compute_type
            self._translator = ctranslate2.Translator(str(model_path), device=self._device, compute_type=self._compute_type)
            self._tokenizer = AutoTokenizer.from_pretrained(str(model_path), local_files_only=True)
            self._loaded_engine_name = capability.engine_name
            self._loaded_model_path = model_path
            return FastMTCapability(True, capability.engine_name, "fast_local_mt", f"Fast MT loaded on {self._device}.", self._device, self._compute_type)
        except Exception as exc:
            return FastMTCapability(False, capability.engine_name, "load_failed", f"Fast MT load failed: {exc}", self._device, self._compute_type)

    def translate(self, *, text: str, source_language: str, target_language: str, engine_name: str) -> FastMTResult:
        started = perf_counter()
        capability = self.load(engine_name)
        if not capability.available or self._translator is None or self._tokenizer is None:
            return FastMTResult("", int((perf_counter() - started) * 1000), 0, 0, 0, capability.engine_name, capability.mode, capability.device, capability.compute_type, "Unavailable", capability.message)
        try:
            tokenize_started = perf_counter()
            tokens = self._tokenizer.convert_ids_to_tokens(self._tokenizer.encode(str(text or "").strip()))
            tokenize_ms = int((perf_counter() - tokenize_started) * 1000)
            inference_started = perf_counter()
            results = self._translator.translate_batch([tokens], beam_size=1, max_decoding_length=64)
            inference_ms = int((perf_counter() - inference_started) * 1000)
            decode_started = perf_counter()
            output_tokens = results[0].hypotheses[0]
            output_ids = self._tokenizer.convert_tokens_to_ids(output_tokens)
            translated_text = self._tokenizer.decode(output_ids, skip_special_tokens=True).strip()
            decode_ms = int((perf_counter() - decode_started) * 1000)
            return FastMTResult(translated_text, int((perf_counter() - started) * 1000), tokenize_ms, inference_ms, decode_ms, capability.engine_name, capability.mode, capability.device, capability.compute_type, "Completed")
        except Exception as exc:
            return FastMTResult("", int((perf_counter() - started) * 1000), 0, 0, 0, capability.engine_name, capability.mode, capability.device, capability.compute_type, "Failed", str(exc))

    @staticmethod
    def _preferred_device() -> str:
        try:
            import ctranslate2
            if ctranslate2.get_cuda_device_count() > 0:
                return "cuda"
        except Exception:
            pass
        return "cpu"
