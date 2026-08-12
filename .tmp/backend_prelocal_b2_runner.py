from __future__ import annotations

from pathlib import Path

helper = Path(__file__).with_name("backend_prelocal_b2_patch.py")
exec(compile(helper.read_text(encoding="utf-8"), str(helper), "exec"), {"__name__": "__main__", "__file__": str(helper)})

root = helper.parents[1]
decision_path = root / "docs" / "knowledge" / "decision-log.md"
body = decision_path.read_text(encoding="utf-8")
marker = "## D-019 — One Windows CUDA Matrix And Capability-Only CPU Fallback"
if body.count(marker) != 1:
    raise RuntimeError(f"D-019 formatting marker changed unexpectedly: {body.count(marker)} matches")
prefix, tail = body.split(marker, 1)
clean_tail = "\n".join(line.rstrip() for line in (marker + tail).splitlines()).rstrip()
decision_path.write_text(prefix + clean_tail + "\n", encoding="utf-8", newline="\n")
