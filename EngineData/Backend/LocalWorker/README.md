# Backend LocalWorker

## Purpose

`LocalWorker` owns TranslateIT's one local Python runtime boundary for ASR, bidirectional translation, trained My Voice inference, and the bounded one-shot VoiceLab build child.

## Current Layout

```text
LocalWorker/
├─ WorkerRuntime/                       # Git-tracked application/runtime source
│  ├─ realtime_local_worker.py         # one daily ASR / translation / TTS worker
│  ├─ voice_lab_build.py               # one-shot VoiceLab build child
│  ├─ voice_lab_gpt_sovits.py          # pinned GPT-SoVITS build/inference adapter
│  ├─ voice_lab_upstream_stage.py      # bounded headless upstream-stage bridge
│  ├─ model_manifest.json              # canonical full-product release model inventory
│  ├─ pyproject.toml
│  └─ uv.lock                          # frozen source/build dependency graph
└─ PythonRuntime/                       # controlled release payload, ignored by Git
   └─ python.exe                       # installed-product interpreter authority
```

Development may use `WorkerRuntime/.venv`, `TRANSLATEIT_WORKER_PYTHON`, or a system Python only inside verified repository-development mode. Packaged mode resolves only `PythonRuntime/python.exe` and fails closed if it is missing; normal users are not instructed to install Python or pip.

## Release Boundary

The Windows release overlay bundles only the production WorkerRuntime files consumed by the product plus the private `PythonRuntime` and required `RuntimeAssets`. Test files, setup/smoke scripts, `.venv`, `DevelopingData`, and user data are not release runtime inputs.

Large/private runtime bytes are staged as controlled release inputs and remain out of Git. `scripts/validate_release_payload.mjs` verifies the complete controlled staging input before release-only trimming. `scripts/optimize_release_payload.py` then removes only the Windows-profiled English-only release exclusions, and `build_release.ps1` regenerates third-party notices from the final optimized Python closure before packaging. Actual installed execution remains target/installed proof.

The frozen `WorkerRuntime/pyproject.toml` + `uv.lock` remains the reproducible source/build closure because the pinned upstream GPT-SoVITS code contains multilingual eager imports. The installed release is intentionally smaller: the release optimizer reduces the current 116-distribution baseline to the proven 97-distribution English-only closure without creating a second environment or changing the approved model/runtime stack.

## Python Runtime Provenance / License Gate

- The release Python authority is **CPython 3.12.10 Windows embeddable package** from Python.org, not a copied developer installation. Keep the Python Software Foundation License Version 2 and the applicable incorporated-software acknowledgements with the distributed runtime.

R3 pins the concrete CPython input used for the controlled Windows release profile:

```text
source URL      https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip
archive bytes   11133606
archive MD5     fe8ef205f2e9c3ba44d0cf9954e1abd3
archive SHA256  4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3
```

The staged `PythonRuntime/PYTHON_SOURCE.txt` must record that exact provenance. The embeddable distribution's `python312._pth` is also part of the release contract. In `_pth` isolated mode, environment/registry path injection such as `PYTHONPATH` is not an installed-product dependency. The only active path entries must be:

```text
python312.zip
.
..\WorkerRuntime
```

`import site` must remain disabled. `.` owns the frozen third-party packages vendored into `PythonRuntime`; `..\WorkerRuntime` exposes only TranslateIT's canonical sibling worker modules. Do not solve this by enabling system/user site-packages, copying a second WorkerRuntime into PythonRuntime, or relying on environment-variable path injection.

- `WorkerRuntime/uv.lock` is the exact reviewed source/build dependency graph from which the staged private runtime is assembled. The final installed closure is a deterministic subset owned by `scripts/optimize_release_payload.py`; changing its exclusion set, expected 116→97 distribution counts, or required-retained set requires repeating the Windows release profile before adoption.
- `g2p-en` is pinned to **2.1.0** because the dependency exception below is source-reviewed against that exact release. Its published metadata declares `distance`, but hosted inspection of the installed `g2p_en` 2.1.0 Python package confirms that the runtime source contains no `distance` reference, and an English G2P smoke test succeeds while `distance` is absent.
- The canonical `[tool.uv]` policy therefore uses a **version-scoped `exclude-dependencies`** entry that removes only `distance` as declared by `g2p-en==2.1.0`. `uv.lock` must not contain the `Distance` package. Any `g2p-en` version change must remove or re-justify this exception and repeat the source/runtime proof before release staging.
- WorkerRuntime dependency resolution requires `uv>=0.12.0` so the scoped exclusion is understood consistently. This is developer/build tooling only; `uv` is not an installed-product dependency.
- This containment removes the identified `Distance` package from the private Python dependency graph. It is not a legal opinion or overall release-clearance claim; FFmpeg, VB-CABLE, and remaining third-party notices retain their separate gates.

### Exceptional Frozen-Wheel License Material

