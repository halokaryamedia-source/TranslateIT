use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use crate::engine::audio::guided_take::{
    active_guided_take_line_id, arm_guided_take, cancel_guided_take, take_guided_audio,
    GuidedTakeReview, GUIDED_TAKE_CHANNELS, GUIDED_TAKE_SAMPLE_RATE_HZ,
};
use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::audio::live_segment_writer::write_pcm16_wav;
use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_state::{
    begin_direct_live_capture_session, clear_runtime_session_if_generation,
    clear_runtime_session_state, latest_runtime_session_state,
    mark_runtime_session_cleanup_incomplete, revoke_runtime_session_authority,
};

use super::voice_lab::{current_voice_lab_build_snapshot, VoiceLabStoragePaths};

const CAPTURE_OWNER_ID: &str = "translateit_rust_live_capture";
const MAX_REPLAY_WAV_BYTES: u64 = 8 * 1024 * 1024;

const GUIDED_LINES: &[(u32, &str)] = &[
    (1, "Good morning, everyone. Thank you for joining the meeting today."),
    (2, "I would like to review the project timeline before we make a final decision."),
    (3, "Could you explain which part of the current plan needs the most attention?"),
    (4, "The first milestone is scheduled for Monday, September fourteenth."),
    (5, "Our latest build is version two point six, and the remaining issue is under review."),
    (6, "Please send the updated document after the meeting so I can check the details."),
    (7, "We can keep the existing approach if it remains stable and easy to maintain."),
    (8, "I agree with the main direction, but I want the final result to feel natural."),
    (9, "The development team will test the change before it is included in the release."),
    (10, "Can we compare the current result with the previous version one more time?"),
    (11, "The customer reported a problem with audio quality during a long online meeting."),
    (12, "We should prioritize reliability, clear communication, and consistent performance."),
    (13, "There are twenty four tasks in total, and seven of them still need confirmation."),
    (14, "My email address, phone number, and account information should remain private."),
    (15, "The system should recover safely instead of silently switching to another option."),
    (16, "If everything looks correct, we can continue with the next step tomorrow morning."),
    (17, "Yes, that sounds good to me. Let's keep moving while the details are still fresh."),
    (18, "No, I don't think we should rush this change before everyone understands the risk."),
    (19, "That's a fair question. Give me a moment to check the numbers before I answer."),
    (20, "Would you mind repeating the last point a little more slowly, please?"),
    (21, "The quick brown fox jumps over the lazy dog while the bright morning sun rises."),
    (22, "She chose a fresh blue shirt, a warm gray jacket, and comfortable walking shoes."),
    (23, "Three thoughtful reviewers checked the draft and shared their feedback with the group."),
    (24, "We shipped twelve devices on Thursday, and the remaining eight will arrive next week."),
    (25, "The meeting starts at nine thirty in the morning and should finish before eleven."),
    (26, "Please check the A P I response, the server status, and the latest software version."),
    (27, "The wireless connection was weak for a moment, but the audio remained clear enough to continue."),
    (28, "I really appreciate your help. The result feels much better than it did yesterday."),
    (29, "Are we confident this solution will still work when the conversation becomes faster?"),
    (30, "Sometimes I speak softly, and sometimes my voice becomes stronger when a point is important."),
    (31, "Before we finish, let's summarize what changed, what still needs work, and who owns each action."),
    (32, "Thanks again for your time today. I'll review everything carefully and follow up after lunch."),
    (33, "I wasn't expecting that result, but I'm glad we found the problem before the deadline."),
    (34, "Could we pause for a second and make sure everyone is looking at the same document?"),
    (35, "Absolutely, I can handle that task and send you a short update when it's finished."),
    (36, "I'm not completely convinced yet, so I'd like to hear one more example before we decide."),
    (37, "What happens if the network slows down while several people are speaking at the same time?"),
    (38, "Please don't worry about the small delay; we still have enough time to finish this properly."),
    (39, "The final price is three hundred forty eight dollars and fifty cents before tax."),
    (40, "Our call begins at seven forty five this evening and may continue for about ninety minutes."),
    (41, "I sent the revised proposal to Sarah, Michael, James, and Olivia earlier this afternoon."),
    (42, "The design uses glass, brushed steel, soft fabric, and warm wooden panels around the room."),
    (43, "Please verify the user name, project code, file path, and backup location before you continue."),
    (44, "After the update, the application opened quickly, connected normally, and responded without freezing."),
    (45, "Although the first attempt failed, the second one worked because we changed the input settings."),
    (46, "When the room is quiet, my voice is relaxed, clear, and slightly softer than usual."),
    (47, "I can hear a faint buzzing sound near the window, but it isn't loud enough to interrupt us."),
    (48, "The weather changed quickly from bright sunshine to heavy rain and a cool afternoon breeze."),
    (49, "My younger brother bought fresh vegetables, orange juice, chocolate, and a loaf of bread."),
    (50, "We walked through the crowded station, crossed the bridge, and waited beside the old clock tower."),
    (51, "A small change in timing can make the difference between a smooth response and an awkward pause."),
    (52, "Please move the green folder beside the blue box and leave the yellow envelope on the desk."),
    (53, "Which option gives us the clearest result without adding unnecessary work for the team?"),
    (54, "Why did the previous version behave differently even though the configuration looked almost identical?"),
    (55, "How quickly can we verify the fix without skipping the checks that actually matter?"),
    (56, "That's exactly what I meant; the idea is simple, practical, and easy to explain to someone new."),
    (57, "I may be wrong, but the quieter approach feels more natural than pushing every word too strongly."),
    (58, "If the connection drops for a moment, wait for it to return instead of repeating the whole sentence."),
    (59, "We need a clear yes or no before Friday, otherwise the supplier cannot reserve the equipment."),
    (60, "The total is one thousand two hundred seventy six items across forty three separate boxes."),
    (61, "The file is called Project Delta Review, and the newest copy was saved on August twenty first."),
    (62, "At the end of the discussion, each person should know what changed and what they need to do next."),
    (63, "Even when I speak faster, I try to keep names, numbers, and important technical terms easy to understand."),
    (64, "All right, I think we've covered the main points. Let's finish here and continue after everyone has reviewed the notes."),
    (65, "Yes, I agree."),
    (66, "No, not yet."),
    (67, "That works for me."),
    (68, "Give me one minute."),
    (69, "I can hear you clearly."),
    (70, "Could you say that again?"),
    (71, "Perfect, let's continue."),
    (72, "I'm ready when you are."),
    (73, "The answer is probably yes."),
    (74, "We can discuss that later."),
    (75, "Please open the latest file."),
    (76, "I need a little more context."),
    (77, "This part looks much better now."),
    (78, "Nothing else needs to change."),
    (79, "Let's keep this simple and clear."),
    (80, "I haven't seen that issue before."),
    (81, "Wait, I think I found it."),
    (82, "Sorry, I missed the last sentence."),
    (83, "Can everyone see my screen now?"),
    (84, "That's fine; we can move on."),
    (85, "The microphone sounds slightly quieter today."),
    (86, "Please speak naturally and don't rush."),
    (87, "The first option is safer."),
    (88, "The second option is more flexible."),
    (89, "I prefer the simpler version."),
    (90, "We should test both possibilities."),
    (91, "The code returned an error."),
    (92, "The new build started successfully."),
    (93, "Please restart the application once."),
    (94, "The download reached ninety percent."),
    (95, "Our meeting room is on the third floor."),
    (96, "The package arrived two days early."),
    (97, "I bought coffee, tea, and cold water for the team."),
    (98, "The train leaves at six fifteen, so we should arrive at the station before six."),
    (99, "Please write down the serial number, the device name, and the exact time the problem happened."),
    (100, "I understand the concern, but I still think the current approach gives us the best balance between reliability and simplicity."),
    (101, "When several people speak at once, I usually wait for a short pause before answering so the conversation stays easy to follow."),
    (102, "If we change the behavior now, we also need to check whether the documentation, tests, and user interface still describe the same result."),
    (103, "The issue only appears after the application has been running for a long time, which is why a quick test may not reveal it."),
    (104, "I want the final experience to feel calm and predictable, even when something goes wrong behind the scenes and the system needs to recover."),
    (105, "Could you compare the two recordings carefully and tell me whether the second one sounds clearer, warmer, or simply louder than the first?"),
    (106, "Before we approve the release, please verify the installer, the local models, the audio route, and the final meeting output on a clean Windows machine."),
    (107, "The customer asked whether we could finish by Wednesday afternoon, but I explained that Friday morning would be a safer and more realistic target."),
    (108, "Although the interface looks simple, several internal steps happen in sequence before translated speech can safely reach the meeting microphone."),
    (109, "I don't mind waiting a few extra seconds if the translation is complete, accurate, and spoken naturally instead of being rushed or cut off."),
    (110, "The report contains four sections: current status, completed work, remaining risks, and the single next action that should happen after approval."),
    (111, "Please read the sentence once at a comfortable pace, and if a word feels difficult, stop, skip it, and choose another line instead."),
    (112, "A useful voice model should handle quick replies, normal explanations, and longer technical sentences without making every phrase sound identical."),
    (113, "Today is Tuesday, October sixth, and our next review is scheduled for Friday, October ninth, at ten thirty in the morning."),
    (114, "The invoice total is two thousand nine hundred eighty four dollars, including delivery, support, and the additional replacement parts."),
    (115, "Version three point four point one fixes the connection bug, while version three point five adds the new diagnostic screen."),
    (116, "Please send the file to Daniel at the design team, copy Maria from operations, and mention that the deadline has moved to next Thursday."),
    (117, "My laptop was nearly out of battery, so I lowered the screen brightness, closed a few applications, and connected the charger before the call started."),
    (118, "The small wooden table near the window holds a silver lamp, two notebooks, a green bottle, and a pair of black headphones."),
    (119, "During the storm, the wind became stronger, the lights flickered twice, and the internet connection briefly disappeared before returning to normal."),
    (120, "I was surprised by the result at first, then relieved when we discovered that the problem came from a simple configuration mistake rather than damaged hardware."),
    (121, "If you disagree with my recommendation, that's completely fine; explain which assumption you think is wrong, and we can review the evidence together."),
    (122, "The fastest solution isn't always the best one, especially when a shortcut creates hidden maintenance work that someone else will have to handle later."),
    (123, "When I explain a technical problem, I usually start with what the user noticed, then describe the cause, the fix, and any limitation that still remains."),
    (124, "Please confirm whether the translated voice remains understandable when I speak slowly, at a normal pace, and slightly faster during the same conversation."),
    (125, "We don't need to solve every possible future problem today; we only need a complete solution for the requirements that are actually part of this release."),
    (126, "After everyone has reviewed the proposal, we'll collect the final comments, resolve any important disagreement, update the document, and send the approved version to the client."),
    (127, "Sometimes a natural conversation includes hesitation, a quick correction, a short laugh, or a change in emphasis, but the important words should still remain clear."),
    (128, "Thank you for staying with me through the full review. We've covered short responses, everyday conversation, numbers, names, technical language, and longer explanations, so we can stop here whenever the recording feels complete."),
];

