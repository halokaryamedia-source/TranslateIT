type AttributeMap = Record<string, string | number | boolean | null | undefined>;

type LogLevel = "OK" | "INFO" | "WARN" | "ERR" | "WAIT" | "HW" | "GPU" | "ASR" | "TR" | "TTS" | "CUDA";

export type DeveloperLogRow = {
  level: LogLevel;
  message: string;
  time?: string;
};

const SAFE_ATTRIBUTE_NAME = /^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/;
const MAX_DEVELOPER_LOG_ROWS = 24;

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
    .filter(([key, value]) => SAFE_ATTRIBUTE_NAME.test(key) && value !== false && value !== null && value !== undefined)
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

export function settingsGrid(body: string, compact = false): string {
  return `<div class="settings-grid-2 ${compact ? "compact-grid" : ""}">${body}</div>`;
}

export function settingsField(label: string, body: string, description = "", modifier = ""): string {
  const helper = description ? `<p>${escapeHtml(description)}</p>` : "";
  const className = modifier ? `settings-field ${escapeHtml(modifier)}` : "settings-field";
  return `<section class="${className}"><h3>${escapeHtml(label)}</h3>${helper}${body}</section>`;
}

export function settingsActions(body: string, compact = false): string {
  return `<div class="settings-card-actions ${compact ? "compact" : ""}">${body}</div>`;
}

export function selectButton(label: string, value: string, attributes: AttributeMap = {}): string {
  const merged = { type: "button", "aria-label": label, ...attributes };
  return `<button class="select-field-v22"${attrs(merged)}><span>${escapeHtml(value)}</span></button>`;
}

export function primaryButton(label: string, attributes: AttributeMap = {}): string {
  const classValue = attributes.class ? ` ${String(attributes.class)}` : "";
  const cleanAttributes = { ...attributes };
  delete cleanAttributes.class;
  const merged = { type: "button", ...cleanAttributes };
  return `<button class="mic-test-button-v22${escapeHtml(classValue)}"${attrs(merged)}>${escapeHtml(label)}</button>`;
}

export function advancedEmpty(): string {
  return `<article class="advanced-empty-v22"></article>`;
}

export function emptyState(title: string, description: string): string {
  return `<article class="feature-card empty-state-card"><div class="feature-title-row"><h4>${escapeHtml(title)}</h4></div><p>${escapeHtml(description)}</p></article>`;
}

export function outputRow(iconHtml: string, title: string, description: string, controlHtml: string): string {
  return `<section class="settings-output-row">${iconHtml}<div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div>${controlHtml}</section>`;
}

export function languageSelectField(label: string, buttonHtml: string, dropdownHtml = ""): string {
  return settingsField(label, `${buttonHtml}${dropdownHtml}`, "", "language-block");
}

export function radioOption(id: string | null, title: string, description: string, active = false, asButton = false): string {
  const idAttr = id ? ` id="${escapeHtml(id)}"` : "";
  const tag = asButton ? "button" : "label";
  const typeAttr = asButton ? ' type="button"' : "";
  return `<${tag}${idAttr}${typeAttr} class="radio-row-v22 ${active ? "active" : ""}"><span></span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(description)}</em></${tag}>`;
}

export function monitoringPanel(iconHtml: string, title: string, description: string, bodyHtml: string): string {
  return `<section class="settings-panel-heading">${iconHtml}<div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div>${bodyHtml}</section>`;
}

export function diagnosticActions(actionHtml: string, label: string, value: string): string {
  return `<div class="diagnostic-actions">${actionHtml}<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div></div>`;
}

export function statusBadge(label: string, tone: "neutral" | "good" | "warning" | "error" = "neutral"): string {
  return `<span class="status-badge status-badge--${tone}">${escapeHtml(label)}</span>`;
}

export function developerLogRows(rows: DeveloperLogRow[]): string {
  const visibleRows = rows.slice(0, MAX_DEVELOPER_LOG_ROWS);
  const hiddenRows = Math.max(0, rows.length - MAX_DEVELOPER_LOG_ROWS);
  const renderedRows = visibleRows.map((row) => {
    const time = row.time ? `<em>${escapeHtml(row.time)}</em>` : "";
    return `<p class="developer-log-row"><strong>${escapeHtml(row.level)}</strong><span>${escapeHtml(row.message)}</span>${time}</p>`;
  });
  if (hiddenRows > 0) renderedRows.push(`<p class="developer-log-row"><strong>INFO</strong><span>${hiddenRows} older log row(s) hidden.</span></p>`);
  return renderedRows.join("");
}
