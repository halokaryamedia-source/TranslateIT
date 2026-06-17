use std::path::PathBuf;
use std::process::{Command, Stdio};

pub fn play_wav_output(output_path: &str) -> bool {
    let path = PathBuf::from(output_path);
    if output_path.trim().is_empty() || !path.is_file() {
        return false;
    }

    let command = "Add-Type -AssemblyName System; $player = New-Object System.Media.SoundPlayer($env:TRANSLATEIT_PLAY_WAV); $player.Load(); $player.PlaySync(); $player.Dispose();";
    Command::new("powershell")
        .arg("-NoProfile")
        .arg("-NonInteractive")
        .arg("-Command")
        .arg(command)
        .env("TRANSLATEIT_PLAY_WAV", path)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}
