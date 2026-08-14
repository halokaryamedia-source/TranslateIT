from pathlib import Path

root=Path('.')
local_readme=root/'EngineData/Backend/LocalWorker/README.md'
voice_readme=root/'EngineData/Backend/RuntimeAssets/Voice/README.md'
validator=root/'EngineData/Frontend/RustApp/scripts/validate_release_payload.mjs'
contract=root/'EngineData/Frontend/RustApp/scripts/validate_release_package_contract.mjs'

text=local_readme.read_text(encoding='utf-8')
anchor='''Build/release staging may use CI/development tooling to assemble that private runtime, but the release must remain pinned to the official CPython 3.12.10 Windows embeddable package from Python.org. The staged runtime must preserve CPython's license file and the exact package-license/notice material needed by the generated third-party notice bundle. Packages are installed from the frozen `uv.lock`; do not create a second environment or silently resolve newer package versions during product startup.\n'''
addition='''\nR3 pins the concrete CPython input used for the controlled Windows release profile:\n\n```text\nsource URL      https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip\narchive bytes   11133606\narchive MD5     fe8ef205f2e9c3ba44d0cf9954e1abd3\narchive SHA256  4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3\n```\n\nThe staged `PythonRuntime/PYTHON_SOURCE.txt` must record that exact provenance. The embeddable distribution's `python312._pth` is also part of the release contract. Python's embeddable `_pth` isolation ignores `PYTHONPATH` and other environment/registry paths, so the only active path entries must be:\n\n```text\npython312.zip\n.\n..\\WorkerRuntime\n```\n\n`import site` must remain disabled. `.` owns the vendored frozen Python packages copied into `PythonRuntime`; `..\\WorkerRuntime` exposes only TranslateIT's canonical sibling worker modules. Do not solve this by enabling system/user site-packages, copying a second worker into PythonRuntime, or relying on `PYTHONPATH`.\n'''
if anchor not in text: raise SystemExit('LocalWorker README anchor missing')
text=text.replace(anchor,anchor+addition,1)
local_readme.write_text(text,encoding='utf-8')

text=voice_readme.read_text(encoding='utf-8')
anchor='''The first VoiceLab release must use **packaged** English G2P resources. Do not let NLTK download data on first use. Keep these directories under `nltk_data` in the voice source payload:\n\n```text\nnltk_data/\n├─ corpora/cmudict/\n├─ taggers/averaged_perceptron_tagger/\n└─ taggers/averaged_perceptron_tagger_eng/\n```\n'''
addition='''\nR3 pins those three data resources to `nltk/nltk_data` revision `550b6625bcef1f2abff2ff770a5a0d272c9c6b2a`. The exact source-package hashes are:\n\n```text\ncorpora/cmudict.zip                          d07cca47fd72ad32ea9d8ad1219f85301eeaf4568f8b6b73747506a71fb5afd6\ntaggers/averaged_perceptron_tagger.zip      e1f13cf2532daadfd6f3bc481a49859f0b8ea6432ccdcd83e6a49a5f19008de9\ntaggers/averaged_perceptron_tagger_eng.zip  6025f530624335c67d6547d44757b357b4e79bae030a0383e9887a92c1718f0b\n```\n\nThe staged voice source must include `NLTK_DATA_SOURCE.txt` with that repository revision and all three package hashes. A different NLTK data snapshot must be reviewed and re-pinned before release; first-use NLTK downloads remain forbidden.\n'''
if anchor not in text: raise SystemExit('Voice README NLTK anchor missing')
text=text.replace(anchor,anchor+addition,1)
voice_readme.write_text(text,encoding='utf-8')

text=validator.read_text(encoding='utf-8')
anchor='const expectedRevision = "d523079fc05d9a8028d6085bffe4a2757c32abb6";\n'
addition='''const expectedPythonArchiveSha256 = "4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3";\nconst expectedNltkRevision = "550b6625bcef1f2abff2ff770a5a0d272c9c6b2a";\nconst expectedNltkPackages = {\n  "corpora/cmudict.zip": "d07cca47fd72ad32ea9d8ad1219f85301eeaf4568f8b6b73747506a71fb5afd6",\n  "taggers/averaged_perceptron_tagger.zip": "e1f13cf2532daadfd6f3bc481a49859f0b8ea6432ccdcd83e6a49a5f19008de9",\n  "taggers/averaged_perceptron_tagger_eng.zip": "6025f530624335c67d6547d44757b357b4e79bae030a0383e9887a92c1718f0b",\n};\n'''
if anchor not in text: raise SystemExit('validator constants anchor missing')
text=text.replace(anchor,anchor+addition,1)

