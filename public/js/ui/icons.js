/**
 * CoC Freemium Optimizer — Bibliothèque d'Icônes & Blasons SVG Inline (Zéro Emoji / Zéro CDN)
 */

const UI_ICONS = {
  townhall: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V10l7-6 7 6v11"/><path d="M9 21v-6a3 3 0 0 1 6 0v6"/><path d="M12 4V2"/></svg>`,
  builder: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/></svg>`,
  defense: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>`,
  resource: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v8"/><path d="M9 10h6"/></svg>`,
  army: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>`,
  trap: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="13" r="8"/><path d="m18.3 5.7-2.6 2.6"/><path d="M19 2v3"/><path d="M22 5h-3"/></svg>`,
  wall: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M3 15h18"/><path d="M9 4v6"/><path d="M15 10v5"/><path d="M9 15v5"/></svg>`,
  lab: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"/><path d="M10 9V3"/><path d="M14 9V3"/><path d="M10 9 4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9Z"/><path d="M7 15h10"/></svg>`,
  crafted: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/><circle cx="12" cy="12" r="4"/></svg>`,
  equipment: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  chevron: `<svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  arrowRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  elixir: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  spell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"/><path d="M10 3v5l-4.5 7.5A3 3 0 0 0 8.1 20h7.8a3 3 0 0 0 2.6-4.5L14 8V3"/></svg>`,
  upload: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  qr: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M17 17h4v4h-4z"/><path d="M14 20h1"/><path d="M20 14h1"/></svg>`,
  sparkles: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
  chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
};

export function getUiIcon(key, size = null) {
  let svg = UI_ICONS[key] || UI_ICONS.townhall;
  if (size) {
    svg = svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`);
  }
  return svg;
}

/**
 * Blasons SVG vectoriels sur mesure pour les 5 Héros (100% hors-ligne, zéro CDN)
 */
export function getHeroPortraitSvg(heroKey) {
  switch (heroKey) {
    case 'king':
      // Couronne Royale & Épée
      return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 8l4 10h12l4-10-5 4-5-6-5 6-5-4z" fill="currentColor" fill-opacity="0.18"/>
        <path d="M5 21h14"/>
      </svg>`;
    case 'queen':
      // Diadème & Arc d'Archère
      return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 18a11 11 0 0 1 14-14" />
        <line x1="4" y1="18" x2="18" y2="4"/>
        <path d="M11 20 20 11" />
        <path d="m17 11 3 0 0 3" />
      </svg>`;
    case 'warden':
      // Grimoire & Halo du Gardien
      return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" fill="currentColor" fill-opacity="0.14"/>
        <circle cx="13" cy="9" r="2.5"/>
      </svg>`;
    case 'minion_prince':
      // Ailes & Cornes du Prince Gargouille
      return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 6c-3-4-8-3-10 1 2 2 3 4 2 7 3-1 5 0 8 4 3-4 5-5 8-4-1-3 0-5 2-7-2-4-7-5-10-1z" fill="currentColor" fill-opacity="0.2"/>
        <path d="M9 5l-2-3"/><path d="M15 5l2-3"/>
      </svg>`;
    case 'champion':
      // Bouclier & Lance Royale
      return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fill-opacity="0.18"/>
        <path d="M12 7v10"/><path d="M9 10l3-3 3 3"/>
      </svg>`;
    default:
      return UI_ICONS.equipment;
  }
}

/**
 * Icône SVG pour une catégorie de bâtiment/entité
 */
export function getCategoryIconBox(category, iconKey = null) {
  const map = {
    defense: { key: 'defense', cls: 'entity-icon-defense' },
    resource: { key: 'resource', cls: 'entity-icon-resource' },
    army: { key: 'army', cls: 'entity-icon-army' },
    trap: { key: 'trap', cls: 'entity-icon-trap' },
    builder: { key: 'builder', cls: 'entity-icon-builder' },
    builderBase: { key: 'builder', cls: 'entity-icon-builder' },
    core: { key: 'townhall', cls: 'entity-icon-army' },
    wall: { key: 'wall', cls: 'entity-icon-resource' },
    elixir: { key: 'elixir', cls: 'entity-icon-elixir' },
    dark_elixir: { key: 'elixir', cls: 'entity-icon-dark_elixir' },
    spell: { key: 'spell', cls: 'entity-icon-elixir' },
    equipment: { key: 'equipment', cls: 'entity-icon-army' },
    lab: { key: 'lab', cls: 'entity-icon-army' },
    crafted: { key: 'crafted', cls: 'entity-icon-defense' }
  };
  const cfg = map[iconKey || category] || { key: 'townhall', cls: '' };
  return `<div class="entity-icon-box ${cfg.cls}" aria-hidden="true">${getUiIcon(cfg.key, 19)}</div>`;
}