#[derive(Debug, Clone, Serialize)]
pub struct GuidedLineStatus {
    pub line_id: u32,
    pub text: String,
    pub accepted: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GuidedRecordingState {
    pub recording_line_id: Option<u32>,
    pub pending_review: Option<GuidedTakeReview>,
    pub lines: Vec<GuidedLineStatus>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GuidedRecordingActionResult {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub recording: GuidedRecordingState,
}

struct PendingDraft {
    line_id: u32,
    path: PathBuf,
    review: GuidedTakeReview,
}

static PENDING_DRAFT: OnceLock<Mutex<Option<PendingDraft>>> = OnceLock::new();

fn draft_store() -> &'static Mutex<Option<PendingDraft>> {
    PENDING_DRAFT.get_or_init(|| Mutex::new(None))
}

fn guided_text(line_id: u32) -> Option<&'static str> {
    GUIDED_LINES
        .iter()
        .find(|(id, _)| *id == line_id)
        .map(|(_, text)| *text)
}

fn take_file_name(line_id: u32) -> String {
    format!("take_{line_id:04}.wav")
}

fn storage_paths() -> VoiceLabStoragePaths {
    VoiceLabStoragePaths::from_project_paths(&ProjectPaths::discover())
}

fn draft_path(line_id: u32) -> PathBuf {
    storage_paths()
        .cache_root
        .join("Draft")
        .join(take_file_name(line_id))
}

