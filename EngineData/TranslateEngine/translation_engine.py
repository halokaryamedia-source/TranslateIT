from __future__ import annotations

import copy
import re
from dataclasses import dataclass
from collections import OrderedDict
import importlib.util
from pathlib import Path
from time import perf_counter
from typing import Any
from typing import Sequence

from EngineData.TranslateEngine.translation_context import TranslationContext
from EngineData.TranslateEngine.realtime_quality_layer import RealtimeQualityLayer


@dataclass(slots=True)
class TranslationRequest:
    segment_id: str
    source_text: str
    source_language: str = "id"
    target_language: str = "en"
    context_window: Sequence[str] = ()


@dataclass(slots=True)
class TranslationResult:
    segment_id: str
    translated_text: str
    engine_name: str
    mode: str
    latency_ms: int = 0
    status: str = "Planned"
    notes: str = ""
    queue_wait_ms: int = 0
    text_prep_ms: int = 0
    tokenize_ms: int = 0
    translate_inference_ms: int = 0
    decode_finalize_ms: int = 0
    context_update_ms: int = 0
    total_ms: int = 0
    device: str = "cpu"
    dtype: str = "float32"
    model_loaded_before_segment: bool = False
    context_used: bool = False
    input_chars: int = 0
    output_chars: int = 0
    fallback_used: bool = False
    error: str = ""
    quality_layer_status: str = ""
    voice_replay_allowed: bool = False


@dataclass(slots=True)
class TranslationCapability:
    available: bool
    mode: str
    engine_name: str
    message: str


