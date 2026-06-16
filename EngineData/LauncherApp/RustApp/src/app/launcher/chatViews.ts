import { icon } from "../shared/icons";
import type { ChatKind, LauncherChatSummary } from "../shared/types";
import { emptyState } from "./uiPageFactory";

const MAX_CHAT_COLLECTION_CARDS = 6;
const MAX_CHAT_TITLE_CHARS = 64;
const MAX_RESULT_PREVIEW_CHARS = 900;

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

function compactResult(value: string): string {
  const clean = value.trim() || "No text available.";
  let compact = "";
  let count = 0;
  for (const character of clean) {
    if (count >= MAX_RESULT_PREVIEW_CHARS - 1) return `${compact}…`;
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

function messageCountLabel(value: string): string {
  return value === "1" ? "1 message" : `${value} messages`;
}

function chatIcon(kind: ChatKind): "folder" | "file" {
  return kind === "saved" ? "folder" : "file";
}

export function chatCollectionView(kind: ChatKind, sessions: LauncherChatSummary[]): string {
  if (!sessions.length) return emptyChatCollectionView(kind);
  return sessions
    .slice(0, MAX_CHAT_COLLECTION_CARDS)
    .map((item) => {
      const compact = compactTitle(item.title);
      const title = escapeHtml(compact);
      const itemKind = escapeHtml(item.kind);
      const messageCount = safeMessageCount(item.message_count);
      const messageLabel = messageCountLabel(messageCount);
      const ariaLabel = escapeHtml(`${item.kind} chat: ${compact}, ${messageLabel}`);
      return `<article class="feature-card" aria-label="${ariaLabel}"><div class="feature-title-row"><div class="feature-icon">${icon(chatIcon(kind))}</div><h4 title="${title}">${title}</h4></div><p>${itemKind} · ${escapeHtml(messageLabel)}</p></article>`;
    })
    .join("");
}

export function translationResultView(source: string, translated: string, voiceStatus: string): string {
  const sourcePreview = escapeHtml(compactResult(source));
  const translatedPreview = escapeHtml(compactResult(translated));
  const translatedFull = escapeHtml(translated.trim() || "No text available.");
  const statusText = escapeHtml(voiceStatus);
  return `<section class="translation-result-stack" aria-label="Latest translation result"><article class="translation-result-card"><header><h4>${icon("translate")} Translation Result</h4><button type="button" data-copy-translation="${translatedFull}" aria-label="Copy full translated text">Copy</button></header><div class="translation-result-grid"><section class="translation-result-block"><strong>Original</strong><p>${sourcePreview}</p></section><section class="translation-result-block"><strong>Translated</strong><p>${translatedPreview}</p></section></div><p class="translation-result-meta">Voice output: ${statusText}</p></article></section>`;
}

function emptyChatCollectionView(kind: ChatKind): string {
  return emptyState(`No ${kind} chat yet`, "New chat sessions will appear here after you send a message.");
}