fn accepted_path(line_id: u32) -> PathBuf {
    storage_paths().takes_dir.join(take_file_name(line_id))
}

fn current_state() -> GuidedRecordingState {
    let pending_review = draft_store()
        .lock()
        .ok()
        .and_then(|guard| guard.as_ref().map(|draft| draft.review.clone()));
    GuidedRecordingState {
        recording_line_id: active_guided_take_line_id(),
        pending_review,
        lines: GUIDED_LINES
            .iter()
            .map(|(line_id, text)| GuidedLineStatus {
                line_id: *line_id,
                text: (*text).to_string(),
                accepted: accepted_path(*line_id).is_file(),
            })
            .collect(),
    }
}

fn result(ok: bool, state: &str, message: impl Into<String>) -> GuidedRecordingActionResult {
    GuidedRecordingActionResult {
        ok,
        state: state.to_string(),
        message: message.into(),
        recording: current_state(),
    }
}

#[tauri::command]
pub fn get_voice_lab_guided_recording_state() -> GuidedRecordingState {
    current_state()
}

#[tauri::command]
pub fn start_voice_lab_guided_take(
    line_id: u32,
    authorized_voice_confirmed: bool,
) -> GuidedRecordingActionResult {
    if !authorized_voice_confirmed {
        return result(false, "authorization_required", "Confirm that you own or are authorized to use this voice before recording.");
    }
    if guided_text(line_id).is_none() {
        return result(false, "invalid_line", "This guided reading line is not part of the current VoiceLab script.");
    }
    if current_voice_lab_build_snapshot().active {
        return result(false, "build_active", "Finish or cancel the current VoiceLab build before recording more lines.");
    }
    if draft_store().lock().ok().and_then(|guard| guard.as_ref().map(|draft| draft.line_id)).is_some() {
        return result(false, "review_pending", "Replay, retry, or accept the current take before recording another line.");
    }

    let session = begin_direct_live_capture_session();
    let Some(snapshot) = session.snapshot.as_ref() else {
        return result(false, "runtime_unavailable", "VoiceLab cannot verify microphone ownership right now.");
    };
    if !session.blocker.is_empty() || snapshot.owner_id != CAPTURE_OWNER_ID {
        return result(false, "microphone_in_use", "Stop Meeting translation or Mic Test before recording a VoiceLab line.");
    }
    if let Err(blocker) = arm_guided_take(line_id) {
        let _ = clear_runtime_session_if_generation(snapshot.generation);
        return result(false, "capture_unavailable", blocker);
    }
    let capture = start_live_capture_runtime(session);
    if !capture.ok {
        cancel_guided_take();
        let _ = clear_runtime_session_state();
        return result(false, "capture_failed", capture.message);
    }
    result(true, "recording", "Recording started. Read the line naturally, then press Stop.")
}

