import { icon } from "../shared/icons";
import type { ChatKind, LauncherChatSummary } from "../shared/types";

export function chatCollectionView(kind: ChatKind, sessions: LauncherChatSummary[]): string {
  if (!sessions.length) return emptyChatCollectionView(kind);
  return sessions
    .slice(0, 6)
    .map((item) => `<article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon(kind === "saved" ? "folder" : "file")}</div><h4>${item.title}</h4></div><p>${item.kind} · ${item.message_count} message(s)</p></article>`)
    .join("");
}

function emptyChatCollectionView(kind: ChatKind): string {
  return `<article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("file")}</div><h4>No ${kind} chat yet</h4></div><p>New chat sessions will appear here after you send a message.</p></article>`;
}
