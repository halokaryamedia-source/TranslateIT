import { icon } from "../shared/icons";
import type { ChatKind, LauncherChatSummary } from "../shared/types";

const MAX_CHAT_COLLECTION_CARDS = 6;
const MAX_CHAT_TITLE_CHARS = 64;

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
  let compact = "";
  let count = 0;
  for (const character of clean) {
    if (count >= MAX_CHAT_TITLE_CHARS - 1) return `${compact}…`;
    compact += character;
    count += 1;
  }
  return compact;
}

function safeMessageCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value > 999) return "999+";
  return Math.floor(value).toString();
}

function chatIcon(kind: ChatKind): "folder" | "file" {
  return kind === "saved" ? "folder" : "file";
}

export function chatCollectionView(kind: ChatKind, sessions: LauncherChatSummary[]): string {
  if (!sessions.length) return emptyChatCollectionView(kind);
  return sessions
    .slice(0, MAX_CHAT_COLLECTION_CARDS)
    .map((item) => {
      const title = escapeHtml(compactTitle(item.title));
      const itemKind = escapeHtml(item.kind);
      const messageCount = safeMessageCount(item.message_count);
      const ariaLabel = escapeHtml(`${item.kind} chat: ${compactTitle(item.title)}, ${messageCount} message(s)`);
      return `<article class="feature-card" aria-label="${ariaLabel}"><div class="feature-title-row"><div class="feature-icon">${icon(chatIcon(kind))}</div><h4 title="${title}">${title}</h4></div><p>${itemKind} · ${messageCount} message(s)</p></article>`;
    })
    .join("");
}

function emptyChatCollectionView(kind: ChatKind): string {
  const label = escapeHtml(`${kind} chat list is empty`);
  return `<article class="feature-card" aria-label="${label}"><div class="feature-title-row"><div class="feature-icon">${icon(chatIcon(kind))}</div><h4>No ${escapeHtml(kind)} chat yet</h4></div><p>New chat sessions will appear here after you send a message.</p></article>`;
}
