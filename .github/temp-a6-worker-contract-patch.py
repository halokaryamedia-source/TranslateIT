from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()
WORKER_TEST = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_worker_contract.py"
ACTOR_TEST = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_voice_actor_inference.py"
ASSET_TEST = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_prepare_model_assets.py"
MANIFEST = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json"
VOICE_README = ROOT / "EngineData/Backend/RuntimeAssets/Voice/README.md"


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 anchor, found {count}")
    return text.replace(old, new, 1)


def remove_test(text: str, name: str) -> str:
    pattern = rf"\ndef {re.escape(name)}\(.*?(?=\ndef |\Z)"
    result, count = re.subn(pattern, "\n", text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"remove {name}: expected 1 test, found {count}")
    return result


text = WORKER_TEST.read_text(encoding="utf-8")
text = once(
    text,
    '''    monkeypatch.setattr(\n        worker,\n        "select_english_tts_voice",\n        lambda _payload=None: {\n            "ok": True,\n            "provider": "windows-sapi",\n            "voice_id": "Test English Voice",\n            "language_code": "en-us",\n            "voice_path": None,\n            "blocker": "",\n            "sapi_voices": [],\n        },\n    )\n''',
    '''    monkeypatch.setattr(\n        worker,\n        "voice_actor_static_status",\n        lambda: {"ready": True, "actor_token": "actor-v1", "blocker": ""},\n    )\n''',
    "status-mock",
)
text = once(text, '        "tts",\n', '        "voice_actor_tts",\n', "readiness-key")
for name in (
    "test_english_sapi_selection_prefers_en_us",
    "test_piper_selection_requires_english_voice_metadata",
    "test_piper_selection_does_not_trust_filename_without_metadata",
    "test_worker_request_deadline_budget_bounds_nested_subprocess",
    "test_sapi_probe_timeout_does_not_poison_process_cache",
):
    text = remove_test(text, name)
WORKER_TEST.write_text(text, encoding="utf-8", newline="\n")

text = ACTOR_TEST.read_text(encoding="utf-8")
legacy_guard = '    monkeypatch.setattr(worker, "select_english_tts_voice", lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("legacy TTS must not run")))\n'
if text.count(legacy_guard) != 2:
    raise RuntimeError("expected two legacy fallback guards")
text = text.replace(legacy_guard, "")
text = once(
    text,
    '''def test_worker_protocol_registers_a5_actor_commands() -> None:\n    worker = load_worker_module()\n    assert worker.HANDLERS["voice_actor_preflight"] is worker.handle_voice_actor_preflight\n    assert worker.HANDLERS["voice_actor_synthesize"] is worker.handle_voice_actor_synthesize\n''',
    '''def test_static_worker_readiness_requires_approved_actor_and_inference_assets(monkeypatch) -> None:\n    worker = load_worker_module()\n    monkeypatch.setattr(\n        worker.voice_actor_provider,\n        "validate_actor_package",\n        lambda _root: {"fingerprint": (("actor.json", 1, 1),)},\n    )\n    monkeypatch.setattr(\n        worker.voice_actor_provider,\n        "inference_source_assets",\n        lambda _root: {"gsv": Path("gsv")},\n    )\n    status = worker.voice_actor_static_status()\n    assert status["ready"] is True\n    assert status["actor_token"] == '[["actor.json",1,1]]'\n\n\ndef test_meeting_actor_token_rejects_mid_session_actor_change(tmp_path: Path, monkeypatch) -> None:\n    worker = load_worker_module()\n    cache = tmp_path / "CacheData"\n    cache.mkdir()\n    monkeypatch.setattr(worker, "CACHE_ROOT", cache)\n    monkeypatch.setattr(worker, "ALLOWED_OUTPUT_ROOTS", [cache])\n    monkeypatch.setattr(\n        worker.voice_actor_provider,\n        "validate_actor_package",\n        lambda _root: {"fingerprint": (("actor.json", 2, 2),)},\n    )\n    output = cache / "voice.wav"\n    result = worker.handle_voice_actor_synthesize(\n        {\n            "text": "Hello.",\n            "output_path": str(output),\n            "expected_actor_token": '[["actor.json",1,1]]',\n        }\n    )\n    assert result["ok"] is False\n    assert result["blocker"] == "voice_actor:actor_changed_since_meeting_start"\n    assert not output.exists()\n\n\ndef test_worker_protocol_exposes_only_trained_actor_tts_commands() -> None:\n    worker = load_worker_module()\n    assert worker.HANDLERS["voice_actor_preflight"] is worker.handle_voice_actor_preflight\n    assert worker.HANDLERS["voice_actor_synthesize"] is worker.handle_voice_actor_synthesize\n    assert "tts_preflight" not in worker.HANDLERS\n    assert "synthesize" not in worker.HANDLERS\n''',
    "actor-a6-tests",
)
ACTOR_TEST.write_text(text, encoding="utf-8", newline="\n")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
models = manifest.get("models")
if not isinstance(models, list):
    raise RuntimeError("manifest models missing")
