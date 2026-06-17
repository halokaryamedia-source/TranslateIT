from __future__ import annotations

from dataclasses import asdict, dataclass
from importlib.util import find_spec
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class LanguageLLMRuntimeStatus:
    backend_name: str
    dependency_ready: bool
    model_ready: bool
    ready: bool
    model_path: str
    message: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class LanguageLLMRuntimeContract:
    """Local GGUF runtime contract for the English-Indonesian language quality layer."""

    def __init__(self, model_path: Path | str | None = None, *, backend_name: str = "llama-cpp-python") -> None:
        self.model_path = Path(model_path) if model_path is not None else None
        self.backend_name = backend_name

    def status(self) -> LanguageLLMRuntimeStatus:
        dependency_ready = self._dependency_ready()
        model_ready = bool(self.model_path is not None and self.model_path.exists() and self.model_path.suffix.lower() == ".gguf")
        if dependency_ready and model_ready:
            message = "ready"
        elif not dependency_ready and not model_ready:
            message = "dependency and model missing"
        elif not dependency_ready:
            message = "dependency missing"
        else:
            message = "model missing"
        return LanguageLLMRuntimeStatus(
            backend_name=self.backend_name,
            dependency_ready=dependency_ready,
            model_ready=model_ready,
            ready=dependency_ready and model_ready,
            model_path=str(self.model_path or ""),
            message=message,
        )

    def _dependency_ready(self) -> bool:
        if self.backend_name == "llama-cpp-python":
            return find_spec("llama_cpp") is not None
        return False
