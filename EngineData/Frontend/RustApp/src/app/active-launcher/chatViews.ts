import { icon } from "../shared/icons";
import type { ChatKind, LauncherChatSummary } from "../shared/types";
import { emptyState } from "./uiPageFactory";

const MAX_CHAT_COLLECTION_CARDS = 6;
const MAX_CHAT_TITLE_CHARS = 64;
const MAX_RESULT_PREVIEW_CHARS = 900;
const TRANSLATION_PENDING_MESSAGE = "Translation is not available yet. The local worker or model may still need setup.";
const UNSAFE_DISPLAY_CHARS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanDisplayText(value: string): string {
  return value.replace(UNSAFE_DISPLAY_CHARS, "").replace(/\s+/g, " ").trim();
}

function compactTitle(value: string): string {
  const clean = cleanDisplayText(value) || "Untitled Chat";
  let compact = "";
  let count = 0;
  for (const character of clean) {
    if (count >= MAX_CHAT_TITLE_CHARS - 1) return `${compact}…`;
    compact += character;
    count += 1;
  }
  return compact;
}

function compactResult(value: string, fallback = "No text available."): string {
  const clean = cleanDisplayText(value) || fallback;
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

function localTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type TranslationResultDisplay = {
  body: string;
  runtimeLabel: string;
  helperDetail: string | null;
};

function translationRuntimeLabel(voiceStatus: string): string {
  const normalized = voiceStatus.toLowerCase();
  if (normalized.includes("local preview")) return "Local preview fallback";
  if (normalized.includes("error")) return "Runtime blocked";
  return "Native runtime";
}

function splitHelperBridgeMetadata(translated: string, voiceStatus: string): TranslationResultDisplay {
  const marker = "\n\n(helper bridge:";
  const markerIndex = translated.indexOf(marker);
  if (markerIndex < 0) {
    return {
      body: translated,
      runtimeLabel: translationRuntimeLabel(voiceStatus),
      helperDetail: null,
    };
  }

  const body = translated.slice(0, markerIndex).trim();
  const detail = translated
    .slice(markerIndex + marker.length)
    .replace(/\)\s*$/, "")
    .trim();

  return {
    body: body || translated,
    runtimeLabel: "Helper bridge",
    helperDetail: detail || null,
  };
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
  const display = splitHelperBridgeMetadata(translated, voiceStatus);
  const hasTranslatedText = Boolean(display.body.trim());
  const translatedText = hasTranslatedText ? display.body : TRANSLATION_PENDING_MESSAGE;
  const sourcePreview = escapeHtml(compactResult(source, "No source text available."));
  const translatedPreview = escapeHtml(compactResult(translatedText, TRANSLATION_PENDING_MESSAGE));
  const translatedFull = escapeHtml(cleanDisplayText(translatedText) || TRANSLATION_PENDING_MESSAGE);
  const sourceFull = escapeHtml(cleanDisplayText(source) || "No source text available.");
  const statusText = escapeHtml(compactResult(voiceStatus, "No voice status available."));
  const runtimeText = escapeHtml(compactResult(display.runtimeLabel, "Runtime unknown."));
  const helperDetail = display.helperDetail ? `<span class="translation-result-helper">${escapeHtml(compactResult(display.helperDetail, ""))}</span>` : "";
  const timeText = escapeHtml(localTimeLabel());
  const pendingClass = hasTranslatedText ? "" : " is-pending";
  return `<section class="translation-result-stack" aria-label="Latest translation result"><article class="translation-result-card${pendingClass}"><header><h4>${icon("translate")} Translation Result</h4><div class="translation-result-actions"><span class="translation-result-time">${timeText}</span><button type="button" data-copy-translation="${sourceFull}" aria-label="Copy original text">Copy original</button><button type="button" data-copy-translation="${translatedFull}" aria-label="Copy full translated text">Copy result</button></div></header><div class="translation-result-grid"><section class="translation-result-block"><strong>Original</strong><p>${sourcePreview}</p></section><section class="translation-result-block"><strong>${hasTranslatedText ? "Translated" : "Status"}</strong><p>${translatedPreview}</p></section></div><p class="translation-result-meta">Runtime: ${runtimeText} · Voice output: ${statusText}</p>${helperDetail}</article></section>`;
}

function emptyChatCollectionView(kind: ChatKind): string {
  return emptyState(`No ${kind} chat yet`, "New chat sessions will appear here after you send a message.");
}
