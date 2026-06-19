const UNSAFE_LANGUAGE_CHARS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;

function normalizeLanguageCode(value: string): string {
  const text = value.replace(UNSAFE_LANGUAGE_CHARS, "").trim().toLowerCase();
  if (text.startsWith("ind") || text.startsWith("id")) return "id";
  if (text.startsWith("eng") || text.startsWith("en")) return "en";
  return text.slice(0, 2);
}

function previewWordTranslation(token: string): string {
  switch (token) {
    case "halo": return "hello";
    case "dunia": return "world";
    case "saya":
    case "aku": return "I";
    case "kamu":
    case "anda": return "you";
    case "kami":
    case "kita": return "we";
    case "mereka": return "they";
    case "dan": return "and";
    case "atau": return "or";
    case "untuk": return "for";
    case "dengan": return "with";
    case "di": return "in";
    case "ke": return "to";
    case "dari": return "from";
    case "ini": return "this";
    case "itu": return "that";
    case "apa": return "what";
    case "siapa": return "who";
    case "kapan": return "when";
    case "dimana": return "where";
    case "bagaimana": return "how";
    case "tolong":
    case "mohon": return "please";
    case "terima": return "thank";
    case "kasih": return "you";
    case "maaf": return "sorry";
    case "ya": return "yes";
    case "tidak":
    case "enggak":
    case "nggak": return "no";
    case "bisa": return "can";
    case "selamat": return "welcome";
    case "pagi": return "morning";
    case "siang": return "afternoon";
    case "malam": return "evening";
    case "kembali": return "back";
    case "coba": return "try";
    case "tunggu": return "wait";
    case "sebentar":
    case "bentar": return "moment";
    case "cek": return "check";
    case "lihat": return "see";
    case "buka": return "open";
    case "tutup": return "close";
    case "tes":
    case "uji": return "test";
    case "suara": return "voice";
    case "teks": return "text";
    case "hasil": return "result";
    case "terjemahan": return "translation";
    case "aktif": return "active";
    case "siap": return "ready";
    case "ringkas": return "summary";
    case "lokal": return "local";
    default: return token;
  }
}

export function localPreviewTranslation(source: string, sourceLanguage: string, targetLanguage: string): string | null {
  const normalizedSource = normalizeLanguageCode(sourceLanguage);
  const normalizedTarget = normalizeLanguageCode(targetLanguage);
  if (normalizedSource !== "id" || normalizedTarget !== "en") return null;

  const tokens = source
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return null;

  const translated = tokens.map((token) => previewWordTranslation(token)).join(" ").trim();
  return translated ? translated.charAt(0).toUpperCase() + translated.slice(1) : null;
}
