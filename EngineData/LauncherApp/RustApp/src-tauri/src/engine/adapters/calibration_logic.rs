use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationLogicRequest {
    pub silent_samples: Vec<f32>,
    pub speech_samples: Vec<f32>,
    pub sensitivity: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CalibrationLogicResult {
    pub noise_floor_rms: f32,
    pub speech_rms: f32,
    pub peak_level: f32,
    pub clipping_risk: f32,
    pub speech_to_noise_gap: f32,
    pub speech_to_noise_ratio: f32,
    pub voiced_frame_ratio: f32,
    pub final_vad_threshold: f32,
    pub recommended_preset: String,
    pub input_state: String,
    pub capture_allowed: bool,
}

pub fn run_calibration_logic(request: CalibrationLogicRequest) -> CalibrationLogicResult {
    let sensitivity = normalize_input_sensitivity(&request.sensitivity);
    let noise_floor_rms = rms(&request.silent_samples);
    let speech_rms = rms(&request.speech_samples);
    let peak_level = peak(&request.speech_samples);
    let clipping_risk = if peak_level >= 0.99 { 1.0 } else { peak_level };
    let speech_to_noise_gap = speech_rms - noise_floor_rms;
    let speech_to_noise_ratio = speech_rms / noise_floor_rms.max(0.0005);
    let voiced_frame_ratio = if speech_rms > noise_floor_rms * 1.15 { 1.0 } else { 0.0 };
    let input_state = classify_input_state(noise_floor_rms, speech_rms, peak_level);
    let final_vad_threshold = match sensitivity.as_str() {
        "Low" => 0.0022_f32.max(noise_floor_rms * 1.05),
        "High" => 0.0011_f32.max(noise_floor_rms * 0.92),
        _ => 0.0016_f32.max(noise_floor_rms * 0.98),
    };
    let capture_allowed = !matches!(input_state.as_str(), "Too Quiet" | "No Signal" | "Too Loud / Clipping");
    CalibrationLogicResult {
        noise_floor_rms,
        speech_rms,
        peak_level,
        clipping_risk,
        speech_to_noise_gap,
        speech_to_noise_ratio,
        voiced_frame_ratio,
        final_vad_threshold,
        recommended_preset: "Headset".to_string(),
        input_state,
        capture_allowed,
    }
}

fn normalize_input_sensitivity(value: &str) -> String {
    if value.trim() == "Headset" {
        "High".to_string()
    } else if value.trim().is_empty() {
        "Normal".to_string()
    } else {
        value.trim().to_string()
    }
}

fn classify_input_state(noise_floor_rms: f32, speech_rms: f32, peak_level: f32) -> String {
    let speech_gap = speech_rms - noise_floor_rms;
    let speech_to_noise_ratio = speech_rms / noise_floor_rms.max(0.0005);
    if peak_level >= 0.99 {
        "Too Loud / Clipping".to_string()
    } else if peak_level < 0.0025 && speech_rms < 0.0015 {
        "No Signal".to_string()
    } else if speech_rms <= 0.0018_f32.max(noise_floor_rms * 0.55) && peak_level < 0.008 && speech_gap < 0.0010 {
        "Too Quiet".to_string()
    } else if speech_to_noise_ratio >= 1.05 || speech_gap >= 0.0009 || peak_level >= 0.005 {
        if speech_rms <= 0.0048_f32.max(noise_floor_rms * 1.02) {
            "Input low but usable".to_string()
        } else {
            "Good".to_string()
        }
    } else if speech_rms <= 0.0055_f32.max(noise_floor_rms * 1.02) {
        "Background Noise High".to_string()
    } else {
        "Good".to_string()
    }
}

fn rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    (samples.iter().map(|value| value * value).sum::<f32>() / samples.len() as f32).sqrt()
}

fn peak(samples: &[f32]) -> f32 {
    samples.iter().map(|value| value.abs()).fold(0.0_f32, f32::max)
}