The R3 baseline Windows staging proof established that 106 of the 116 frozen source/build distributions carry their own license/notice material after installation. Ten exact distributions do not. The complete controlled input must therefore receive the reviewed material below before the initial release preflight.

The final release optimizer subsequently removes `jieba` and `jieba-fast` together with the other proven English-only release exclusions. Final notice generation occurs **after** optimization, so those removed packages are not represented as installed runtime distributions. The remaining eight exceptional distributions keep their reviewed material in the optimized release.

```text
ctranslate2==4.8.1
  source tag v4.8.1 -> commit 0d8bcd362ac75ef860ef161d6f0efad0ae439ff0
  LICENSE sha256 54aa79d9fe3c09e67a16dcd95b9e88676405a6ec174efda31036983cf7672ecb

flatbuffers==25.12.19
  source tag v25.12.19 -> commit 7e163021e59cca4f8e1e35a7c828b5c6b7915953
  LICENSE sha256 cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30

jieba==0.42.1                         # baseline preflight only; removed from final optimized release
  PyPI sdist sha256 055ca12f62674fafed09427f176506079bc135638a14e23e25be909131928db2
  source tag v0.42.1 -> commit 1e20c89b66f56c9301b0feed211733ffaa1bd72a
  LICENSE sha256 18ba0984839f85853b29fadaf992f7dba8fd0ca0fbeae34de2b8735222dc7a37

jieba-fast==0.53                     # baseline preflight only; removed from final optimized release
  PyPI sdist sha256 e92089d52faa91d51b6a7c1e6e4c4c85064a0e36f6a29257af2254b9e558ddd0
  upstream has no release tag; supplemental LICENSE is pinned to repository commit 5e6b21dece184e1004a35bfd802c8772059de3ab
  LICENSE sha256 18ba0984839f85853b29fadaf992f7dba8fd0ca0fbeae34de2b8735222dc7a37

loguru==0.7.3
  PyPI sdist sha256 19480589e77d47b8d85b2c827ad95d49bf31b0dcde16593892eb51dd18706eb6
  source tag 0.7.3 -> commit ae3bfd1b85b6b4a3db535f69b975687c79498be4
  LICENSE sha256 b35d026cc7aca9d5859a02eb87ddf7a386a24c986838651bd1f283f94e003327

onnxruntime==1.28.0
  source tag v1.28.0 -> commit da9b5e364c465de65c49d91e696cd6485270757f
  LICENSE sha256 2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c
  ThirdPartyNotices.txt sha256 0e07b95f3a8d6230037707c5c4a2b554d12c4cb67369669ac255635528ffcee2

sentencepiece==0.2.2
  PyPI sdist sha256 3d2b5e824b5622038dc7b490897efe05ebbbb9e7350fc142f3ecc8789ef9bdf6
  package LICENSE sha256 cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30
  bundled abseil-cpp LICENSE sha256 c79a7fea0e3cac04cd43f20e7b648e5a0ff8fa5344e644b0ee09ca1162b62747
  bundled darts_clone LICENSE sha256 155f59997298ee336602c49f9c1110f268ac394ca2197eb02647a3555935ad52
  bundled esaxx LICENSE sha256 7c28553d1d3312d65fe309f76a22ebaf33a3d76c8c1e3b98a88ee4654ecb53db
  bundled protobuf-lite LICENSE sha256 6e5e117324afd944dcf67f36cf329843bc1a92229a8cd9bb573d7a83130fea7d

tensorboard-data-server==0.7.2
  exact upstream release commit 81150b898a306b89cde90e949358c2eefe018eaa (`tensorboard-data-server 0.7.2`)
  root LICENSE sha256 d7c9068d896188264b60827b8cd1e25fdb9f5b5cad0b1589e90b96c87729c404

tokenizers==0.22.2
  PyPI sdist sha256 473b83b915e547aa366d1eee11806deaf419e17be16310ac0a14077f1e28f917
  package LICENSE sha256 c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4

wordsegment==1.3.1
  PyPI sdist sha256 3dcc7cd1e9bba3f3ffe6a0e54d98377bc502fc34e9e9d8c8199ac5636924f023
  LICENSE sha256 8fe4d37c518608a57c6b0f24e26915144f8daf460eb4e1572146596ec3673294
```

These are controlled staging inputs, not network actions performed by the installed application or by `build_release.ps1`. The baseline release payload validator pins the exact added files/hashes and their source records before optimization. Any version change, source-revision drift, replacement wheel, or optimizer exclusion change must be re-audited instead of silently reusing this evidence.

## Rules

- Keep one canonical Python runtime and one daily worker.
- Do not create a second GPT-SoVITS environment, launcher, server, or provider registry.
- Do not make system Python, pip, uv, environment variables, or repository checkout installed-product dependencies.
- Do not store private Python runtime or model/GPT-SoVITS payload bytes in Git.
- Do not package tests, development setup scripts, local caches, historical `DevelopingData`, release-excluded distributions, or derived Python bytecode into the installer.
- Do not expand the release optimizer beyond its profiled 116→97 closure without new Windows evidence.
