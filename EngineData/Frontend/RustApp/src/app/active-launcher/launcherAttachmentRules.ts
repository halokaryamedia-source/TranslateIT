export const MAX_ATTACHMENT_BYTES = 64 * 1024;
export const MAX_ATTACHMENT_FILES = 4;
export const MAX_ATTACHMENT_NAME_CHARS = 96;

const TEXT_ATTACHMENT_EXTENSIONS = [".txt", ".md", ".json", ".csv", ".tsv", ".log", ".xml", ".yaml", ".yml", ".srt", ".vtt"];
const TEXT_ATTACHMENT_SUPPORT_MESSAGE = "Only text-based attachments are supported for now. PDF and DOCX require a backend parser first.";
const UNSAFE_FILENAME_CHARS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;

export function safeAttachmentName(file: File): string {
  const clean = file.name
    .replace(UNSAFE_FILENAME_CHARS, "")
    .replace(/[\\/]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ATTACHMENT_NAME_CHARS);
  return clean || "attachment.txt";
}

export function isSupportedTextAttachment(file: File): boolean {
  const name = safeAttachmentName(file).toLowerCase();
  return file.type.startsWith("text/") || file.type === "application/json" || TEXT_ATTACHMENT_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function compactAttachmentText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function attachmentSection(file: File, text: string): string {
  return `[Attachment: ${safeAttachmentName(file)}]\n${text}`;
}

export function unsupportedAttachmentMessage(file: File): string {
  const name = safeAttachmentName(file);
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith(".pdf") || lowerName.endsWith(".docx")) return `${name} is not supported yet. ${TEXT_ATTACHMENT_SUPPORT_MESSAGE}`;
  return `${name} is not a supported text attachment. ${TEXT_ATTACHMENT_SUPPORT_MESSAGE}`;
}
