type AttributeMap = Record<string, string | number | boolean | null | undefined>;

type LogLevel = "OK" | "INFO" | "WARN" | "ERR" | "WAIT" | "HW" | "GPU" | "ASR" | "TR" | "TTS" | "CUDA";

export type DeveloperLogRow = {
  level: LogLevel;
  message: string;
  time?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function attrs(values: AttributeMap = {}): string {
  return Object.entries(values)
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .map(([key, value]) => value === true ? ` ${key}` : ` ${key}="${escapeHtml(String(value))}"`)
    .join("");
}

export function settingsPage(title: string, description: string, modifier: string, body: string): string {
  return `<div class="settings-view ${escapeHtml(modifier)}"><section class="settings-view-header"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></section>${body}</div>`;
}

export function settingsSection(title: string, description: string, first = false): string {
  return `<section class="settings-section-title ${first ? "first" : ""}"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></section>`;
}

export function settingsCard(modifier: string, body: string, attributes: AttributeMap = {}): string {
  return `<article class="settings-card ${escapeHtml(modifier)}"${attrs(attributes)}>${body}</article>`;
}

export function settingsGrid(body: string): string {
  return `<div class="settings-grid-2">${body}</div>`;
}

export function settingsField(label: string, body: string, description = ""): string {
  const helper = description ? `<p>${escapeHtml(description)}</p>` : "";
  return `<section class="settings-field"><h3>${escapeHtml(label)}</h3>${helper}${body}</section>`;
}

export function settingsActions(body: string, compact = false): string {
  return `<div class="settings-card-actions ${compact ? "compact" : ""}">${body}</div>`;
}

export function selectButton(label: string, value: string, attributes: AttributeMap = {}): string {
  const merged = { type: "button", "aria-label": label, ...attributes };
  return `<button class="select-field-v22"${attrs(merged)}><span>${escapeHtml(value)}</span></button>`;
}

export function primaryButton(label: string, attributes: AttributeMap = {}): string {
  const merged = { type: "button", ...attributes };
  return `<button class="mic-test-button-v22"${attrs(merged)}>${escapeHtml(label)}</button>`;
}

export function advancedEmpty(): string {
  return `<article class="advanced-empty-v22"></article>`;
}

export function emptyState(title: string, description: string): string {
  return `<article class="feature-card empty-state-card"><div class="feature-title-row"><h4>${escapeHtml(title)}</h4></div><p>${escapeHtml(description)}</p></article>`;
}

export function statusBadge(label: string, tone: "neutral" | "good" | "warning" | "error" = "neutral"): string {
  return `<span class="status-badge status-badge--${tone}">${escapeHtml(label)}</span>`;
}

export function developerLogRows(rows: DeveloperLogRow[]): string {
  return rows.map((row) => {
    const time = row.time ? `<em>${escapeHtml(row.time)}</em>` : "";
    return `<p class="developer-log-row"><strong>${escapeHtml(row.level)}</strong><span>${escapeHtml(row.message)}</span>${time}</p>`;
  }).join("");
}
