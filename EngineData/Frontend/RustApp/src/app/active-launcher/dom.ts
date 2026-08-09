const UNSAFE_SELECTOR_DIAGNOSTIC_CHARS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;
const MAX_SELECTOR_DIAGNOSTIC_CHARS = 120;

function selectorDiagnosticLabel(selector: string): string {
  const clean = selector.replace(UNSAFE_SELECTOR_DIAGNOSTIC_CHARS, "").replace(/\s+/g, " ").trim();
  if (!clean) return "required UI element";
  return clean.length > MAX_SELECTOR_DIAGNOSTIC_CHARS ? `${clean.slice(0, MAX_SELECTOR_DIAGNOSTIC_CHARS - 1)}…` : clean;
}

export function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selectorDiagnosticLabel(selector)} was not found.`);
  return element;
}