class TranslationEngine:
    """Local translation interface with explicit placeholder fallback."""

    _literal_short_phrase_map: dict[tuple[str, ...], str] = {
        ("halo",): "Hello.",
        ("halo", "coba", "bicara"): "Hello, try speaking.",
        ("halo", "coba", "berbicara"): "Hello, try speaking.",
        ("lalu", "coba", "bicara"): "Then try speaking.",
        ("lalu", "coba", "berbicara"): "Then try speaking.",
        ("coba", "bicara"): "Try speaking.",
        ("coba", "berbicara"): "Try speaking.",
        ("coba", "lagi"): "Try again.",
        ("lagi",): "Again.",
        ("ayo",): "Let's go.",
        ("oke",): "Okay.",
        ("ok",): "Okay.",
        ("ya",): "Yes.",
        ("tidak",): "No.",
        ("tolong",): "Please.",
        ("silakan",): "Please.",
        ("maaf",): "Sorry.",
        ("terima", "kasih"): "Thank you.",
        ("sama", "sama"): "You're welcome.",
        ("bentar",): "Wait a moment.",
        ("sebentar",): "Wait a moment.",
        ("sudah",): "Already.",
        ("udah",): "Already.",
        ("bisa",): "Can.",
        ("saya",): "I.",
        ("kamu",): "You.",
        ("kami",): "We.",
        ("kita",): "We.",
        ("apa",): "What?",
    }

    def __init__(
        self,
        primary_engine_name: str = "local-nllb-distilled",
        fallback_engine_name: str = "marianmt-id-en",
        model_root: Path | None = None,
    ) -> None:
        self.primary_engine_name = primary_engine_name
        self.fallback_engine_name = fallback_engine_name
        self.model_root = model_root
        self.context = TranslationContext()
        self.quality_layer = RealtimeQualityLayer()
        self._tokenizer: Any | None = None
        self._model: Any | None = None
        self._loaded_model_id: str | None = None
        self._loaded_engine_name: str | None = None
        self._device: str = "cpu"
        self._dtype: str = "float32"
        self._translation_cache: "OrderedDict[tuple[str, str, str, tuple[str, ...]], TranslationResult]" = OrderedDict()
        self._translation_cache_limit = 64
        self._warmup_cache_key: tuple[str, str, str, str] | None = None
        self._warmup_cached_result: dict[str, object] | None = None
        self._warmup_count = 0

    def _preferred_device(self) -> str:
        try:  # pragma: no cover - depends on optional torch runtime
            import torch
            try:
                torch.set_float32_matmul_precision("high")
            except Exception:
                pass
            try:
                torch.backends.cuda.matmul.allow_tf32 = True
                torch.backends.cudnn.allow_tf32 = True
                if hasattr(torch.backends.cuda, "allow_fp16_reduced_precision_reduction"):
                    torch.backends.cuda.allow_fp16_reduced_precision_reduction = True
                if hasattr(torch.backends.cuda, "allow_bf16_reduced_precision_reduction"):
                    torch.backends.cuda.allow_bf16_reduced_precision_reduction = True
                if hasattr(torch.backends.cuda, "enable_flash_sdp"):
                    torch.backends.cuda.enable_flash_sdp(True)
                if hasattr(torch.backends.cuda, "enable_mem_efficient_sdp"):
                    torch.backends.cuda.enable_mem_efficient_sdp(True)
                if hasattr(torch.backends.cuda, "enable_math_sdp"):
                    torch.backends.cuda.enable_math_sdp(True)
            except Exception:
                pass

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"

    def _warmup_model_key(self) -> tuple[str, str, str, str]:
        return (
            str(self._loaded_model_id or ""),
            str(self._loaded_engine_name or ""),
            str(self._device or "cpu"),
            str(self._dtype or "float32"),
        )

    def dependency_status(self) -> TranslationCapability:
        has_torch = importlib.util.find_spec("torch") is not None
        has_transformers = importlib.util.find_spec("transformers") is not None
        if has_torch and has_transformers:
            return TranslationCapability(
                available=True,
                mode="real_local_model",
                engine_name=self.primary_engine_name,
                message="Local translation dependencies are available.",
            )
        return TranslationCapability(
            available=False,
            mode="placeholder",
            engine_name="placeholder-local-translation",
            message="Local translation model dependencies are missing.",
        )

    def _model_id_for_engine(self, engine_name: str) -> str:
        local_path = self.local_model_path(engine_name)
        if local_path is not None:
            return str(local_path)
        if engine_name == "local-nllb-distilled":
            return "facebook/nllb-200-distilled-600M"
        if engine_name == "marianmt-id-en":
            return "Helsinki-NLP/opus-mt-id-en"
        return engine_name

    def local_model_path(self, engine_name: str) -> Path | None:
        if self.model_root is None:
            return None
        local_names = {
            "local-nllb-distilled": "nllb-200-distilled-600M",
            "marianmt-id-en": "marianmt-id-en",
        }
        local_path = self.model_root / local_names.get(engine_name, engine_name)
        if (local_path / "config.json").exists():
            return local_path
        return None

    @staticmethod
    def _normalize_short_phrase(text: str) -> tuple[str, ...]:
        cleaned = []
        for char in str(text or "").strip().lower():
            if char.isalnum() or char.isspace():
                cleaned.append(char)
            else:
                cleaned.append(" ")
        tokens = [token for token in "".join(cleaned).split() if token]
        return tuple(tokens)

    @staticmethod
    def _collapse_adjacent_sentence_duplicates(text: str) -> str:
        normalized = str(text or "").strip()
        if not normalized:
            return ""
        parts = [part.strip() for part in re.split(r"(?<=[.!?])\s+", normalized) if part.strip()]
        if len(parts) < 2:
            return normalized
        deduped: list[str] = []
        previous_key = ""
        for part in parts:
            key = re.sub(r"\s+", " ", part).strip().rstrip(".!?").lower()
            if key and key == previous_key:
                continue
            deduped.append(part)
            previous_key = key
        return " ".join(deduped) if deduped else normalized

    @classmethod
    def _literal_short_translation(
        cls,
        *,
        source_text: str,
        source_language: str,
        target_language: str,
    ) -> str | None:
        normalized_source = str(source_language or "").strip().lower()
        normalized_target = str(target_language or "").strip().lower()
        if normalized_source not in {"id", "ind", "indonesian"}:
            return None
        if normalized_target not in {"en", "eng", "english"}:
            return None
        tokens = cls._normalize_short_phrase(source_text)
        if not tokens or len(tokens) > 3:
            return None
        return cls._literal_short_phrase_map.get(tokens)

    def load_local_model(self, engine_name: str | None = None) -> TranslationCapability:
        capability = self.dependency_status()
        if not capability.available:
            return capability
        selected_engine = engine_name or self.primary_engine_name
        model_id = self._model_id_for_engine(selected_engine)
        if self._model is not None and self._tokenizer is not None and self._loaded_model_id == model_id:
            return TranslationCapability(True, "real_local_model", selected_engine, "Local translation model is loaded.")
        try:  # pragma: no cover - requires local model files
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

            self._tokenizer = AutoTokenizer.from_pretrained(model_id, local_files_only=True)
            try:
                self._model = AutoModelForSeq2SeqLM.from_pretrained(
                    model_id,
                    local_files_only=True,
                    attn_implementation="sdpa",
                )
            except TypeError:
                self._model = AutoModelForSeq2SeqLM.from_pretrained(model_id, local_files_only=True)
            self._device = self._preferred_device()
            if self._device == "cuda":
                self._model = self._model.to("cuda")
                self._dtype = "float16"
                try:
                    self._model = self._model.half()
                except Exception:
                    pass
                try:
                    self._model.generation_config.use_cache = True
                except Exception:
                    pass
                try:
                    self._model.generation_config.num_beams = 1
                except Exception:
                    pass
                try:
                    self._model.generation_config.do_sample = False
                except Exception:
                    pass
                try:
                    self._model.generation_config.max_new_tokens = 48
                except Exception:
                    pass
            else:
                self._dtype = "float32"
            try:
                self._model.eval()
            except Exception:
                pass
            self._loaded_model_id = model_id
            self._loaded_engine_name = selected_engine
            return TranslationCapability(
                True,
                "real_local_model",
                selected_engine,
                f"Local translation model loaded on {self._device}.",
            )
        except Exception as exc:
            return TranslationCapability(
                False,
                "pending_local_model",
                selected_engine,
                f"Local translation model files are not available: {exc}",
            )

    def translate(self, request: TranslationRequest) -> TranslationResult:
        started = perf_counter()
        queue_wait_started = perf_counter()
        queue_wait_ms = 0
        text_prep_started = perf_counter()
        self.context.clear()
        self.context.extend(request.context_window)
        clean_source_text = str(request.source_text).strip()
        input_chars = len(clean_source_text)
        text_prep_ms = int((perf_counter() - text_prep_started) * 1000)
        cache_key = (clean_source_text, request.source_language, request.target_language, tuple(request.context_window))
        cached_result = self._translation_cache.get(cache_key)
        if cached_result is not None:
            cached_copy = copy.copy(cached_result)
            cached_copy.latency_ms = int((perf_counter() - started) * 1000)
            cached_copy.total_ms = cached_copy.latency_ms
            cached_copy.queue_wait_ms = 0
            cached_copy.text_prep_ms = text_prep_ms
            cached_copy.tokenize_ms = 0
            cached_copy.translate_inference_ms = 0
            cached_copy.decode_finalize_ms = 0
            cached_copy.context_update_ms = 0
            cached_copy.notes = "Cached translation reused."
            cached_copy.model_loaded_before_segment = True
            cached_copy.context_used = bool(request.context_window)
            cached_copy.input_chars = input_chars
            cached_copy.output_chars = len(cached_copy.translated_text)
            cached_copy.voice_replay_allowed = False
            return cached_copy
        literal_translation = self._literal_short_translation(
            source_text=clean_source_text,
            source_language=request.source_language,
            target_language=request.target_language,
        )
        if literal_translation is not None:
            context_used = bool(request.context_window)
            quality_result = self.quality_layer.pre_tts_fast_pass(
                source_text=clean_source_text,
                translated_text=literal_translation,
                source_language=request.source_language,
                target_language=request.target_language,
            )
            final_translation = quality_result.text
            self.context.push(clean_source_text)
            self.context.push(final_translation)
            self.quality_layer.accept_post_output_observation(
                source_text=clean_source_text,
                translated_text=final_translation,
            )
            total_ms = int((perf_counter() - started) * 1000)
            result = TranslationResult(
                segment_id=request.segment_id,
                translated_text=final_translation,
                engine_name="literal-short-translation",
                mode="literal_short_phrase",
                latency_ms=total_ms,
                status="Completed",
                notes="Deterministic short-phrase translation applied.",
                queue_wait_ms=0,
                text_prep_ms=text_prep_ms,
                tokenize_ms=0,
                translate_inference_ms=0,
                decode_finalize_ms=0,
                context_update_ms=0,
                total_ms=total_ms,
                device=self._device,
                dtype=self._dtype,
                model_loaded_before_segment=self._model is not None,
                context_used=context_used,
                input_chars=input_chars,
                output_chars=len(final_translation),
                fallback_used=False,
                error="",
                quality_layer_status=quality_result.status,
                voice_replay_allowed=False,
            )
            self._translation_cache[cache_key] = copy.copy(result)
            while len(self._translation_cache) > self._translation_cache_limit:
                self._translation_cache.popitem(last=False)
            return result
        tokenize_ms = 0
        candidate_engines = [self.primary_engine_name]
        if self.fallback_engine_name not in candidate_engines:
            candidate_engines.append(self.fallback_engine_name)
        last_capability: TranslationCapability | None = None
        last_error: Exception | None = None
        for candidate_engine in candidate_engines:
            capability = self.load_local_model(candidate_engine)
            last_capability = capability
            if not capability.available or self._tokenizer is None or self._model is None:
                continue
            try:  # pragma: no cover - requires local model files
                import torch
                self.context.push(clean_source_text)
                context_used = bool(request.context_window)
                tokenize_started = perf_counter()
                if self._loaded_engine_name == "local-nllb-distilled":
                    self._tokenizer.src_lang = "ind_Latn"
                inputs = self._tokenizer(clean_source_text, return_tensors="pt")
                tokenize_ms = int((perf_counter() - tokenize_started) * 1000)
                inputs = {key: value.to(self._device) for key, value in inputs.items()}
                if input_chars <= 30:
                    max_new_tokens = 8
                elif input_chars <= 60:
                    max_new_tokens = 12
                elif input_chars <= 120:
                    max_new_tokens = 18
                elif input_chars <= 200:
                    max_new_tokens = 24
                else:
                    max_new_tokens = 32
                if self._loaded_engine_name == "local-nllb-distilled":
                    forced_bos_token_id = self._tokenizer.convert_tokens_to_ids("eng_Latn")
                    transcribe_started = perf_counter()
                    with torch.inference_mode():
                        output_tokens = self._model.generate(
                            **inputs,
                            forced_bos_token_id=forced_bos_token_id,
                            max_new_tokens=max_new_tokens,
                            num_beams=1,
                            do_sample=False,
                        )
                else:
                    transcribe_started = perf_counter()
                    with torch.inference_mode():
                        output_tokens = self._model.generate(
                            **inputs,
                            max_new_tokens=max_new_tokens,
                            num_beams=1,
                            do_sample=False,
                        )
                translate_inference_ms = int((perf_counter() - transcribe_started) * 1000)
                decode_started = perf_counter()
                translated_text = self._tokenizer.batch_decode(output_tokens.detach().cpu(), skip_special_tokens=True)[0]
                decoded_text = self._collapse_adjacent_sentence_duplicates(str(translated_text).strip())
                quality_result = self.quality_layer.pre_tts_fast_pass(
                    source_text=clean_source_text,
                    translated_text=decoded_text,
                    source_language=request.source_language,
                    target_language=request.target_language,
                )
                decoded_text = quality_result.text
                decode_finalize_ms = int((perf_counter() - decode_started) * 1000)
                context_update_started = perf_counter()
                self.context.push(decoded_text)
                self.quality_layer.accept_post_output_observation(
                    source_text=clean_source_text,
                    translated_text=decoded_text,
                )
                context_update_ms = int((perf_counter() - context_update_started) * 1000)
                total_ms = int((perf_counter() - started) * 1000)
                result = TranslationResult(
                    segment_id=request.segment_id,
                    translated_text=decoded_text,
                    engine_name=capability.engine_name,
                    mode=capability.mode,
                    latency_ms=total_ms,
                    status="Completed",
                    notes=f"Real local translation model completed the translation on {self._device}.",
                    queue_wait_ms=queue_wait_ms,
                    text_prep_ms=text_prep_ms,
                    tokenize_ms=tokenize_ms,
                    translate_inference_ms=translate_inference_ms,
                    decode_finalize_ms=decode_finalize_ms,
                    context_update_ms=context_update_ms,
                    total_ms=total_ms,
                    device=self._device,
                    dtype=self._dtype,
                    model_loaded_before_segment=True,
                    context_used=context_used,
                    input_chars=input_chars,
                    output_chars=len(decoded_text),
                    fallback_used=capability.engine_name != self.primary_engine_name,
                    error="",
                    quality_layer_status=quality_result.status,
                    voice_replay_allowed=False,
                )
                self._translation_cache[cache_key] = copy.copy(result)
                while len(self._translation_cache) > self._translation_cache_limit:
                    self._translation_cache.popitem(last=False)
                return result
            except Exception as exc:
                last_error = exc
                continue
        if last_capability is not None and last_capability.mode == "pending_local_model":
            return TranslationResult(
                segment_id=request.segment_id,
                translated_text="",
                engine_name=last_capability.engine_name,
                mode=last_capability.mode,
                latency_ms=int((perf_counter() - started) * 1000),
                status="PendingIntegration",
                notes=last_capability.message,
                queue_wait_ms=queue_wait_ms,
                text_prep_ms=text_prep_ms,
                tokenize_ms=tokenize_ms,
                translate_inference_ms=0,
                decode_finalize_ms=0,
                context_update_ms=0,
                total_ms=int((perf_counter() - started) * 1000),
                device=self._device,
                dtype=self._dtype,
                model_loaded_before_segment=True,
                context_used=bool(request.context_window),
                input_chars=input_chars,
                output_chars=0,
                fallback_used=last_capability.engine_name != self.primary_engine_name,
                error="",
            )
        if last_error is not None and last_capability is not None:
            return TranslationResult(
                segment_id=request.segment_id,
                translated_text="",
                engine_name=last_capability.engine_name,
                mode=last_capability.mode,
                latency_ms=int((perf_counter() - started) * 1000),
                status="PendingIntegration",
                notes=f"Local translation inference failed: {last_error}",
                queue_wait_ms=queue_wait_ms,
                text_prep_ms=text_prep_ms,
                tokenize_ms=tokenize_ms,
                translate_inference_ms=0,
                decode_finalize_ms=0,
                context_update_ms=0,
                total_ms=int((perf_counter() - started) * 1000),
                device=self._device,
                dtype=self._dtype,
                model_loaded_before_segment=True,
                context_used=bool(request.context_window),
                input_chars=input_chars,
                output_chars=0,
                fallback_used=last_capability.engine_name != self.primary_engine_name,
                error=str(last_error),
            )
        if last_capability is None:
            last_capability = TranslationCapability(
                available=False,
                mode="placeholder",
                engine_name="placeholder-local-translation",
                message="Local translation dependencies are missing.",
            )
        return TranslationResult(
            segment_id=request.segment_id,
            translated_text="",
            engine_name=last_capability.engine_name,
            mode=last_capability.mode,
            latency_ms=int((perf_counter() - started) * 1000),
            status="Placeholder",
            notes=last_capability.message,
            queue_wait_ms=queue_wait_ms,
            text_prep_ms=text_prep_ms,
            tokenize_ms=tokenize_ms,
            translate_inference_ms=0,
            decode_finalize_ms=0,
            context_update_ms=0,
            total_ms=int((perf_counter() - started) * 1000),
            device=self._device,
            dtype=self._dtype,
            model_loaded_before_segment=False,
            context_used=bool(request.context_window),
            input_chars=input_chars,
            output_chars=0,
            fallback_used=False,
            error="",
        )

    def passthrough_translation(self, request: TranslationRequest, *, detected_language: str | None = None) -> TranslationResult:
        clean_source_text = str(request.source_text).strip()
        input_chars = len(clean_source_text)
        normalized_language = str(detected_language or request.source_language or "").strip().lower()
        self.context.clear()
        self.context.extend(request.context_window)
        self.context.push(clean_source_text)
        return TranslationResult(
            segment_id=request.segment_id,
            translated_text=clean_source_text,
            engine_name=self._loaded_engine_name or self.primary_engine_name,
            mode="passthrough",
            latency_ms=0,
            status="Skipped",
            notes=(
                "Translation skipped because the detected language already matches the target language."
                if normalized_language
                else "Translation skipped because the text already matches the target language."
            ),
            queue_wait_ms=0,
            text_prep_ms=0,
            tokenize_ms=0,
            translate_inference_ms=0,
            decode_finalize_ms=0,
            context_update_ms=0,
            total_ms=0,
            device=self._device,
            dtype=self._dtype,
            model_loaded_before_segment=self._model is not None,
            context_used=bool(request.context_window),
            input_chars=input_chars,
            output_chars=input_chars,
            fallback_used=False,
            error="",
        )

    def warmup_model(self, *, reuse_if_ready: bool = True) -> dict[str, object]:
        started = perf_counter()
        capability = self.load_local_model()
        if not capability.available or self._tokenizer is None or self._model is None:
            return {
                "loaded": False,
                "engine_name": capability.engine_name,
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": capability.message,
                "reused": False,
            }
        warmup_key = self._warmup_model_key()
        if reuse_if_ready and self._warmup_cache_key == warmup_key and self._warmup_cached_result is not None:
            cached_result = copy.deepcopy(self._warmup_cached_result)
            cached_result["latency_ms"] = int((perf_counter() - started) * 1000)
            cached_result["message"] = "Translation warmup already satisfied; resident model reused."
            cached_result["reused"] = True
            return cached_result
        try:  # pragma: no cover - requires local model files
            import torch

            warmup_text = "halo"
            if self._loaded_engine_name == "local-nllb-distilled":
                self._tokenizer.src_lang = "ind_Latn"
                inputs = self._tokenizer(warmup_text, return_tensors="pt")
                inputs = {key: value.to(self._device) for key, value in inputs.items()}
                forced_bos_token_id = self._tokenizer.convert_tokens_to_ids("eng_Latn")
                with torch.inference_mode():
                    self._model.generate(
                        **inputs,
                        forced_bos_token_id=forced_bos_token_id,
                        max_new_tokens=12,
                        num_beams=1,
                        do_sample=False,
                    )
            else:
                inputs = self._tokenizer(warmup_text, return_tensors="pt")
                inputs = {key: value.to(self._device) for key, value in inputs.items()}
                with torch.inference_mode():
                    self._model.generate(**inputs, max_new_tokens=12, num_beams=1, do_sample=False)
            result = {
                "loaded": True,
                "engine_name": capability.engine_name,
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": "Translation warmup completed.",
                "reused": False,
            }
            self._warmup_cache_key = warmup_key
            self._warmup_cached_result = copy.deepcopy(result)
            self._warmup_count += 1
            return result
        except Exception as exc:
            return {
                "loaded": True,
                "engine_name": capability.engine_name,
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": f"Translation warmup failed: {exc}",
                "reused": False,
            }
