from __future__ import annotations

from dataclasses import dataclass
from typing import Any

try:  # pragma: no cover - optional dependency
    import sounddevice as sd
except ImportError:  # pragma: no cover - dependency missing in current env
    sd = None

try:
    import numpy as np
except ImportError:  # pragma: no cover - bundled runtime should have numpy
    np = None


LEVEL_TOO_QUIET = "Too Quiet"
LEVEL_GOOD = "Good"
LEVEL_TOO_LOUD = "Too Loud / Clipping"
LEVEL_BACKGROUND_NOISE = "Background Noise High"
LEVEL_SPEECH_DETECTED = "Speech Detected"
LEVEL_WRONG_DEVICE = "Wrong Device / No Speech Detected"


@dataclass(slots=True)
class MicrophoneDevice:
    device_id: int
    name: str
    sample_rate: int = 0
    is_default: bool = False
    is_virtual: bool = False
    is_loopback: bool = False
    max_input_channels: int = 0


@dataclass(slots=True)
class OutputAudioDevice:
    device_id: int
    name: str
    sample_rate: int = 0
    is_default: bool = False
    is_virtual: bool = False
    max_output_channels: int = 0


@dataclass(slots=True)
class CaptureBackendStatus:
    backend_name: str = "sounddevice / PortAudio"
    available: bool = False
    dependency: str = "missing"
    message: str = "sounddevice is not installed"


@dataclass(slots=True)
class AudioMonitorSnapshot:
    rms: float
    peak: float
    meter_percent: int
    input_state: str
    warnings: list[str]


@dataclass(slots=True)
class AudioCaptureResult:
    samples: Any
    sample_rate: int
    device_id: int | None
    duration_ms: int
    status: str
    message: str


@dataclass(slots=True)
class DeviceValidationResult:
    valid: bool
    device_id: int | None
    message: str
    warnings: list[str]