piper = [item for item in models if item.get("model_id") == "piper"]
if len(piper) != 1:
    raise RuntimeError(f"expected one Piper inventory entry, found {len(piper)}")
manifest["models"] = [item for item in models if item.get("model_id") != "piper"]
for item in manifest["models"]:
    if item.get("model_id") == "gpt-sovits-v2proplus-voicelab":
        item["stage"] = "voice_actor_build_and_inference"
        item["notes"] = "Required full-product-release VoiceLab creation and trained My Voice inference asset at the pinned V2ProPlus source boundary. Presence is installation evidence only; training quality, CUDA behavior, speaker fidelity, and target-PC inference latency require separate proof."
        break
else:
    raise RuntimeError("canonical GPT-SoVITS inventory entry missing")
MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")

text = ASSET_TEST.read_text(encoding="utf-8")
text = once(
    text,
    '''    assert {item["model_id"] for item in manual} == {\n        "gpt-sovits-v2proplus-voicelab",\n        "piper",\n    }\n''',
    '''    assert {item["model_id"] for item in manual} == {\n        "gpt-sovits-v2proplus-voicelab",\n    }\n''',
    "asset-manual-set",
)
text = once(
    text,
    '''        module.build_plan(module.load_manifest(), requested_ids={"piper"})\n''',
    '''        module.build_plan(\n            module.load_manifest(),\n            requested_ids={"gpt-sovits-v2proplus-voicelab"},\n        )\n''',
    "asset-manual-request",
)
text = once(
    text,
    '''        raise AssertionError("manual Piper asset must not be promoted to Hugging Face acquisition")\n''',
    '''        raise AssertionError("manual GPT-SoVITS asset must not be promoted to Hugging Face acquisition")\n''',
    "asset-manual-message",
)
ASSET_TEST.write_text(text, encoding="utf-8", newline="\n")

text = VOICE_README.read_text(encoding="utf-8")
text, count = re.subn(
    r"Voice/\n├─ README.md\n├─ Piper/\n│  ├─ piper.exe\n│  ├─ \*\.onnx\n│  └─ \*\.json\n└─ GPTSoVITS/",
    "Voice/\n├─ README.md\n└─ GPTSoVITS/",
    text,
    count=1,
)
if count != 1:
    raise RuntimeError("Voice README Piper layout anchor missing")
text = once(
    text,
    '''Daily pre-VoiceLab TTS currently remains owned by:\n\n```text\nEngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py\n```\n\nVoiceLab build/evaluation is owned by:\n''',
    '''Daily trained My Voice inference is owned by:\n\n```text\nexisting realtime_local_worker.py\n-> approved UserData/SavedProject/VoiceLab/MyVoice\n-> Voice/GPTSoVITS/Source\n```\n\nVoiceLab build/evaluation is owned by:\n''',
    "voice-readme-route",
)
text = once(
    text,
    "- Keep Piper binaries, GPT-SoVITS source payload, pretrained models, trained weights, generated audio, FFmpeg binary, and NLTK payload out of Git.\n",
    "- Keep GPT-SoVITS source payload, pretrained models, trained weights, generated audio, FFmpeg binary, and NLTK payload out of Git.\n",
    "voice-readme-rule",
)
VOICE_README.write_text(text, encoding="utf-8", newline="\n")

for path in (WORKER_TEST, ACTOR_TEST, ASSET_TEST):
    compile(path.read_text(encoding="utf-8"), str(path), "exec")
subprocess.run(["git", "diff", "--check"], check=True)
if any(item.get("model_id") == "piper" for item in json.loads(MANIFEST.read_text(encoding="utf-8"))["models"]):
    raise RuntimeError("Piper remains release-required")
print("A6_WORKER_CONTRACT_PATCH=PASS")
