from __future__ import annotations

from dataclasses import dataclass

from EngineData.TranscriptEngine.audio_noise_filter import AudioNoiseFilter


@dataclass(slots=True)
class ASRQualityReport:
    transcript_text: str = ""
    audio_rms: float = 0.0
    audio_peak: float = 0.0
    peak_to_rms_ratio: float = 0.0
    speech_to_noise_gap: float = 0.0
    voiced_frame_ratio: float = 0.0
    audio_duration_ms: int = 0
    sustained_speech_ms: int = 0
    no_speech_probability: float = 0.0
    average_log_probability: float = 0.0
    compression_ratio: float = 0.0
    language_probability: float = 0.0
    language_ok: bool = True
    timestamp_ok: bool = True
    repetitive_text: bool = False
    empty_output: bool = False
    zero_crossing_rate: float = 0.0
    frame_energy_concentration: float = 0.0
    frame_active_ratio: float = 0.0
    impulse_edge_ratio: float = 0.0


@dataclass(slots=True)
class ASRQualityDecision:
    accepted: bool
    should_hide: bool
    reason: str


class ASRQualityFilter:
    """Post-ASR rejection logic for weak or hallucinated transcript output."""

    focus_anchor_words = {
        "a",
        "aku",
        "akan",
        "and",
        "atau",
        "bicara",
        "bisa",
        "coba",
        "dan",
        "halo",
        "hello",
        "hi",
        "i",
        "iya",
        "kamu",
        "kami",
        "kita",
        "lagi",
        "mau",
        "no",
        "oke",
        "ok",
        "please",
        "saya",
        "speak",
        "talk",
        "thanks",
        "thank",
        "the",
        "tidak",
        "tolong",
        "try",
        "untuk",
        "we",
        "ya",
        "yes",
        "you",
        "sudah",
        "belum",
        "terima",
        "kasih",
    }

    known_silence_hallucinations = {
        "selamat menikmati",
        "selamat menikmati.",
        "terima kasih",
        "terima kasih.",
        "terima kasih!",
        "terima kasih telah menonton",
        "terima kasih telah menonton.",
        "terima kasih telah menonton!",
        "terima kasih telah menonton",
        "sub indo by broth3rmax",
        "thanks for watching",
        "thanks for watching this video",
        "thank you for watching",
        "see you next time",
        "bye bye",
        "don't forget to subscribe",
        "subscribe for more",
        "i'm going to say",
        "i'm going to use the same language",
        "i'm not sure what i'm saying",
    }
    strict_hallucinations = {
        "i'm going to say",
        "i'm going to use the same language",
        "i'm not sure what i'm saying",
    }

    common_context_tokens = {
        "a",
        "aku",
        "and",
        "apa",
        "are",
        "atau",
        "below",
        "by",
        "dan",
        "dari",
        "di",
        "dengan",
        "for",
        "from",
        "halo",
        "hello",
        "hi",
        "i",
        "ini",
        "is",
        "itu",
        "ke",
        "kamu",
        "kami",
        "karena",
        "ke",
        "ke",
        "kita",
        "mau",
        "my",
        "no",
        "of",
        "on",
        "oke",
        "ok",
        "please",
        "saya",
        "speak",
        "talk",
        "the",
        "this",
        "to",
        "tolong",
        "try",
        "untuk",
        "we",
        "ya",
        "yes",
        "you",
        "yang",
        "with",
    }

    badword_terms = {
        ("anjing",),
        ("asu",),
        ("bajingan",),
        ("bangsat",),
        ("bego",),
        ("brengsek",),
        ("jancok",),
        ("jancuk",),
        ("keparat",),
        ("fuck",),
        ("fucker",),
        ("fucking",),
        ("goblok",),
        ("kontol",),
        ("memek",),
        ("ngentot",),
        ("pelacur",),
        ("shit",),
        ("tai",),
        ("tolol",),
        ("sundal",),
        ("whore",),
        ("slut",),
        ("bitch",),
        ("bastard",),
        ("cunt",),
        ("dickhead",),
        ("motherfucker",),
        ("son", "of", "a", "bitch"),
        ("fuck", "you"),
        ("damn", "you"),
    }

    @staticmethod
    def _normalize_text(text: str) -> str:
        return " ".join(str(text or "").strip().lower().split())

    @classmethod
    def _tokenize(cls, text: str) -> list[str]:
        return [token for token in cls._normalize_text(text).split(" ") if token]

    @classmethod
    def _contains_focus_anchor_word(cls, tokens: list[str]) -> bool:
        return any(token in cls.focus_anchor_words for token in tokens)

    @staticmethod
    def _unique_char_ratio(text: str) -> float:
        alnum = [char for char in text.lower() if char.isalnum()]
        if not alnum:
            return 0.0
        return len(set(alnum)) / float(len(alnum))

    @staticmethod
    def _group_count(text: str, vowels: set[str]) -> int:
        count = 0
        in_group = False
        for char in text.lower():
            is_vowel = char in vowels
            if is_vowel and not in_group:
                count += 1
            in_group = is_vowel
        return count

    @staticmethod
    def _longest_char_run(text: str) -> int:
        longest = 0
        current = ""
        run = 0
        for char in text.lower():
            if not char.isalpha():
                continue
            if char == current:
                run += 1
            else:
                current = char
                run = 1
            if run > longest:
                longest = run
        return longest

    @classmethod
    def _token_profile(cls, token: str) -> dict[str, float | int]:
        letters = "".join(char for char in token.lower() if char.isalpha())
        if not letters:
            return {
                "length": 0,
                "unique_ratio": 0.0,
                "vowel_groups": 0,
                "consonant_groups": 0,
                "longest_run": 0,
            }
        vowels = set("aeiou")
        vowel_groups = cls._group_count(letters, vowels)
        consonant_groups = cls._group_count(letters, set()) - vowel_groups
        return {
            "length": len(letters),
            "unique_ratio": len(set(letters)) / float(len(letters)),
            "vowel_groups": vowel_groups,
            "consonant_groups": max(0, consonant_groups),
            "longest_run": cls._longest_char_run(letters),
        }

    @staticmethod
    def _simplify_badword_token(token: str) -> str:
        if not token:
            return ""
        translated = token.lower().translate(
            str.maketrans(
                {
                    "@": "a",
                    "3": "e",
                    "1": "i",
                    "!": "i",
                    "0": "o",
                    "4": "a",
                    "5": "s",
                    "$": "s",
                }
            )
        )
        letters_only = "".join(char for char in translated if char.isalpha())
        if not letters_only:
            return ""
        simplified: list[str] = []
        previous_char = ""
        for char in letters_only:
            if char != previous_char:
                simplified.append(char)
                previous_char = char
        return "".join(simplified)

    @classmethod
    def _simplified_tokens(cls, tokens: list[str]) -> list[str]:
        simplified = [cls._simplify_badword_token(token) for token in tokens]
        return [token for token in simplified if token]

    @classmethod
    def _find_badword_match(cls, tokens: list[str]) -> str:
        simplified_tokens = cls._simplified_tokens(tokens)
        if not simplified_tokens:
            return ""
        for start in range(len(simplified_tokens)):
            for phrase in cls.badword_terms:
                phrase_length = len(phrase)
                if phrase_length == 0:
                    continue
                candidate = tuple(simplified_tokens[start : start + phrase_length])
                if candidate == phrase:
                    return " ".join(phrase)
        return ""

    @classmethod
    def _looks_like_proper_noun_phrase(cls, report: ASRQualityReport, tokens: list[str]) -> bool:
        token_count = len(tokens)
        if token_count == 0 or token_count > 3:
            return False
        token_profiles = [cls._token_profile(token) for token in tokens]
        if any(int(profile["longest_run"]) >= 3 for profile in token_profiles):
            return False
        if any(int(profile["length"]) < 2 or int(profile["length"]) > 15 for profile in token_profiles):
            return False
        if any(not token.isalpha() for token in tokens):
            return False
        if any(float(profile["unique_ratio"]) < 0.55 for profile in token_profiles):
            return False
        if any(int(profile["vowel_groups"]) == 0 for profile in token_profiles):
            return False
        if float(report.average_log_probability or 0.0) <= -0.32:
            return False
        if float(report.language_probability or 0.0) > 0.0 and float(report.language_probability or 0.0) < 0.50:
            return False
        return True

    @classmethod
    def _looks_like_gibberish(cls, report: ASRQualityReport) -> bool:
        tokens = cls._tokenize(report.transcript_text)
        if not tokens:
            return False
        normalized = cls._normalize_text(report.transcript_text)
        if normalized in cls.focus_anchor_words:
            return False
        token_count = len(tokens)
        anchor_hit = cls._contains_focus_anchor_word(tokens)
        language_probability = float(report.language_probability or 0.0)
        average_log_probability = float(report.average_log_probability or 0.0)
        no_speech_probability = float(report.no_speech_probability or 0.0)
        token_profiles = [cls._token_profile(token) for token in tokens]
        distinct_token_ratio = len(set(tokens)) / float(token_count)
        max_token_length = max(int(profile["length"]) for profile in token_profiles)
        if cls._looks_like_proper_noun_phrase(report, tokens):
            return False
        if token_count == 1:
            token_profile = token_profiles[0]
            if int(token_profile["length"]) >= 6:
                if float(token_profile["unique_ratio"]) <= 0.60 and (
                    average_log_probability <= -0.16
                    or no_speech_probability >= 0.10
                    or (language_probability > 0.0 and language_probability <= 0.60)
                ):
                    return True
                if int(token_profile["vowel_groups"]) <= 1 and average_log_probability <= -0.12:
                    return True
                if int(token_profile["longest_run"]) >= 3 and language_probability <= 0.70 and average_log_probability <= -0.12:
                    return True
        if token_count <= 2 and not anchor_hit:
            if (
                average_log_probability <= -0.45
                and no_speech_probability >= 0.08
                and float(report.voiced_frame_ratio or 0.0) <= 0.32
            ):
                return True
            if language_probability > 0.0 and language_probability <= 0.45 and average_log_probability <= -0.15:
                return True
            if max_token_length >= 7 and distinct_token_ratio <= 0.5 and average_log_probability <= -0.12:
                return True
        if token_count <= 3 and not anchor_hit:
            if distinct_token_ratio <= 0.67 and language_probability > 0.0 and language_probability <= 0.55 and average_log_probability <= -0.20:
                return True
        return False

    @classmethod
    def _looks_like_random_contextless_text(cls, report: ASRQualityReport) -> bool:
        tokens = cls._tokenize(report.transcript_text)
        if len(tokens) < 2:
            return False
        normalized = cls._normalize_text(report.transcript_text)
        if not normalized:
            return False
        if normalized in cls.focus_anchor_words:
            return False
        if normalized in cls.known_silence_hallucinations:
            return False
        if cls._contains_focus_anchor_word(tokens):
            return False
        if cls._find_badword_match(tokens):
            return False
        if cls._looks_like_proper_noun_phrase(report, tokens):
            return False

        language_probability = float(report.language_probability or 0.0)
        average_log_probability = float(report.average_log_probability or 0.0)
        no_speech_probability = float(report.no_speech_probability or 0.0)
        token_count = len(tokens)
        distinct_token_ratio = len(set(tokens)) / float(token_count)
        token_profiles = [cls._token_profile(token) for token in tokens]
        weird_token_count = sum(
            1
            for profile in token_profiles
            if (
                int(profile["longest_run"]) >= 3
                or float(profile["unique_ratio"]) <= 0.55
                or int(profile["length"]) >= 8 and float(profile["unique_ratio"]) <= 0.65
                or int(profile["vowel_groups"]) <= 1 and int(profile["length"]) >= 6
            )
        )
        has_common_context_token = any(token in cls.common_context_tokens for token in tokens)
        randomness_score = 0
        if not has_common_context_token:
            randomness_score += 1
        if average_log_probability <= -0.18:
            randomness_score += 1
        if language_probability > 0.0 and language_probability <= 0.65:
            randomness_score += 1
        if no_speech_probability >= 0.10:
            randomness_score += 1
        if distinct_token_ratio >= 0.80 and token_count >= 2:
            randomness_score += 1
        if weird_token_count >= 1:
            randomness_score += 1
        if token_count >= 3 and not has_common_context_token:
            randomness_score += 1
        if token_count >= 4 and average_log_probability <= -0.14 and language_probability <= 0.75:
            randomness_score += 1
        return randomness_score >= 4

    @staticmethod
    def _count_repeated_windows(tokens: list[str], window_size: int) -> int:
        if window_size <= 0 or len(tokens) < window_size * 2:
            return 0
        seen: dict[tuple[str, ...], int] = {}
        repeated = 0
        for start in range(0, len(tokens) - window_size + 1):
            window = tuple(tokens[start : start + window_size])
            count = seen.get(window, 0) + 1
            seen[window] = count
            if count == 2:
                repeated += 1
        return repeated

    @classmethod
    def _max_repeated_window_streak(cls, tokens: list[str], window_size: int) -> int:
        if window_size <= 0 or len(tokens) < window_size:
            return 0
        counts: dict[tuple[str, ...], int] = {}
        max_streak = 0
        for start in range(0, len(tokens) - window_size + 1):
            window = tuple(tokens[start : start + window_size])
            counts[window] = counts.get(window, 0) + 1
            if counts[window] > max_streak:
                max_streak = counts[window]
        return max_streak

    @classmethod
    def _looks_like_looping_or_uncertain_hallucination(cls, report: ASRQualityReport) -> bool:
        tokens = cls._tokenize(report.transcript_text)
        if len(tokens) < 3:
            return False
        normalized = cls._normalize_text(report.transcript_text)
        if not normalized:
            return False
        average_log_probability = float(report.average_log_probability or 0.0)
        language_probability = float(report.language_probability or 0.0)
        no_speech_probability = float(report.no_speech_probability or 0.0)
        voiced_frame_ratio = float(report.voiced_frame_ratio or 0.0)
        token_count = len(tokens)
        distinct_token_ratio = len(set(tokens)) / float(token_count)
        anchor_hit = cls._contains_focus_anchor_word(tokens)
        repeated_bigram_count = cls._count_repeated_windows(tokens, 2)
        repeated_trigram_count = cls._count_repeated_windows(tokens, 3)
        repeated_quadgram_streak = cls._max_repeated_window_streak(tokens, 4)
        repeated_clause = (
            token_count >= 6
            and (repeated_bigram_count >= 1 or repeated_trigram_count >= 1)
            and distinct_token_ratio <= 0.70
        )
        uncertain_phrase = (
            "not sure what i'm saying" in normalized
            or "not sure what im saying" in normalized
            or "i'm going to say" in normalized
            or "im going to say" in normalized
            or "i am going to say" in normalized
            or "i don't know what i'm saying" in normalized
            or "i do not know what i'm saying" in normalized
            or "i'm not sure" in normalized and "what i'm saying" in normalized
        )
        if token_count >= 10 and repeated_quadgram_streak >= 3 and distinct_token_ratio <= 0.80:
            return True
        if token_count >= 8 and repeated_trigram_count >= 2 and distinct_token_ratio <= 0.55:
            return True
        if token_count >= 8 and repeated_bigram_count >= 3 and distinct_token_ratio <= 0.85:
            return True
        if token_count >= 12 and repeated_trigram_count >= 2 and distinct_token_ratio <= 0.90:
            return True
        if token_count >= 8 and repeated_bigram_count >= 2 and distinct_token_ratio <= 0.85:
            return True
        if repeated_clause and (
            average_log_probability <= -0.03
            or no_speech_probability >= 0.05
            or voiced_frame_ratio <= 0.20
            or (language_probability > 0.0 and language_probability <= 0.90)
        ):
            return True
        if uncertain_phrase and (
            average_log_probability <= -0.08
            or no_speech_probability >= 0.08
            or voiced_frame_ratio <= 0.12
            or language_probability > 0.0 and language_probability <= 0.70
        ):
            return True
        if anchor_hit and repeated_clause and distinct_token_ratio <= 0.70:
            return True
        if anchor_hit and token_count >= 8 and repeated_bigram_count >= 2 and distinct_token_ratio <= 0.85:
            return True
        if token_count >= 8 and distinct_token_ratio <= 0.35 and average_log_probability <= -0.10:
            return True
        return False

    @classmethod
    def _looks_like_repetitive_sound_artifact(cls, report: ASRQualityReport) -> bool:
        tokens = cls._tokenize(report.transcript_text)
        if len(tokens) < 2:
            return False
        normalized = cls._normalize_text(report.transcript_text)
        if not normalized:
            return False
        if cls._contains_focus_anchor_word(tokens):
            return False
        if cls._looks_like_proper_noun_phrase(report, tokens):
            return False

        average_log_probability = float(report.average_log_probability or 0.0)
        no_speech_probability = float(report.no_speech_probability or 0.0)
        voiced_frame_ratio = float(report.voiced_frame_ratio or 0.0)
        distinct_token_ratio = len(set(tokens)) / float(len(tokens))
        max_token_length = max(len(token) for token in tokens)
        dominant_token_count = max(tokens.count(token) for token in set(tokens))
        if dominant_token_count >= 3 and distinct_token_ratio <= 0.50 and max_token_length <= 5:
            return True
        if len(tokens) <= 4 and distinct_token_ratio <= 0.60 and max_token_length <= 4:
            return True

        compact = "".join(char for char in normalized if char.isalnum())
        if len(compact) >= 4 and len(compact) <= 24:
            for unit_size in range(1, 5):
                if len(compact) < unit_size * 3:
                    continue
                unit = compact[:unit_size]
                if unit and unit * (len(compact) // unit_size) == compact and len(compact) % unit_size == 0:
                    return True

        language_probability = float(report.language_probability or 0.0)
        low_confidence = (
            average_log_probability <= -0.06
            or no_speech_probability >= 0.04
            or voiced_frame_ratio <= 0.22
            or (language_probability > 0.0 and language_probability <= 0.90)
        )
        if not low_confidence:
            return False

        if dominant_token_count >= 2 and distinct_token_ratio <= 0.70 and max_token_length <= 7:
            return True
        if len(tokens) <= 4 and distinct_token_ratio <= 0.75 and max_token_length <= 6:
            return True
        return False

    @staticmethod
    def _noise_signal_is_weak(*, average_log_probability: float, no_speech_probability: float, voiced_frame_ratio: float, audio_rms: float, compression_ratio: float, log_prob_limit: float, no_speech_limit: float, voiced_limit: float, rms_limit: float, compression_limit: float) -> bool:
        return (
            average_log_probability <= log_prob_limit
            or no_speech_probability >= no_speech_limit
            or voiced_frame_ratio <= voiced_limit
            or audio_rms <= rms_limit
            or compression_ratio <= compression_limit
        )

    def _reject_noise_assessment(self, report: ASRQualityReport, noise_assessment: object, *, tokens: list[str]) -> ASRQualityDecision | None:
        category = getattr(noise_assessment, "category", "")
        reason = getattr(noise_assessment, "reason", "")
        if category == "impulse":
            weak_audio_signal = self._noise_signal_is_weak(
                average_log_probability=float(report.average_log_probability or 0.0),
                no_speech_probability=float(report.no_speech_probability or 0.0),
                voiced_frame_ratio=float(report.voiced_frame_ratio or 0.0),
                audio_rms=float(report.audio_rms or 0.0),
                compression_ratio=float(report.compression_ratio or 0.0),
                log_prob_limit=-0.10,
                no_speech_limit=0.08,
                voiced_limit=0.12,
                rms_limit=0.02,
                compression_limit=1.08,
            )
            if weak_audio_signal and len(tokens) >= 4 and not self._looks_like_proper_noun_phrase(report, tokens):
                return ASRQualityDecision(False, True, f"{reason}: {report.transcript_text}")
        elif category == "stationary":
            weak_stationary_signal = self._noise_signal_is_weak(
                average_log_probability=float(report.average_log_probability or 0.0),
                no_speech_probability=float(report.no_speech_probability or 0.0),
                voiced_frame_ratio=float(report.voiced_frame_ratio or 0.0),
                audio_rms=float(report.audio_rms or 0.0),
                compression_ratio=float(report.compression_ratio or 0.0),
                log_prob_limit=-0.12,
                no_speech_limit=0.07,
                voiced_limit=0.08,
                rms_limit=-1.0,
                compression_limit=1.12,
            )
            if weak_stationary_signal and len(tokens) >= 2 and not self._looks_like_proper_noun_phrase(report, tokens):
                return ASRQualityDecision(False, True, f"{reason}: {report.transcript_text}")
        elif category == "breath_handling":
            weak_breath_signal = self._noise_signal_is_weak(
                average_log_probability=float(report.average_log_probability or 0.0),
                no_speech_probability=float(report.no_speech_probability or 0.0),
                voiced_frame_ratio=float(report.voiced_frame_ratio or 0.0),
                audio_rms=float(report.audio_rms or 0.0),
                compression_ratio=float(report.compression_ratio or 0.0),
                log_prob_limit=-0.12,
                no_speech_limit=0.06,
                voiced_limit=0.09,
                rms_limit=-1.0,
                compression_limit=1.10,
            )
            if weak_breath_signal and len(tokens) >= 2 and not self._looks_like_proper_noun_phrase(report, tokens):
                return ASRQualityDecision(False, True, f"{reason}: {report.transcript_text}")
        elif category == "background_media":
            if not (
                self._looks_like_looping_or_uncertain_hallucination(report)
                or self._looks_like_repetitive_sound_artifact(report)
                or self._looks_like_random_contextless_text(report)
            ):
                weak_background_signal = self._noise_signal_is_weak(
                    average_log_probability=float(report.average_log_probability or 0.0),
                    no_speech_probability=float(report.no_speech_probability or 0.0),
                    voiced_frame_ratio=float(report.voiced_frame_ratio or 0.0),
                    audio_rms=float(report.audio_rms or 0.0),
                    compression_ratio=float(report.compression_ratio or 0.0),
                    log_prob_limit=-0.10,
                    no_speech_limit=0.06,
                    voiced_limit=0.10,
                    rms_limit=-1.0,
                    compression_limit=1.14,
                )
                if weak_background_signal and len(tokens) >= 3 and not self._looks_like_proper_noun_phrase(report, tokens):
                    return ASRQualityDecision(False, True, f"{reason}: {report.transcript_text}")
        return None

    def evaluate(self, report: ASRQualityReport) -> ASRQualityDecision:
        if not report.language_ok:
            return ASRQualityDecision(False, True, "Wrong language detection")
        if not report.timestamp_ok:
            return ASRQualityDecision(False, True, "Impossible timestamps")
        if report.empty_output:
            return ASRQualityDecision(False, True, "Empty output")
        if report.no_speech_probability >= 0.8:
            return ASRQualityDecision(False, True, "High no-speech probability")
        if report.average_log_probability <= -2.0:
            return ASRQualityDecision(False, True, "Low average log probability")
        if report.compression_ratio >= 2.4:
            return ASRQualityDecision(False, True, "High compression ratio")
        if report.repetitive_text:
            return ASRQualityDecision(False, True, "Repeated hallucinated phrase")
        normalized = report.transcript_text.strip().lower().strip(".!?")
        if normalized in self.strict_hallucinations:
            return ASRQualityDecision(False, True, f"Hallucination/no-speech candidate: {report.transcript_text}")
        phrase_is_known_hallucination = normalized in {phrase.strip(".!?") for phrase in self.known_silence_hallucinations}
        low_audio_evidence = (
            report.audio_rms < 0.012
            or report.audio_peak < 0.025
            or report.speech_to_noise_gap < 0.006
            or report.voiced_frame_ratio < 0.08
            or report.sustained_speech_ms < 160
        )
        weak_confidence_for_known_phrase = report.average_log_probability < -0.35 or report.audio_duration_ms < 2500
        if phrase_is_known_hallucination and (low_audio_evidence or weak_confidence_for_known_phrase):
            return ASRQualityDecision(False, True, f"Hallucination/no-speech candidate: {report.transcript_text}")
        tokens = self._tokenize(report.transcript_text)
        badword_match = self._find_badword_match(tokens)
        if badword_match:
            return ASRQualityDecision(False, True, f"Profanity candidate: {badword_match}")
        content_tokens = [token for token in tokens if token not in self.common_context_tokens]
        noise_assessment = AudioNoiseFilter.classify(report)
        if noise_assessment.matched:
            noise_decision = self._reject_noise_assessment(report, noise_assessment, tokens=tokens)
            if noise_decision is not None:
                return noise_decision
        if low_audio_evidence and len(tokens) >= 4 and not self._looks_like_proper_noun_phrase(report, tokens):
            if len(content_tokens) <= 3:
                return ASRQualityDecision(False, True, f"Low-speech hallucination candidate: {report.transcript_text}")
        if low_audio_evidence and len(tokens) >= 6 and self._looks_like_looping_or_uncertain_hallucination(report):
            return ASRQualityDecision(False, True, f"Looping/uncertain transcript candidate: {report.transcript_text}")
        if low_audio_evidence and len(tokens) >= 6 and self._looks_like_repetitive_sound_artifact(report):
            return ASRQualityDecision(False, True, f"Repetitive sound artifact candidate: {report.transcript_text}")
        if low_audio_evidence and len(tokens) >= 6 and self._looks_like_random_contextless_text(report):
            return ASRQualityDecision(False, True, f"Contextless transcript candidate: {report.transcript_text}")
        if self._looks_like_looping_or_uncertain_hallucination(report):
            return ASRQualityDecision(False, True, f"Looping/uncertain transcript candidate: {report.transcript_text}")
        if self._looks_like_repetitive_sound_artifact(report):
            return ASRQualityDecision(False, True, f"Repetitive sound artifact candidate: {report.transcript_text}")
        if self._looks_like_gibberish(report):
            return ASRQualityDecision(False, True, f"Nonsense transcript candidate: {report.transcript_text}")
        if self._looks_like_random_contextless_text(report):
            return ASRQualityDecision(False, True, f"Contextless transcript candidate: {report.transcript_text}")
        if low_audio_evidence and report.no_speech_probability >= 0.35:
            return ASRQualityDecision(False, True, "Low audio evidence with no-speech probability")
        return ASRQualityDecision(True, False, "Accepted")

    def should_accept(self, report: ASRQualityReport) -> bool:
        return self.evaluate(report).accepted
