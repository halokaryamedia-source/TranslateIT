import { icon } from "../shared/icons";
import type { ChatKind, LauncherChatSummary } from "../shared/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function compactTitle(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim() || "Untitled Chat";
  return clean.length > 64 ? `${clean.slice(0, 63)}…` : clean;
}

export function chatCollectionView(kind: ChatKind, sessions: LauncherChatSummary[]): string {
  if (!sessions.length) return emptyChatCollectionView(kind);
  return sessions
    .slice(0, 6)
    .map((item) => {
      const title = escapeHtml(compactTitle(item.title));
      const itemKind = escapeHtml(item.kind);
      return `<article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon(kind === "saved" ? "folder" : "file")}</div><h4 title="${title}">${title}</h4></div><p>${itemKind} · ${item.message_count} message(s)</p></article>`;
    })
    .join("");
}

function emptyChatCollectionView(kind: ChatKind): string {
  return `<article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("file")}</div><h4>No ${escapeHtml(kind)} chat yet</h4></div><p>New chat sessions will appear here after you send a message.</p></article>`;
}
