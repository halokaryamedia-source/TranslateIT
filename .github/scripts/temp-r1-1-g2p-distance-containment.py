from __future__ import annotations

import collections
import sys
import tomllib
from pathlib import Path

ROOT = Path(".")
WORKER = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime"
PYPROJECT = WORKER / "pyproject.toml"
LOCK = WORKER / "uv.lock"
LOCAL_README = ROOT / "EngineData/Backend/LocalWorker/README.md"
VALIDATOR = ROOT / "EngineData/Frontend/RustApp/scripts/validate_release_package_contract.mjs"


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def patch_sources() -> None:
    replace_once(
        PYPROJECT,
        '    "g2p-en",\n',
        '    "g2p-en==2.1.0",\n',
        "pin g2p-en",
    )
    replace_once(
        PYPROJECT,
        '[tool.uv]\npackage = false\n',
        '[tool.uv]\npackage = false\nrequired-version = ">=0.12.0"\nexclude-dependencies = [\n    { package = { name = "g2p-en", version = "2.1.0" }, dependencies = ["distance"] },\n]\n',
        "scoped uv dependency exclusion",
    )

    old_readme = (
        "- The current lock resolves `g2p-en==2.1.0` to the transitive dependency `distance==0.1.3`. "
        "Upstream `g2p-en` is Apache-2.0, while the `Distance` package declares GPL. This is a **license-review blocker** "
        "for a closed/commercial release until the applicable distribution obligations are deliberately accepted or the dependency boundary is corrected and re-proved.\n"
    )
    new_readme = (
        "- `g2p-en` is pinned to **2.1.0** because the dependency exception below is source-reviewed against that exact release. "
        "Its published metadata declares `distance`, but hosted inspection of the installed `g2p_en` 2.1.0 Python package confirms that the runtime source contains no `distance` reference, and an English G2P smoke test succeeds while `distance` is absent.\n"
        "- The canonical `[tool.uv]` policy therefore uses a **version-scoped `exclude-dependencies`** entry that removes only `distance` as declared by `g2p-en==2.1.0`. "
        "`uv.lock` must not contain the `Distance` package. Any `g2p-en` version change must remove or re-justify this exception and repeat the source/runtime proof before release staging.\n"
        "- WorkerRuntime dependency resolution requires `uv>=0.12.0` so the scoped exclusion is understood consistently. This is developer/build tooling only; `uv` is not an installed-product dependency.\n"
        "- This containment removes the identified `Distance` package from the private Python dependency graph. It is not a legal opinion or overall release-clearance claim; FFmpeg, VB-CABLE, and remaining third-party notices retain their separate gates.\n"
    )
    replace_once(LOCAL_README, old_readme, new_readme, "LocalWorker GPL dependency blocker")

    validator = VALIDATOR.read_text(encoding="utf-8")
    old_reads = (
        'const localWorkerReadme = readFileSync(resolve(appRoot, "../../Backend/LocalWorker/README.md"), "utf8");\n'
        'const runtimeAssetsReadme = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/README.md"), "utf8");\n'
    )
    new_reads = (
        'const localWorkerReadme = readFileSync(resolve(appRoot, "../../Backend/LocalWorker/README.md"), "utf8");\n'
        'const workerPyproject = readFileSync(resolve(appRoot, "../../Backend/LocalWorker/WorkerRuntime/pyproject.toml"), "utf8");\n'
        'const workerLock = readFileSync(resolve(appRoot, "../../Backend/LocalWorker/WorkerRuntime/uv.lock"), "utf8");\n'
        'const runtimeAssetsReadme = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/README.md"), "utf8");\n'
    )
    if old_reads not in validator:
        raise SystemExit("validator WorkerRuntime read anchor not found")
    validator = validator.replace(old_reads, new_reads, 1)

    old_gate = '''for (const marker of [\n  "CPython 3.12.10 Windows embeddable package",\n  "g2p-en==2.1.0",\n  "distance==0.1.3",\n  "license-review blocker",\n]) {\n  if (!localWorkerReadme.includes(marker)) fail(`Python release provenance/license gate marker is missing: ${marker}`);\n}\n'''
    new_gate = '''for (const marker of [\n  '"g2p-en==2.1.0"',\n  'required-version = ">=0.12.0"',\n  '{ package = { name = "g2p-en", version = "2.1.0" }, dependencies = ["distance"] }',\n]) {\n  if (!workerPyproject.includes(marker)) fail(`WorkerRuntime g2p dependency-containment marker is missing: ${marker}`);\n}\nif (/\\[\\[package\\]\\]\\s+name = "distance"(?:\\s|$)/m.test(workerLock)) {\n  fail("WorkerRuntime uv.lock must not contain the excluded Distance package.");\n}\nif (!/\\[\\[package\\]\\]\\s+name = "g2p-en"\\s+version = "2\\.1\\.0"/m.test(workerLock)) {\n  fail("WorkerRuntime uv.lock must retain the source-reviewed g2p-en 2.1.0 release.");\n}\nfor (const marker of [\n  "CPython 3.12.10 Windows embeddable package",\n  "version-scoped `exclude-dependencies`",\n  "uv.lock` must not contain the `Distance` package",\n  "uv>=0.12.0",\n  "FFmpeg, VB-CABLE",\n]) {\n  if (!localWorkerReadme.includes(marker)) fail(`Python release provenance/license gate marker is missing: ${marker}`);\n}\n'''
    if old_gate not in validator:
        raise SystemExit("validator old Python licensing gate not found")
    validator = validator.replace(old_gate, new_gate, 1)

    old_log = 'console.log("[release-package-contract] Release source policy is aligned: private Python/model/provider inputs remain controlled and pinned where currently reviewable, GPT-SoVITS source/pretrained provenance is recorded, Python/FFmpeg/VB-CABLE licensing gates remain explicit rather than fabricated as cleared, and packaged mode has no system-Python fallback. Actual redistribution clearance, staged-byte verification, driver installation, installed runtime, and clean-machine execution remain separate evidence.");'
    new_log = 'console.log("[release-package-contract] Release source policy is aligned: private Python/model/provider inputs remain controlled, g2p-en 2.1.0 excludes its source-reviewed unused Distance dependency from the frozen Python graph, GPT-SoVITS provenance remains pinned, FFmpeg/VB-CABLE licensing gates remain explicit, and packaged mode has no system-Python fallback. This is dependency/source-contract evidence, not overall legal or installed-runtime clearance.");'
    if old_log not in validator:
        raise SystemExit("validator result log anchor not found")
    validator = validator.replace(old_log, new_log, 1)
    VALIDATOR.write_text(validator, encoding="utf-8")

    print("[r1.1] source policy patched; regenerate uv.lock next")


