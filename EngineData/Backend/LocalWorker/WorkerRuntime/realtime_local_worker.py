from __future__ import annotations

import milmmt_translation_provider
import realtime_local_worker_base as runtime

_PROVIDER_SENTINEL = "_translateit_milmmt_provider_installed"
_CONTEXT_POLICY_SENTINEL = "_translateit_translation_context_policy_installed"
_CONTEXT_POLICY_ORIGINAL = "_translateit_translation_context_policy_original_handle_translate"

if not getattr(runtime, _PROVIDER_SENTINEL, False):
    milmmt_translation_provider.install(vars(runtime))
    setattr(runtime, _PROVIDER_SENTINEL, True)


def _translation_context_authorized(payload: dict) -> bool:
    lane = str(payload.get("meeting_lane", "")).strip().lower()
    source = runtime.normalize_language(payload.get("source_language", "id"), "id")
    target = runtime.normalize_language(payload.get("target_language", "en"), "en")
    session_id = str(payload.get("meeting_session_id", "")).strip()
    generation = payload.get("meeting_generation")
    if isinstance(generation, bool):
        return False
    try:
        generation = int(generation)
    except (TypeError, ValueError):
        return False
    return (
        lane == "you"
        and source == "id"
        and target == "en"
        and bool(session_id)
        and generation > 0
    )


def _translation_payload_with_context_policy(payload):
    if not isinstance(payload, dict) or "context_pairs" not in payload:
        return payload
    if _translation_context_authorized(payload):
        return payload
    sanitized = dict(payload)
    sanitized.pop("context_pairs", None)
    return sanitized


def _context_guarded_runtime_translate(payload):
    original = getattr(runtime, _CONTEXT_POLICY_ORIGINAL)
    return original(_translation_payload_with_context_policy(payload))


if not getattr(runtime, _CONTEXT_POLICY_SENTINEL, False):
    setattr(runtime, _CONTEXT_POLICY_ORIGINAL, runtime.handle_translate)
    runtime.handle_translate = _context_guarded_runtime_translate
    setattr(runtime, _CONTEXT_POLICY_SENTINEL, True)

# The old exec-based entrypoint exposed one mutable module namespace. Preserve
# only the bounded test/diagnostic injection surface while implementation truth
# now lives explicitly in `runtime`.
_RUNTIME_OVERRIDE_NAMES = (
    "asr_model_ready",
    "import_ready",
    "probe_gpu_runtime",
    "translation_model_ready",
    "translation_runtime_config",
    "voice_actor_static_status",
)


def _call_with_runtime_overrides(callback, *args):
    local = globals()
    previous: dict[str, object] = {}
    applied: list[str] = []
    for name in _RUNTIME_OVERRIDE_NAMES:
        if name not in local:
            continue
        previous[name] = getattr(runtime, name)
        setattr(runtime, name, local[name])
        applied.append(name)
    try:
        return callback(*args)
    finally:
        for name in reversed(applied):
            setattr(runtime, name, previous[name])


def handle_translate(payload):
    return _call_with_runtime_overrides(runtime.handle_translate, payload)


def build_status_payload(payload=None):
    return _call_with_runtime_overrides(runtime.build_status_payload, payload)


def get_translation_runtime(source_language: str, target_language: str):
    return _call_with_runtime_overrides(
        runtime.get_translation_runtime,
        source_language,
        target_language,
    )


def __getattr__(name: str):
    return getattr(runtime, name)


def __dir__() -> list[str]:
    return sorted(set(globals()) | set(dir(runtime)))


def main() -> int:
    return runtime.main()


if __name__ == "__main__":
    raise SystemExit(main())