anchor='requireFile(join(pythonRoot, "python.exe"), "LocalWorker/PythonRuntime/python.exe");\n'
addition='''requireFile(join(pythonRoot, "LICENSE.txt"), "LocalWorker/PythonRuntime/LICENSE.txt");\nrequireFile(join(pythonRoot, "PYTHON_SOURCE.txt"), "LocalWorker/PythonRuntime/PYTHON_SOURCE.txt");\nrequireFile(join(pythonRoot, "python312._pth"), "LocalWorker/PythonRuntime/python312._pth");\nif (existsSync(join(pythonRoot, "PYTHON_SOURCE.txt"))) {\n  const sourceRecord = readFileSync(join(pythonRoot, "PYTHON_SOURCE.txt"), "utf8");\n  for (const marker of [\n    "source_kind=cpython-embeddable",\n    "release=3.12.10",\n    "source_url=https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip",\n    "archive_bytes=11133606",\n    "archive_md5=fe8ef205f2e9c3ba44d0cf9954e1abd3",\n    `archive_sha256=${expectedPythonArchiveSha256}`,\n  ]) {\n    if (!sourceRecord.includes(marker)) fail(`PYTHON_SOURCE.txt provenance marker is missing: ${marker}`);\n  }\n}\nif (existsSync(join(pythonRoot, "python312._pth"))) {\n  const activePaths = readFileSync(join(pythonRoot, "python312._pth"), "utf8")\n    .replace(/\\r\\n/g, "\\n")\n    .replace(/\\r/g, "\\n")\n    .split("\\n")\n    .map((line) => line.trim())\n    .filter((line) => line && !line.startsWith("#"));\n  if (JSON.stringify(activePaths) !== JSON.stringify(["python312.zip", ".", "..\\\\WorkerRuntime"])) {\n    fail("PythonRuntime/python312._pth must expose only python312.zip, the vendored PythonRuntime root, and canonical sibling WorkerRuntime.");\n  }\n  if (activePaths.some((line) => line.toLowerCase() === "import site")) {\n    fail("PythonRuntime/python312._pth must keep site import disabled; system/user site-packages are not a release dependency.");\n  }\n}\n'''
if anchor not in text: raise SystemExit('validator python anchor missing')
text=text.replace(anchor,anchor+addition,1)

anchor='const ffmpegPath = join(voiceSourceRoot, "ffmpeg.exe");\n'
addition='''const nltkSourcePath = join(voiceSourceRoot, "NLTK_DATA_SOURCE.txt");\nrequireFile(nltkSourcePath, "GPT-SoVITS/Source/NLTK_DATA_SOURCE.txt");\nif (existsSync(nltkSourcePath)) {\n  const sourceRecord = readFileSync(nltkSourcePath, "utf8");\n  for (const marker of [\n    "source_kind=nltk_data",\n    "repository=nltk/nltk_data",\n    `revision=${expectedNltkRevision}`,\n    ...Object.entries(expectedNltkPackages).map(([name, hash]) => `${name} sha256=${hash}`),\n  ]) {\n    if (!sourceRecord.includes(marker)) fail(`NLTK_DATA_SOURCE.txt provenance marker is missing: ${marker}`);\n  }\n}\n'''
if anchor not in text: raise SystemExit('validator voice anchor missing')
text=text.replace(anchor,addition+anchor,1)
validator.write_text(text,encoding='utf-8')

text=contract.read_text(encoding='utf-8')
anchor='''for (const marker of [\n  "CPython 3.12.10 Windows embeddable package",\n  "version-scoped `exclude-dependencies`",\n  "uv.lock` must not contain the `Distance` package",\n  "uv>=0.12.0",\n  "FFmpeg, VB-CABLE",\n]) {\n'''
replacement='''for (const marker of [\n  "CPython 3.12.10 Windows embeddable package",\n  "4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3",\n  "PythonRuntime/PYTHON_SOURCE.txt",\n  "..\\\\WorkerRuntime",\n  "`import site` must remain disabled",\n  "version-scoped `exclude-dependencies`",\n  "uv.lock` must not contain the `Distance` package",\n  "uv>=0.12.0",\n  "FFmpeg, VB-CABLE",\n]) {\n'''
if anchor not in text: raise SystemExit('package contract Python marker anchor missing')
text=text.replace(anchor,replacement,1)
anchor='''  "CMU states research/commercial use is unrestricted",\n]) {\n'''
replacement='''  "CMU states research/commercial use is unrestricted",\n  "550b6625bcef1f2abff2ff770a5a0d272c9c6b2a",\n  "NLTK_DATA_SOURCE.txt",\n  "d07cca47fd72ad32ea9d8ad1219f85301eeaf4568f8b6b73747506a71fb5afd6",\n  "6025f530624335c67d6547d44757b357b4e79bae030a0383e9887a92c1718f0b",\n]) {\n'''
if anchor not in text: raise SystemExit('package contract Voice marker anchor missing')
text=text.replace(anchor,replacement,1)
contract.write_text(text,encoding='utf-8')
print('[r3] private Python path + NLTK provenance contract patch applied')
