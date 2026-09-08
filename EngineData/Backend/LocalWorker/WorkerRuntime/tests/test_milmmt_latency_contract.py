from __future__ import annotations

import ast
from pathlib import Path

PROVIDER_PATH = Path(__file__).resolve().parents[1] / "milmmt_translation_provider.py"


def test_milmmt_generation_explicitly_enables_kv_cache() -> None:
    tree = ast.parse(PROVIDER_PATH.read_text(encoding="utf-8"))
    generate_calls = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "generate"
    ]
    assert generate_calls, "MiLMMT provider must own an explicit model.generate call"
    assert any(
        keyword.arg == "use_cache"
        and isinstance(keyword.value, ast.Constant)
        and keyword.value.value is True
        for call in generate_calls
        for keyword in call.keywords
    ), "MiLMMT deterministic inference must explicitly enable KV cache"