def package_counter(path: Path) -> collections.Counter[tuple[str, str]]:
    with path.open("rb") as handle:
        data = tomllib.load(handle)
    return collections.Counter((str(item.get("name", "")), str(item.get("version", ""))) for item in data.get("package", []))


def verify_lock(before_path: Path) -> None:
    before = package_counter(before_path)
    after = package_counter(LOCK)
    removed = before - after
    added = after - before
    if removed != collections.Counter({("distance", "0.1.3"): 1}):
        raise SystemExit(f"unexpected packages removed while re-locking: {removed}")
    if added:
        raise SystemExit(f"unexpected packages added while re-locking: {added}")

    with LOCK.open("rb") as handle:
        data = tomllib.load(handle)
    distance = [item for item in data.get("package", []) if item.get("name") == "distance"]
    if distance:
        raise SystemExit("Distance remains in uv.lock")
    g2p = [item for item in data.get("package", []) if item.get("name") == "g2p-en"]
    if len(g2p) != 1 or str(g2p[0].get("version")) != "2.1.0":
        raise SystemExit(f"unexpected g2p-en lock entry: {g2p}")
    dependencies = {str(item.get("name", "")) for item in g2p[0].get("dependencies", [])}
    if "distance" in dependencies:
        raise SystemExit("g2p-en lock dependency edge still contains Distance")

    pyproject = PYPROJECT.read_text(encoding="utf-8")
    for marker in (
        '"g2p-en==2.1.0"',
        'required-version = ">=0.12.0"',
        '{ package = { name = "g2p-en", version = "2.1.0" }, dependencies = ["distance"] }',
    ):
        if marker not in pyproject:
            raise SystemExit(f"missing pyproject containment marker: {marker}")

    print("[r1.1] lock delta is bounded: only Distance 0.1.3 removed; g2p-en 2.1.0 retained")


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: patch | verify-lock <before-lock>")
    if sys.argv[1] == "patch":
        patch_sources()
        return
    if sys.argv[1] == "verify-lock" and len(sys.argv) == 3:
        verify_lock(Path(sys.argv[2]))
        return
    raise SystemExit("usage: patch | verify-lock <before-lock>")


if __name__ == "__main__":
    main()
