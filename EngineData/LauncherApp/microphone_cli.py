from __future__ import annotations

from EngineData.LauncherApp.app_logger import write_text_report
from EngineData.TranscriptEngine.audio_capture import AudioCapture
from EngineData.TranscriptEngine.microphone_diagnostic import run_microphone_diagnostic


def run_microphone_cli() -> int:
    capture = AudioCapture()
    devices = capture.list_microphone_devices()
    lines: list[str] = ["TranslateIT microphone diagnostic", "================================"]
    if not devices:
        lines.extend(
            [
                "FAIL: No microphone devices detected.",
                "Check Windows microphone permission.",
                "Plug in or enable a microphone.",
                "Open TranslateIT and refresh devices after fixing the input.",
            ]
        )
        write_text_report("microphone_diagnostic_latest.txt", lines)
        print("\n".join(lines))
        return 1
    lines.append("Detected input devices:")
    for device in devices:
        default_label = " (Default)" if device.is_default else ""
        lines.append(
            f"- {device.device_id}: {device.name}{default_label} | "
            f"{device.max_input_channels} channel(s) | {device.sample_rate} Hz"
        )
    selected = next((device for device in devices if device.is_default), devices[0])
    lines.append("")
    lines.append(f"Using device {selected.device_id}: {selected.name}")
    lines.append("Speak normally now. Recording a short diagnostic sample...")
    result = run_microphone_diagnostic(device_id=selected.device_id, seconds=4.0, capture=capture)
    lines.extend(
        [
            "",
            f"{result.status}: {result.message}",
            f"RMS: {result.rms:.6f}",
            f"Peak: {result.peak:.4f}",
            f"Noise floor: {result.noise_floor_rms:.6f}",
            f"Speech-to-noise gap: {result.speech_to_noise_gap:.6f}",
            f"Clipping: {result.clipping}",
            f"Usable input: {result.usable_input}",
            f"JSON report: {result.report_path}",
        ]
    )
    if not result.usable_input:
        lines.extend(
            [
                "",
                "Action guidance:",
                "- Increase microphone gain.",
                "- Choose the correct microphone in the app.",
                "- Check Windows microphone permission.",
                "- Move closer to the microphone and speak normally.",
            ]
        )
    text_path = write_text_report("microphone_diagnostic_latest.txt", lines)
    lines.append(f"Text report: {text_path}")
    print("\n".join(lines))
    return 0 if result.usable_input else 1


if __name__ == "__main__":
    raise SystemExit(run_microphone_cli())
