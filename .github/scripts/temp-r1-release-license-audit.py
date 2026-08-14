from pathlib import Path
import json

ROOT = Path('.')


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


# Canonical model inventory: keep the existing schema, add exact reviewed VoiceLab asset provenance.
manifest_path = Path('EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
gpt = next((item for item in manifest.get('models', []) if item.get('model_id') == 'gpt-sovits-v2proplus-voicelab'), None)
if not gpt:
    raise SystemExit('GPT-SoVITS model inventory entry not found')
gpt['asset_repo_id'] = 'lj1995/GPT-SoVITS'
gpt['asset_revision'] = '336b2ec4e8d4ac74740798dd40af44e74659ecaf'
gpt['asset_hashes'] = {
    's1v3.ckpt': '87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a',
    'sv/pretrained_eres2netv2w24s4ep4.ckpt': '4f5a0bf73c61eb41b174e1bb54e7ee3c83233892be8e0af1f187024e8e581a35',
    'v2Pro/s2Dv2ProPlus.pth': '635cd84bf6f7f9b8d41c88c7106f81d782c794c61f931845214ea037b0c5bef2',
    'v2Pro/s2Gv2ProPlus.pth': 'd42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b',
}
gpt['license'] = 'mit (RVC-Boss/GPT-SoVITS source); bundled pretrained and third-party runtime assets retain their own license/attribution requirements'
gpt['notes'] = (
    'Required full-product-release VoiceLab creation and trained My Voice inference asset at the pinned V2ProPlus source boundary. '
    'The reviewed pretrained snapshot and key hashes above are release provenance, not model-quality proof. Preserve upstream and third-party notices; '
    'FFmpeg and the frozen Python dependency graph have separate release-license gates documented by the controlled payload owners.'
)
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

# LocalWorker owns the private Python runtime and frozen dependency graph.
local_readme = Path('EngineData/Backend/LocalWorker/README.md')
anchor = '''Large/private runtime bytes are staged as controlled release inputs and remain out of Git. `scripts/validate_release_payload.mjs` verifies their required presence before the installer build; actual installed execution remains target/installed proof.\n\n## Rules\n'''
section = '''Large/private runtime bytes are staged as controlled release inputs and remain out of Git. `scripts/validate_release_payload.mjs` verifies their required presence before the installer build; actual installed execution remains target/installed proof.\n\n## Python Runtime Provenance / License Gate\n\n- The release Python authority is **CPython 3.12.10 Windows embeddable package** from Python.org, not a copied developer installation. Keep the Python Software Foundation License Version 2 and the applicable incorporated-software acknowledgements with the distributed runtime.\n- `WorkerRuntime/uv.lock` is the exact third-party Python dependency graph that must be reviewed for the staged private runtime. Python itself being redistributable does not clear every vendored Python package.\n- The current lock resolves `g2p-en==2.1.0` to the transitive dependency `distance==0.1.3`. Upstream `g2p-en` is Apache-2.0, while the `Distance` package declares GPL. This is a **license-review blocker** for a closed/commercial release until the applicable distribution obligations are deliberately accepted or the dependency boundary is corrected and re-proved.\n- This source audit records a release gate; it is not a legal opinion and must not be used as proof that a particular commercial distribution is cleared.\n\n## Rules\n'''
replace_once(local_readme, anchor, section, 'LocalWorker release boundary')

# RuntimeAssets owns cross-model/provider release provenance policy.
runtime_readme = Path('EngineData/Backend/RuntimeAssets/README.md')
anchor = '''Presence in this folder is release-input evidence only. It does not prove model load, training quality, speaker fidelity, GPU/VRAM practicality, latency, Windows audio delivery, installed execution, or clean-machine behavior.\n\n## Rules\n'''
section = '''Presence in this folder is release-input evidence only. It does not prove model load, training quality, speaker fidelity, GPU/VRAM practicality, latency, Windows audio delivery, installed execution, or clean-machine behavior.\n\n## Release Provenance / License Gate\n\nThe controlled release inventory must preserve both **exact provenance** and the applicable upstream notices. Current source audit status:\n\n| Release input | Reviewed source / pin | Declared license status | Release gate |\n|---|---|---|---|\n| Faster Whisper large-v3-turbo | `dropbox-dash/faster-whisper-large-v3-turbo` @ `0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf` | MIT | Preserve license/source identity and stage the pinned bytes. |\n| Marian ID -> EN | `Helsinki-NLP/opus-mt-id-en` @ `9a7f1b0d0dfe0a92ba691030b01d6f23f966e7ec` | Apache-2.0 | Preserve Apache-2.0 notice/source identity and stage the pinned bytes. |\n| Marian EN -> ID | `Helsinki-NLP/opus-mt-en-id` @ `6e4c52d61a6b16fe3509b0267cbfec65011b860b` | Apache-2.0 | Preserve Apache-2.0 notice/source identity and stage the pinned bytes. |\n| GPT-SoVITS source | `RVC-Boss/GPT-SoVITS` @ `d523079fc05d9a8028d6085bffe4a2757c32abb6` | MIT | Preserve upstream license; pretrained/FFmpeg/NLTK inputs have separate obligations below `Voice/README.md`. |\n| Standard VB-CABLE | official VB-Audio standard VB-CABLE package | Donationware / conditional distribution | Concrete release redistribution rights are **not** proven by source. The existing VB-CABLE owner remains the authority for the distribution gate. |\n\n`validate_release_payload.mjs` proving that files exist is **not license clearance**. A release operator must not promote a staged payload to a distributable release while an applicable license/provenance gate remains unresolved. The private Python-runtime dependency gate is documented at `LocalWorker/README.md`; the voice-asset detail is documented at `Voice/README.md`.\n\n## Rules\n'''
replace_once(runtime_readme, anchor, section, 'RuntimeAssets release boundary')

# Voice payload: exact source/model provenance and the unresolved FFmpeg license-profile boundary.
voice_readme = Path('EngineData/Backend/RuntimeAssets/Voice/README.md')
anchor = '''The GPT-SoVITS source is never launched as a WebUI or server by TranslateIT.\n\n## Rules\n'''
section = '''The GPT-SoVITS source is never launched as a WebUI or server by TranslateIT.\n\n## Release Provenance / License Gate\n\n### GPT-SoVITS source and pretrained snapshot\n\n- Application-consumed GPT-SoVITS source remains pinned to `RVC-Boss/GPT-SoVITS` revision `d523079fc05d9a8028d6085bffe4a2757c32abb6`; upstream source is MIT and its license must remain with the bundled source.\n- The reviewed pretrained-asset snapshot is `lj1995/GPT-SoVITS` revision `336b2ec4e8d4ac74740798dd40af44e74659ecaf`. Do not stage floating `main` as release authority.\n- Key release weights must match these SHA-256 values before a distributable payload is approved:\n\n```text\ns1v3.ckpt                                      87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a\nsv/pretrained_eres2netv2w24s4ep4.ckpt          4f5a0bf73c61eb41b174e1bb54e7ee3c83233892be8e0af1f187024e8e581a35\nv2Pro/s2Dv2ProPlus.pth                         635cd84bf6f7f9b8d41c88c7106f81d782c794c61f931845214ea037b0c5bef2\nv2Pro/s2Gv2ProPlus.pth                         d42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b\n```\n\nThe repository-level MIT declaration is not permission to discard third-party attribution or license text for nested assets. Preserve the original notices applicable to the packaged HuBERT/RoBERTa/speaker resources.\n\n### English G2P data\n\nThe two packaged NLTK averaged-perceptron tagger resources are recorded by NLTK as MIT. NLTK's aggregate metadata lists `cmudict` as ambiguous, so TranslateIT follows the original CMUdict source instead: CMU states research/commercial use is unrestricted and requests acknowledgement of Carnegie Mellon origin when the dictionary is used or redistributed. Preserve that acknowledgement in release notices.\n\n### FFmpeg\n\n`ffmpeg.exe` is **not license-cleared by the current source contract**. FFmpeg is LGPL 2.1-or-later by default, but a build that enables GPL-covered components is governed by GPL terms. The historical GPT-SoVITS-linked Windows binary having a known file hash or being hosted inside an MIT-labelled model repository does not establish its FFmpeg build configuration or license profile.\n\nBefore a distributable release, record the exact Windows FFmpeg build origin/configuration and satisfy the corresponding FFmpeg license/source obligations. Do not treat `ffmpeg.exe` presence alone as release clearance.\n\n## Rules\n'''
replace_once(voice_readme, anchor, section, 'Voice release boundary')

# Source-level package contract should retain these provenance gates without claiming legal clearance.
validator = Path('EngineData/Frontend/RustApp/scripts/validate_release_package_contract.mjs')
text = validator.read_text(encoding='utf-8')
text = text.replace(
    'const providerReadme = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/AudioProvider/VBCABLE/README.md"), "utf8");\n',
    'const providerReadme = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/AudioProvider/VBCABLE/README.md"), "utf8");\n'
    'const localWorkerReadme = readFileSync(resolve(appRoot, "../../Backend/LocalWorker/README.md"), "utf8");\n'
    'const runtimeAssetsReadme = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/README.md"), "utf8");\n'
    'const voiceAssetsReadme = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/Voice/README.md"), "utf8");\n',
    1,
)
model_anchor = '''for (const id of [\n  "faster-whisper-large-v3-turbo",\n  "marianmt-id-en",\n  "marianmt-en-id",\n  "gpt-sovits-v2proplus-voicelab",\n]) {\n  if (!requiredIds.has(id)) fail(`Required release model is missing from model_manifest.json: ${id}`);\n}\n\n'''
model_section = model_anchor + '''const gptSoVitsInventory = (modelManifest.models ?? []).find((item) => item.model_id === "gpt-sovits-v2proplus-voicelab");\nif (gptSoVitsInventory?.asset_repo_id !== "lj1995/GPT-SoVITS" || gptSoVitsInventory?.asset_revision !== "336b2ec4e8d4ac74740798dd40af44e74659ecaf") {\n  fail("GPT-SoVITS pretrained release provenance must stay pinned to the reviewed lj1995/GPT-SoVITS snapshot.");\n}\nconst expectedVoiceHashes = {\n  "s1v3.ckpt": "87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a",\n  "sv/pretrained_eres2netv2w24s4ep4.ckpt": "4f5a0bf73c61eb41b174e1bb54e7ee3c83233892be8e0af1f187024e8e581a35",\n  "v2Pro/s2Dv2ProPlus.pth": "635cd84bf6f7f9b8d41c88c7106f81d782c794c61f931845214ea037b0c5bef2",\n  "v2Pro/s2Gv2ProPlus.pth": "d42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b",\n};\nfor (const [path, hash] of Object.entries(expectedVoiceHashes)) {\n  if (gptSoVitsInventory?.asset_hashes?.[path] !== hash) fail(`GPT-SoVITS pretrained hash contract drifted: ${path}`);\n}\n\nfor (const marker of [\n  "CPython 3.12.10 Windows embeddable package",\n  "g2p-en==2.1.0",\n  "distance==0.1.3",\n  "license-review blocker",\n]) {\n  if (!localWorkerReadme.includes(marker)) fail(`Python release provenance/license gate marker is missing: ${marker}`);\n}\nfor (const marker of [\n  "Release Provenance / License Gate",\n  "not license clearance",\n  "Concrete release redistribution rights are **not** proven by source",\n]) {\n  if (!runtimeAssetsReadme.includes(marker)) fail(`Runtime asset release gate marker is missing: ${marker}`);\n}\nfor (const marker of [\n  "336b2ec4e8d4ac74740798dd40af44e74659ecaf",\n  "87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a",\n  "d42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b",\n  "not license-cleared by the current source contract",\n  "CMU states research/commercial use is unrestricted",\n]) {\n  if (!voiceAssetsReadme.includes(marker)) fail(`Voice release provenance/license gate marker is missing: ${marker}`);\n}\n\n'''
if model_anchor not in text:
    raise SystemExit('release validator model anchor not found')
text = text.replace(model_anchor, model_section, 1)
old_log = 'console.log("[release-package-contract] P4 provider policy is source-aligned: the controlled Windows release remains one Tauri/NSIS path, standard VB-CABLE is the only staged Meeting audio provider candidate, the donationware/origin notice is bundled, alternate VB-CABLE/Voicemeeter/custom-driver expansion is excluded, private runtime/model/provider bytes remain controlled release inputs outside Git, and packaged mode has no system-Python fallback. Redistribution rights, driver installation, restart behavior, installed endpoint use, and clean-machine execution remain separate release evidence.");'
new_log = 'console.log("[release-package-contract] Release source policy is aligned: private Python/model/provider inputs remain controlled and pinned where currently reviewable, GPT-SoVITS source/pretrained provenance is recorded, Python/FFmpeg/VB-CABLE licensing gates remain explicit rather than fabricated as cleared, and packaged mode has no system-Python fallback. Actual redistribution clearance, staged-byte verification, driver installation, installed runtime, and clean-machine execution remain separate evidence.");'
if old_log not in text:
    raise SystemExit('release validator log anchor not found')
text = text.replace(old_log, new_log, 1)
validator.write_text(text, encoding='utf-8')

print('[r1-license-audit] controlled release provenance/license source contract patched')