class AudioCapture:
    """Microphone discovery and level-analysis scaffold for TranslateIT."""

    frame_duration_ms: int = 16

    def backend_status(self) -> CaptureBackendStatus:
        if sd is None:
            return CaptureBackendStatus()
        return CaptureBackendStatus(
            available=True,
            dependency="available",
            message="sounddevice backend is available",
        )

    def list_microphone_devices(self) -> list[MicrophoneDevice]:
        if sd is None:
            return []
        devices: list[MicrophoneDevice] = []
        default_input = None
        try:
            default_input = sd.default.device[0]
        except Exception:  # pragma: no cover - optional backend behavior
            default_input = None
        try:
            for index, raw in enumerate(sd.query_devices()):  # type: ignore[attr-defined]
                if raw.get("max_input_channels", 0) <= 0:
                    continue
                name = str(raw.get("name", f"Input {index}"))
                device = MicrophoneDevice(
                    device_id=index,
                    name=name,
                    sample_rate=int(raw.get("default_samplerate", 0) or 0),
                    is_default=index == default_input,
                    is_virtual="virtual" in name.lower(),
                    is_loopback="loopback" in name.lower() or "stereo mix" in name.lower(),
                    max_input_channels=int(raw.get("max_input_channels", 0) or 0),
                )
                devices.append(device)
        except Exception:
            return []
        return devices

    def list_output_devices(self) -> list[OutputAudioDevice]:
        if sd is None:
            return []
        devices: list[OutputAudioDevice] = []
        default_output = None
        try:
            default_output = sd.default.device[1]
        except Exception:  # pragma: no cover - optional backend behavior
            default_output = None
        try:
            for index, raw in enumerate(sd.query_devices()):  # type: ignore[attr-defined]
                if raw.get("max_output_channels", 0) <= 0:
                    continue
                name = str(raw.get("name", f"Output {index}"))
                devices.append(
                    OutputAudioDevice(
                        device_id=index,
                        name=name,
                        sample_rate=int(raw.get("default_samplerate", 0) or 0),
                        is_default=index == default_output,
                        is_virtual="virtual" in name.lower(),
                        max_output_channels=int(raw.get("max_output_channels", 0) or 0),
                    )
                )
        except Exception:
            return []
        return devices

    def find_microphone_device(self, device_id: int) -> MicrophoneDevice | None:
        for device in self.list_microphone_devices():
            if device.device_id == device_id:
                return device
        return None

    def validate_device_selection(self, device_id: int | None) -> DeviceValidationResult:
        status = self.backend_status()
        if not status.available:
            return DeviceValidationResult(False, device_id, status.message, [status.message])
        if device_id is None:
            return DeviceValidationResult(False, None, "No microphone device selected", [])
        device = self.find_microphone_device(device_id)
        if device is None:
            return DeviceValidationResult(False, device_id, "Selected microphone device was not found", [])
        warnings = self.warn_if_problematic_device(device)
        return DeviceValidationResult(
            valid=True,
            device_id=device.device_id,
            message="Microphone device is usable" if not warnings else "Microphone device needs review",
            warnings=warnings,
        )

    def supports_wasapi_shared(self) -> bool:
        if sd is None:
            return False
        try:
            return any("wasapi" in str(api.get("name", "")).lower() for api in sd.query_hostapis())  # type: ignore[attr-defined]
        except Exception:  # pragma: no cover - optional backend behavior
            return False

    def build_level_state(self, rms: float, peak: float, noise_floor_rms: float = 0.0) -> str:
        if peak >= 0.99:
            return LEVEL_TOO_LOUD
        if rms <= max(0.002, noise_floor_rms * 0.35):
            return LEVEL_TOO_QUIET
        if rms <= max(0.012, noise_floor_rms * 0.95):
            return LEVEL_BACKGROUND_NOISE
        return LEVEL_GOOD

    def classify_frame(self, samples: Any, noise_floor_rms: float = 0.0) -> str:
        if np is None:
            return LEVEL_WRONG_DEVICE
        array = np.asarray(samples, dtype=np.float32)
        if array.size == 0:
            return LEVEL_WRONG_DEVICE
        rms = float(np.sqrt(np.mean(np.square(array), dtype=np.float32)))
        peak = float(np.max(np.abs(array)))
        return self.build_level_state(rms, peak, noise_floor_rms=noise_floor_rms)

    def build_monitor_snapshot(self, samples: Any, noise_floor_rms: float = 0.0) -> AudioMonitorSnapshot:
        if np is None:
            return AudioMonitorSnapshot(0.0, 0.0, 0, LEVEL_WRONG_DEVICE, [self.backend_status().message])
        array = np.asarray(samples, dtype=np.float32)
        if array.size == 0:
            return AudioMonitorSnapshot(0.0, 0.0, 0, LEVEL_WRONG_DEVICE, ["No audio frames received"])
        rms = float(np.sqrt(np.mean(np.square(array), dtype=np.float32)))
        peak = float(np.max(np.abs(array)))
        state = self.build_level_state(rms, peak, noise_floor_rms=noise_floor_rms)
        meter_percent = int(max(0.0, min(1.0, peak)) * 100)
        warnings = []
        if state == LEVEL_TOO_LOUD:
            warnings.append("Clipping risk")
        elif state == LEVEL_BACKGROUND_NOISE:
            warnings.append("Background noise high")
        elif state == LEVEL_TOO_QUIET:
            warnings.append("Input level too quiet")
        return AudioMonitorSnapshot(rms=rms, peak=peak, meter_percent=meter_percent, input_state=state, warnings=warnings)

    def warn_if_problematic_device(self, device: MicrophoneDevice) -> list[str]:
        warnings: list[str] = []
        name = device.name.lower()
        if device.is_virtual:
            warnings.append("Virtual audio device detected")
        if device.is_loopback:
            warnings.append("Output loopback device detected")
        if "stereo mix" in name:
            warnings.append("Stereo mix input detected")
        if "webcam" in name:
            warnings.append("Webcam microphone detected")
        if device.max_input_channels <= 0:
            warnings.append("No usable input channels detected")
        return warnings

    def capture_level_snapshot(
        self,
        *,
        device_id: int | None = None,
        sample_rate: int = 16_000,
        duration_ms: int | None = None,
        noise_floor_rms: float = 0.0,
    ) -> AudioMonitorSnapshot:
        """Capture a short non-persistent level sample when sounddevice is available."""
        status = self.backend_status()
        if not status.available or sd is None:
            return AudioMonitorSnapshot(0.0, 0.0, 0, LEVEL_WRONG_DEVICE, [status.message])
        if np is None:
            return AudioMonitorSnapshot(0.0, 0.0, 0, LEVEL_WRONG_DEVICE, ["numpy is not available"])
        frame_ms = duration_ms or self.frame_duration_ms
        frame_count = max(1, int(sample_rate * frame_ms / 1000))
        try:  # pragma: no cover - requires local audio backend
            samples = sd.rec(
                frame_count,
                samplerate=sample_rate,
                channels=1,
                dtype="float32",
                device=device_id,
            )
            sd.wait()
        except Exception as exc:
            return AudioMonitorSnapshot(0.0, 0.0, 0, LEVEL_WRONG_DEVICE, [f"Audio capture failed: {exc}"])
        return self.build_monitor_snapshot(samples, noise_floor_rms=noise_floor_rms)

    def capture_seconds(
        self,
        *,
        seconds: float,
        device_id: int | None = None,
        sample_rate: int = 16_000,
        channels: int = 1,
    ) -> AudioCaptureResult:
        """Capture microphone audio without persisting it to disk."""
        status = self.backend_status()
        duration_ms = int(max(0.0, seconds) * 1000)
        if not status.available or sd is None:
            return AudioCaptureResult(
                samples=[],
                sample_rate=sample_rate,
                device_id=device_id,
                duration_ms=duration_ms,
                status="DependencyMissing",
                message=status.message,
            )
        frame_count = max(1, int(sample_rate * max(0.0, seconds)))
        try:  # pragma: no cover - requires local audio backend
            samples = sd.rec(
                frame_count,
                samplerate=sample_rate,
                channels=channels,
                dtype="float32",
                device=device_id,
            )
            sd.wait()
        except Exception as exc:
            return AudioCaptureResult(
                samples=[],
                sample_rate=sample_rate,
                device_id=device_id,
                duration_ms=duration_ms,
                status="CaptureFailed",
                message=f"Audio capture failed: {exc}",
            )
        return AudioCaptureResult(
            samples=samples,
            sample_rate=sample_rate,
            device_id=device_id,
            duration_ms=duration_ms,
            status="Captured",
            message="Audio captured in memory only.",
        )