#[tauri::command]
pub fn stop_voice_lab_guided_take(line_id: u32) -> GuidedRecordingActionResult {
    if active_guided_take_line_id() != Some(line_id) {
        return result(false, "line_mismatch", "The requested line is not the guided take currently being recorded.");
    }
    let current = latest_runtime_session_state();
    let Some(snapshot) = current.snapshot.as_ref() else {
        return result(false, "runtime_unavailable", "VoiceLab cannot verify microphone ownership right now.");
    };
    if snapshot.owner_id != CAPTURE_OWNER_ID {
        return result(false, "owner_conflict", "VoiceLab does not own the active microphone session.");
    }
    let generation = snapshot.generation;
    if snapshot.authority_active {
        let revoked = revoke_runtime_session_authority(
            generation,
            "VoiceLab Stop accepted. Capture authority was revoked before microphone cleanup.",
        );
        if revoked.snapshot.as_ref().map(|value| value.authority_active).unwrap_or(true) {
            return result(false, "stop_failed", "VoiceLab could not revoke recording ownership safely.");
        }
    }

    let stopped = stop_live_capture_runtime();
    if !stopped.ok {
        let _ = mark_runtime_session_cleanup_incomplete(
            generation,
            true,
            "VoiceLab recording authority is revoked, but microphone cleanup still needs attention.",
        );
        return result(false, "stop_failed", stopped.message);
    }
    let captured = take_guided_audio();
    let cleared = clear_runtime_session_if_generation(generation);
    if cleared.has_active_session || cleared.snapshot.is_some() {
        return result(false, "cleanup_unverified", "The microphone stopped, but VoiceLab could not confirm that recording ownership was cleared.");
    }
    let Ok((captured, review)) = captured else {
        return result(false, "take_unusable", captured.err().unwrap_or_else(|| "voice_lab:take_unusable".to_string()));
    };
    if captured.line_id != line_id {
        return result(false, "line_mismatch", "The recorded audio does not belong to the requested guided line.");
    }
    let draft = draft_path(line_id);
    if let Err(error) = write_pcm16_wav(
        &draft,
        GUIDED_TAKE_SAMPLE_RATE_HZ,
        GUIDED_TAKE_CHANNELS,
        &captured.samples_mono,
    ) {
        return result(false, "draft_write_failed", format!("VoiceLab could not save the review take: {error}"));
    }
    let mut guard = match draft_store().lock() {
        Ok(guard) => guard,
        Err(_) => return result(false, "draft_state_unavailable", "VoiceLab could not retain the review take state."),
    };
    *guard = Some(PendingDraft { line_id, path: draft, review });
    drop(guard);
    result(true, "needs_review", "Recording stopped. Replay the take, then accept it or retry the line.")
}

