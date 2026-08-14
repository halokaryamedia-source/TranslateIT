from __future__ import annotations

import importlib.util
import os
from pathlib import Path

import nltk

nltk_root = os.environ.get("NLTK_DATA", "").strip()
if not nltk_root:
    raise SystemExit("NLTK_DATA proof root is required")

for resource in ("averaged_perceptron_tagger", "averaged_perceptron_tagger_eng", "cmudict"):
    if not nltk.download(resource, download_dir=nltk_root, quiet=True):
        raise SystemExit(f"failed to prepare NLTK proof resource: {resource}")

import g2p_en

package_root = Path(g2p_en.__file__).resolve().parent
references = []
for path in package_root.rglob("*.py"):
    text = path.read_text(encoding="utf-8", errors="ignore").lower()
    if "distance" in text:
        references.append(str(path))
if references:
    raise SystemExit(f"g2p-en 2.1.0 runtime source still references Distance: {references}")
if importlib.util.find_spec("distance") is not None:
    raise SystemExit("Distance unexpectedly exists in the isolated G2P proof environment")

from g2p_en import G2p

g2p = G2p()
samples = (
    "Good morning, everyone.",
    "I refuse to collect the refuse around here.",
    "I'm an activationist.",
)
outputs = [g2p(sample) for sample in samples]
if not all(isinstance(output, list) and len(output) > 3 for output in outputs):
    raise SystemExit(f"English G2P returned invalid output: {outputs}")
if any("<unk>" in output for output in outputs):
    raise SystemExit(f"English G2P smoke returned unknown phonemes: {outputs}")

print("[r1.1-g2p] installed g2p-en 2.1.0 has no Distance source reference; English G2P with Distance absent -> PASS")
