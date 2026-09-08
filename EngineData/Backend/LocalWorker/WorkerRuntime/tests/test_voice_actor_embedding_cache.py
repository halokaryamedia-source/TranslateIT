from __future__ import annotations

from test_voice_actor_inference import load_provider_module


class FakeSpeakerModel:
    def __init__(self) -> None:
        self.calls: list[object] = []

    def compute_embedding3(self, audio):
        self.calls.append(audio)
        return ("embedding", id(audio))


class FakeTts:
    def __init__(self, reference_audio) -> None:
        self.is_v2pro = True
        self.sv_model = FakeSpeakerModel()
        self.prompt_cache = {"refer_spec": [("spec", reference_audio)]}


def test_v2pro_reference_speaker_embedding_is_cached_by_reference_identity() -> None:
    provider = load_provider_module()
    reference_audio = object()
    other_audio = object()
    tts = FakeTts(reference_audio)

    cached = provider.reference_speaker_embeddings(tts)
    assert len(cached) == 1
    assert tts.sv_model.calls == [reference_audio]
    original_model = tts.sv_model

    runtime = {"tts": tts, "reference_speaker_embeddings": cached}
    with provider.reuse_reference_speaker_embeddings(runtime):
        assert tts.sv_model is not original_model
        assert tts.sv_model.compute_embedding3(reference_audio) == cached[0][1]
        assert original_model.calls == [reference_audio]
        tts.sv_model.compute_embedding3(other_audio)
        assert original_model.calls == [reference_audio, other_audio]

    assert tts.sv_model is original_model


def test_non_v2pro_runtime_does_not_create_speaker_embedding_cache() -> None:
    provider = load_provider_module()
    tts = FakeTts(object())
    tts.is_v2pro = False
    assert provider.reference_speaker_embeddings(tts) == []
    assert tts.sv_model.calls == []