#[tauri::command]
pub fn retry_voice_lab_guided_take(line_id: u32) -> GuidedRecordingActionResult {
    let mut guard = match draft_store().lock() {
        Ok(guard) => guard,
        Err(_) => return result(false, "draft_state_unavailable", "VoiceLab cannot access the pending review take."),
    };
    let Some(draft) = guard.as_ref() else {
        drop(guard);
        return result(true, "ready", "There is no pending review take to discard.");
    };
    if draft.line_id != line_id {
        drop(guard);
        return result(false, "line_mismatch", "The pending review take belongs to another guided line.");
    }
    let path = draft.path.clone();
    *guard = None;
    drop(guard);
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    result(true, "ready", "The review take was discarded. The previous accepted take, if any, was kept.")
}

#[tauri::command]
pub fn accept_voice_lab_guided_take(line_id: u32) -> GuidedRecordingActionResult {
    let mut guard = match draft_store().lock() {
        Ok(guard) => guard,
        Err(_) => return result(false, "draft_state_unavailable", "VoiceLab cannot access the pending review take."),
    };
    let Some(draft) = guard.as_ref() else {
        drop(guard);
        return result(false, "no_review", "Record and review this line before accepting it.");
    };
    if draft.line_id != line_id {
        drop(guard);
        return result(false, "line_mismatch", "The pending review take belongs to another guided line.");
    }
    if !draft.review.quality_blocker.is_empty() {
        drop(guard);
        return result(false, "take_unusable", "This take is silent or empty. Retry the line before accepting it.");
    }
    let target = accepted_path(line_id);
    if let Some(parent) = target.parent() {
        if let Err(error) = fs::create_dir_all(parent) {
            drop(guard);
            return result(false, "save_failed", format!("VoiceLab could not prepare take storage: {error}"));
        }
    }
    let previous = target.with_extension("wav.previous");
    if previous.exists() { let _ = fs::remove_file(&previous); }
    if target.exists() {
        if let Err(error) = fs::rename(&target, &previous) {
            drop(guard);
            return result(false, "save_failed", format!("VoiceLab could not preserve the previous accepted take: {error}"));
        }
    }
    if let Err(error) = fs::rename(&draft.path, &target) {
        if previous.exists() && !target.exists() { let _ = fs::rename(&previous, &target); }
        drop(guard);
        return result(false, "save_failed", format!("VoiceLab could not accept this take: {error}"));
    }
    if previous.exists() { let _ = fs::remove_file(previous); }
    *guard = None;
    drop(guard);
    result(true, "accepted", "Take accepted and saved for the Voice Actor dataset.")
}

#[tauri::command]
pub fn get_voice_lab_guided_take_audio(line_id: u32) -> Result<tauri::ipc::Response, String> {
    if guided_text(line_id).is_none() {
        return Err("voice_lab:invalid_guided_line".to_string());
    }
    let pending_path = draft_store()
        .lock()
        .map_err(|_| "voice_lab:guided_draft_state_unavailable".to_string())?
        .as_ref()
        .filter(|draft| draft.line_id == line_id)
        .map(|draft| draft.path.clone());
    let path = pending_path.unwrap_or_else(|| accepted_path(line_id));
    let metadata = fs::metadata(&path).map_err(|_| "voice_lab:take_audio_missing".to_string())?;
    if !metadata.is_file() || metadata.len() < 44 || metadata.len() > MAX_REPLAY_WAV_BYTES {
        return Err("voice_lab:take_audio_invalid".to_string());
    }
    let bytes = fs::read(path).map_err(|_| "voice_lab:take_audio_read_failed".to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}
