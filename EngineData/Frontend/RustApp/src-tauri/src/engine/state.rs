use serde::Serialize;

const MAX_COMMAND_RESULT_MESSAGE_CHARS: usize = 2_000;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleState {
    Idle,
    Listening,
    Stopped,
    Error,
    ConversionPending,
}

impl LifecycleState {
    pub fn as_label(self) -> &'static str {
        match self {
            Self::Idle => "idle",
            Self::Listening => "listening",
            Self::Stopped => "stopped",
            Self::Error => "error",
            Self::ConversionPending => "conversion_pending",
        }
    }
}

#[derive(Debug, Serialize)]
pub struct CommandResult {
    pub ok: bool,
    pub state: &'static str,
    pub message: String,
}

impl CommandResult {
    pub fn ok(state: LifecycleState, message: impl Into<String>) -> Self {
        Self {
            ok: true,
            state: state.as_label(),
            message: sanitize_command_result_message(message.into()),
        }
    }

    pub fn blocked(state: LifecycleState, message: impl Into<String>) -> Self {
        Self {
            ok: false,
            state: state.as_label(),
            message: sanitize_command_result_message(message.into()),
        }
    }
}

fn is_unsafe_command_result_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn sanitize_command_result_message(value: String) -> String {
    let mut clean = value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_command_result_character(*character))
        .take(MAX_COMMAND_RESULT_MESSAGE_CHARS)
        .collect::<String>();
    if clean.is_empty() {
        clean = "Command completed without a message.".to_string();
    }
    clean
}

#[cfg(test)]
mod tests {
    use super::{CommandResult, LifecycleState};

    #[test]
    fn command_result_sanitizes_empty_message() {
        let result = CommandResult::blocked(LifecycleState::Error, "   ");
        assert!(!result.ok);
        assert_eq!(result.message, "Command completed without a message.");
    }

    #[test]
    fn lifecycle_state_labels_are_stable() {
        assert_eq!(LifecycleState::Listening.as_label(), "listening");
        assert_eq!(LifecycleState::Stopped.as_label(), "stopped");
        assert_eq!(LifecycleState::ConversionPending.as_label(), "conversion_pending");
    }
}
