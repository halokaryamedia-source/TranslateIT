export type CloseDialogAction = "stop" | "retry" | null;

export type CloseVerdict =
  | { kind: "dialog"; title: string; message: string; action: CloseDialogAction }
  | { kind: "destroy" }
  | { kind: "stop-and-close" }
  | { kind: "wait-for-stop"; title: string; message: string };

export type ClosePolicySnapshot = {
  recordingLineId: number | null;
  pendingReview: boolean;
  buildUnavailable: boolean;
  buildActive: boolean;
  meetingUnavailable: boolean;
  hasMeetingSession: boolean;
  meetingApplicationOwned: boolean;
  meetingLifecycle: string;
};

function dialog(title: string, message: string, action: CloseDialogAction): CloseVerdict {
  return { kind: "dialog", title, message, action };
}

export function resolveClosePolicy(snapshot: ClosePolicySnapshot): CloseVerdict {
  if (snapshot.recordingLineId !== null) {
    return dialog(
      "Voice recording is still running",
      "Stop the current My Voice recording before closing TranslateIT so the take can be reviewed safely.",
      null,
    );
  }

  if (snapshot.pendingReview) {
    return dialog(
      "Review the current voice take",
      "Accept or retry the current My Voice take before closing TranslateIT.",
      null,
    );
  }

  if (snapshot.buildUnavailable) {
    return dialog(
      "Can't check My Voice yet",
      "TranslateIT can't confirm whether My Voice is still being created. Keep the app open and try again.",
      "retry",
    );
  }

  if (snapshot.buildActive) {
    return dialog(
      "My Voice is still being created",
      "Stop My Voice creation before closing TranslateIT so the training process can end safely.",
      null,
    );
  }

  if (snapshot.meetingUnavailable) {
    return dialog(
      "Can't check the meeting yet",
      "TranslateIT can't confirm whether Meeting translation is still active. Keep the app open or try the check again.",
      "retry",
    );
  }

  if (!snapshot.hasMeetingSession) return { kind: "destroy" };

  if (!snapshot.meetingApplicationOwned) {
    return dialog(
      "Audio is still in use",
      "Another TranslateIT action is still using the microphone. Finish that action before closing the app.",
      null,
    );
  }

  if (snapshot.meetingLifecycle === "stopping") {
    return {
      kind: "wait-for-stop",
      title: "Translation is stopping",
      message: "TranslateIT will close after Meeting translation finishes stopping.",
    };
  }

  return { kind: "stop-and-close" };
}
