from __future__ import annotations

import milmmt_translation_provider
import realtime_local_worker_base as runtime

_PROVIDER_SENTINEL = "_translateit_milmmt_provider_installed"
if not getattr(runtime, _PROVIDER_SENTINEL, False):
    milmmt_translation_provider.install(vars(runtime))
    setattr(runtime, _PROVIDER_SENTINEL, True)

# The old exec-based entrypoint exposed one mutable module namespace. Keep the
# small set of injection hooks used by contract tests/diagnostics while the real
# implementation authority now lives explicitly in `runtime`.
_RUNTIME_OVERRIDE_NAMES = (
    "asr_model_ready",
    "import_ready",
    "probe_gpu_runtime",
    "translation_model_ready",
    "translation_runtime_config",
    "voice_actor_static_status",
)


def _sync_runtime_overrides() -> None:
    local = globals()
    for name in _RUNTIME_OVERRIDE_NAMES:
        if name in local:
            setattr(runtime, name, local[name])


def handle_translate(payload):
    _sync_runtime_overrides()
    return runtime.handle_translate(payload)


def build_status_payload(payload=None):
    _sync_runtime_overrides()
    return runtime.build_status_payload(payload)


def get_translation_runtime(source_language: str, target_language: str):
    _sync_runtime_overrides()
    return runtime.get_translation_runtime(source_language, target_language)


def __getattr__(name: str):
    return getattr(runtime, name)


def __dir__() -> list[str]:
    return sorted(set(globals()) | set(dir(runtime)))


def main() -> int:
    return runtime.main()


if __name__ == "__main__":
    raise SystemExit(main())
