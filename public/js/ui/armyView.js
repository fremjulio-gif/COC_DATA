/**
 * CoC Freemium Optimizer — Vue Laboratoire & Armée
 * Affiche la recherche en cours en temps réel, filtres segmentés et cartes visuelles Élixir / Élixir Noir
 */

import { decodeUnit, decodeSpell } from '../coc_data.js';
import {
  escapeHtml,
  formatDuration,
  createRadialRingSvg,
  animateVisualStats,
  ensureLiveTicker
} from '../utils.js';
import { getUiIcon, getCategoryIconBox } from './icons.js';

let currentArmyTab = 'all';
let currentArmySearch = '';

export function renderArmyView(container, analysis, capsData) {
  if (!container) return;
  container.innerHTML = '';

  if (!analysis || !analysis.success) {
    container.innerHTML = `
      <div class="card card-warning p-4">
        <p class="text-xs text-secondary">Données de laboratoire non disponibles.</p>
      </div>
    `;
    return;
  }

  const nowOrigin = Date.now();
  const thLevel = analysis.thLevel || 11;
  const thCaps = capsData?.townhalls?.[String(thLevel)] || {};
  const capsUnits = thCaps.units || {};
  const capsSpells = thCaps.spells || {};
  const armyPct = analysis.army?.completionPct || 0;

  const labUpgrades = analysis.builders?.labUpgrades || [];
  const activeLab = labUpgrades[0] || null;
  const activeLabId = activeLab ? activeLab.id : null;

  // 1. Bannière Synthèse Laboratoire
  let labBannerInner = '';
  if (activeLab) {
    const meta = decodeUnit(activeLab.id) || decodeSpell(activeLab.id);
    labBannerInner = `
      <div class="chantier-card mt-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div class="flex items-center gap-3 min-w-0">
            ${getCategoryIconBox('lab')}
            <div class="min-w-0">
              <div class="text-xs font-semibold text-primary flex flex-wrap items-center gap-1.5">
                <span>En recherche : ${escapeHtml(meta.name)}</span>
                <span class="badge badge-accent tabular-nums">→ Niv. ${activeLab.targetLevel + 1}</span>
              </div>
              <div class="text-2xs text-muted mt-0.5">
                Assistant Labo : <strong class="text-success">+${analysis.helpers?.labHelperHours || 0}h/jour</strong>
                ${activeLab.hasHelper ? ' • Assigné automatiquement' : ''}
              </div>
            </div>
          </div>
          <span class="timer-pill self-start sm:self-auto">
            ${getUiIcon('clock', 12)}
            <span data-timer-seconds="${activeLab.remainingSeconds}" data-timer-origin="${nowOrigin}">${formatDuration(activeLab.remainingSeconds)}</span>
          </span>
        </div>
      </div>
    `;
  } else {
    labBannerInner = `
      <div class="chantier-card mt-4" style="border-color: var(--color-warning-border); background-color: var(--color-warning-bg);">
        <div class="flex items-center gap-2.5 text-xs text-warning font-semibold">
          <span class="pulse-dot"></span>
          <span>Votre laboratoire est actuellement inactif — lancez une recherche prioritaire !</span>
        </div>
      </div>
    `;
  }

  const summaryCard = document.createElement('div');
  summaryCard.className = 'card card-hero p-5 mb-4';
  summaryCard.innerHTML = `
    <div class="home-hero-layout">
      <div class="home-hero-left">
        ${createRadialRingSvg({
          pct: armyPct,
          size: 86,
          stroke: 8,
          color: armyPct >= 80 ? 'var(--color-success)' : 'var(--accent)',
          centerValue: `${armyPct}%`,
          centerSub: 'Labo',
          valueSize: '17px'
        })}
        <div class="space-y-1 min-w-0">
          <h3 class="text-base sm:text-lg font-bold">Laboratoire & Armée</h3>
          <p class="text-xs text-secondary">
            <strong class="text-primary tabular-nums">${analysis.army?.maxedEntities || 0} / ${analysis.army?.totalEntities || 0}</strong> troupes et sorts au plafond HDV ${thLevel}.
          </p>
          <p class="text-2xs text-muted">
            Priorisez les troupes de farm et votre composition GDC principale avant de passer à l'HDV suivant.
          </p>
        </div>
      </div>
    </div>
    ${labBannerInner}
  `;
  container.appendChild(summaryCard);

  // 2. Barre de Filtres Segmentée + Grille Visuelle
  const explorerCard = document.createElement('div');
  explorerCard.className = 'card space-y-4';
  explorerCard.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-subtle">
      <div class="segmented-control" role="tablist" aria-label="Filtrer troupes et sorts">
        <button class="segmented-item ${currentArmyTab === 'all' ? 'active' : ''} army-tab-btn" data-army-tab="all">Tout</button>
        <button class="segmented-item ${currentArmyTab === 'elixir' ? 'active' : ''} army-tab-btn" data-army-tab="elixir">Élixir</button>
        <button class="segmented-item ${currentArmyTab === 'dark' ? 'active' : ''} army-tab-btn" data-army-tab="dark">Élixir Noir</button>
        <button class="segmented-item ${currentArmyTab === 'spells' ? 'active' : ''} army-tab-btn" data-army-tab="spells">Sorts</button>
        <button class="segmented-item ${currentArmyTab === 'todo' ? 'active' : ''} army-tab-btn" data-army-tab="todo">À améliorer</button>
      </div>
      <div class="sm:w-64">
        <input type="search" id="army-search-input" placeholder="Rechercher troupe ou sort..." value="${escapeHtml(currentArmySearch)}">
      </div>
    </div>

    <div id="army-entities-grid" class="grid-cards-auto">
      <!-- Cartes injectées -->
    </div>
  `;
  container.appendChild(explorerCard);

  const gridEl = explorerCard.querySelector('#army-entities-grid');

  const buildCombinedItems = () => {
    const units = (analysis.rawData?.units || []).map(u => ({
      id: u.data,
      lvl: Number(u.lvl) || 1,
      cap: capsUnits[u.data] ?? null,
      kind: 'unit',
      meta: decodeUnit(u.data),
      timer: u.timer || 0
    }));
    const spells = (analysis.rawData?.spells || []).map(s => ({
      id: s.data,
      lvl: Number(s.lvl) || 1,
      cap: capsSpells[s.data] ?? null,
      kind: 'spell',
      meta: decodeSpell(s.data),
      timer: s.timer || 0
    }));
    return [...units, ...spells];
  };

  const allEntities = buildCombinedItems();

  const renderGrid = () => {
    gridEl.innerHTML = '';

    const filtered = allEntities.filter(item => {
      if (currentArmyTab === 'elixir' && (item.kind !== 'unit' || item.meta.type !== 'elixir')) return false;
      if (currentArmyTab === 'dark' && (item.kind !== 'unit' || item.meta.type !== 'dark_elixir')) return false;
      if (currentArmyTab === 'spells' && item.kind !== 'spell') return false;
      if (currentArmyTab === 'todo') {
        if (!item.cap || item.lvl >= item.cap) return false;
      }
      if (currentArmySearch && !item.meta.name.toLowerCase().includes(currentArmySearch)) return false;
      return true;
    }).sort((a, b) => {
      // En recherche d'abord, puis plus gros retard
      const aActive = a.id === activeLabId ? 1 : 0;
      const bActive = b.id === activeLabId ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;
      const aDef = a.cap ? Math.max(0, a.cap - a.lvl) : -1;
      const bDef = b.cap ? Math.max(0, b.cap - b.lvl) : -1;
      if (bDef !== aDef) return bDef - aDef;
      return a.meta.name.localeCompare(b.meta.name);
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = `<p class="text-xs text-muted col-span-full py-4 text-center">Aucune troupe ni sort pour ce filtre.</p>`;
      return;
    }

    filtered.forEach(item => {
      const hasCap = item.cap !== null && item.cap > 0;
      const isMaxed = hasCap && item.lvl >= item.cap;
      const isActive = item.id === activeLabId;
      const pct = hasCap ? Math.min(100, Math.round((item.lvl / item.cap) * 100)) : 100;

      const iconType = item.kind === 'spell'
        ? 'spell'
        : item.meta.type === 'dark_elixir'
          ? 'dark_elixir'
          : 'elixir';

      const card = document.createElement('div');
      card.className = `card card-interactive p-3.5 flex flex-col justify-between gap-2.5 ${isActive ? 'card-accent' : ''}`;

      const badgeHtml = isActive
        ? `<span class="badge badge-accent"><span class="pulse-dot" style="width:5px;height:5px;"></span><span>En cours</span></span>`
        : !hasCap
          ? `<span class="badge badge-neutral">À vérifier</span>`
          : isMaxed
            ? `<span class="badge badge-success">Max</span>`
            : `<span class="badge badge-warning">-${item.cap - item.lvl}</span>`;

      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            ${getCategoryIconBox(iconType)}
            <div class="min-w-0">
              <h4 class="text-xs font-semibold text-primary truncate">${escapeHtml(item.meta.name)}</h4>
              <span class="text-2xs text-muted">${item.kind === 'spell' ? 'Sort' : (item.meta.type === 'dark_elixir' ? 'Élixir Noir' : 'Élixir')}</span>
            </div>
          </div>
          ${badgeHtml}
        </div>

        <div>
          <div class="flex justify-between text-2xs mb-1">
            <span class="font-bold tabular-nums text-primary">Niv. ${item.lvl}</span>
            <span class="text-muted tabular-nums">${hasCap ? `Plafond : ${item.cap}` : 'Plafond : à vérifier'}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${isMaxed ? 'progress-fill-success' : item.meta.type === 'dark_elixir' ? 'progress-fill-purple' : ''}" style="width:${hasCap ? pct : 100}%; opacity:${hasCap ? 1 : 0.35};"></div>
          </div>
        </div>
      `;
      gridEl.appendChild(card);
    });
  };

  renderGrid();

  // Événements
  explorerCard.querySelector('#army-search-input')?.addEventListener('input', (e) => {
    currentArmySearch = e.target.value.toLowerCase().trim();
    renderGrid();
  });

  explorerCard.querySelectorAll('.army-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      explorerCard.querySelectorAll('.army-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentArmyTab = btn.getAttribute('data-army-tab');
      renderGrid();
    });
  });

  animateVisualStats(container);
  ensureLiveTicker();
}
