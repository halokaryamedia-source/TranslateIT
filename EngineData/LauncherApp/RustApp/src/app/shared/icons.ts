export const icons = {
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`,
  file: `<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/></svg>`,
  folder: `<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v9H3z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6z"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24"><path d="M8 10l4 4 4-4"/></svg>`,
  mic: `<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>`,
  micOff: `<svg viewBox="0 0 24 24"><path d="M9.5 4.5A3 3 0 0 1 15 6v4.5"/><path d="M9 9.5V12a3 3 0 0 0 4.2 2.75"/><path d="M5 11a7 7 0 0 0 10.4 6.1"/><path d="M19 11a7 7 0 0 1-1.2 3.9"/><path d="M12 18v3M9 21h6M4 4l16 16"/></svg>`,
  headphonesOff: `<svg viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 12.4-6.7"/><path d="M20 14v-2c0-1.1-.2-2.1-.6-3"/><path d="M4 14h4v6H6a2 2 0 0 1-2-2z"/><path d="M17 14h3v4"/><path d="M4 4l16 16"/></svg>`,
  settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.9-1.1L14.3 3h-4.6l-.4 2.9A7 7 0 0 0 7.5 7L5.1 6l-2 3.4 2 1.5A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.1l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.9 1.1l.4 2.9h4.6l.4-2.9a7 7 0 0 0 1.9-1.1l2.4 1 2-3.4-2-1.5A7 7 0 0 0 19 12z"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h.01M11 9h.01M15 9h.01M7 13h.01M11 13h.01M15 13h.01M8 17h8"/></svg>`,
  arrowUp: `<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>`,
  back: `<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a5 5 0 0 1 0 6M19 7a9 9 0 0 1 0 10"/></svg>`,
  sliders: `<svg viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h3M11 12h9M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>`,
  translate: `<svg viewBox="0 0 24 24"><path d="M4 5h9M9 5v14M5 9c1.2 3.8 4.1 6.4 8 8"/><path d="M14 19l4-9 4 9M15.5 16h5"/></svg>`,
  code: `<svg viewBox="0 0 24 24"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/></svg>`,
  monitor: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  pulse: `<svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`,
  logs: `<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`,
  maximize: `<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/><path d="M3 3l7 7M21 3l-7 7M3 21l7-7M21 21l-7-7"/></svg>`,
  swap: `<svg viewBox="0 0 24 24"><path d="M7 7h12M15 3l4 4-4 4M17 17H5M9 13l-4 4 4 4"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>`,
};

export type IconName = keyof typeof icons;

export function icon(name: IconName): string {
  return `<span class="icon" aria-hidden="true">${icons[name]}</span>`;
}
