/**
 * CoC Freemium Optimizer — Vue Héros & Équipements
 * Cartes héros avec blasons SVG vectoriels, auras identitaires, anneaux radiaux et paliers ×3 visuels
 */

import { decodeEntity, decodeHero } from '../coc_data.js';
import {
  escapeHtml,
  formatDuration,
  formatCompactResource,
  createRadialRingSvg,
  animateVisualStats,
  ensureLiveTicker
} from '../utils.js';
import { getHeroPortraitSvg, getUiIcon } from './icons.js';

let currentEquipFilter = 'all';

export function renderHeroesView(container, analysis, capsData) {
  if (!container) return;
  container.innerHTML = '';

  if (!analysis || !analysis.success || !analysis.heroes) {
    container.innerHTML = `
      <div class="card card-warning p-4">
        <p class="text-xs text-secondary">Données sur les héros non disponibles.</p>
      </div>
    `;
    return;
  }

  const heroes = analysis.heroes;
  const thLevel = analysis.thLevel || 11;
  const nowOrigin = Date.now();

  // Timers actifs sur les héros
  const heroTimers = {};
  (analysis.builders?.activeUpgrades || []).forEach(u => {
    if (u.type === 'hero') heroTimers[u.id] = u;
  });

  // 1. Bannière Force Cumulée des Héros avec Anneau Radial
  const ringColor = heroes.globalHeroIndex >= 90
    ? 'var(--color-success)'
    : heroes.globalHeroIndex < 65
      ? 'var(--color-danger)'
      : 'var(--accent)';

  const summaryCard = document.createElement('div');
  summaryCard.className = 'card card-hero p-5 mb-4';
  summaryCard.innerHTML = `
    <div class="home-hero-layout">
      <div class="home-hero-left">
        ${createRadialRingSvg({
          pct: heroes.globalHeroIndex,
          size: 92,
          stroke: 8,
          color: ringColor,
          centerValue: `${heroes.globalHeroIndex}%`,
          centerSub: 'Héros',
          valueSize: '18px'
        })}
        <div class="space-y-1.5 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold">Force Cumulée des Héros</h3>
            <span class="badge ${heroes.isHealthyForNextTh ? 'badge-success' : 'badge-warning'}">
              ${heroes.isHealthyForNextTh ? `Prêt HDV ${thLevel + 1}` : `Objectif sain : ${heroes.healthyThreshold} niv.`}
            </span>
          </div>
          <p class="text-xs text-secondary">
            Total actuel : <strong class="text-primary tabular-nums">${heroes.totalCurrent} / ${heroes.totalMax}</strong> niveaux cumulés à l'HDV ${thLevel}.
          </p>
          <p class="text-2xs text-muted">
            ${heroes.isHealthyForNextTh
              ? 'Votre retard héros est comblé pour passer sereinement à l\'HDV suivant.'
              : `Il reste ${Math.max(0, heroes.healthyThreshold - heroes.totalCurrent)} niveaux à monter pour franchir le seuil sain des 90 %.`}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-4 relative">
      <div class="flex justify-between text-2xs text-muted mb-1">
        <span>0 %</span>
        <span class="font-semibold text-primary">Seuil sain 90 % (${heroes.healthyThreshold} niv.)</span>
        <span>100 %</span>
      </div>
      <div class="progress-track progress-track-lg">
        <div class="progress-fill ${heroes.globalHeroIndex >= 90 ? 'progress-fill-success' : heroes.globalHeroIndex < 65 ? 'progress-fill-danger' : ''}" style="width: ${heroes.globalHeroIndex}%"></div>
      </div>
    </div>
  `;
  container.appendChild(summaryCard);

  // 2. Grille des Héros débloqués à cet HDV
  const heroesGrid = document.createElement('div');
  heroesGrid.className = 'grid-2col mb-6';

  const heroColorVar = {
    king: 'var(--hero-king)',
    queen: 'var(--hero-queen)',
    warden: 'var(--hero-warden)',
    minion_prince: 'var(--hero-prince)',
    champion: 'var(--hero-champion)'
  };

  const heroKeys = ['king', 'queen', 'warden', 'minion_prince', 'champion'];
  heroKeys.forEach(k => {
    const h = heroes.items[k];
    if (!h) return;

    const meta = decodeHero(h.id);
    const activeTimer = heroTimers[h.id];
    const heroCard = document.createElement('div');
    heroCard.className = `card hero-card hero-card-${k} p-4 flex flex-col justify-between gap-3`;

    const statusBadge = h.deficit === 0
      ? '<span class="badge badge-success"><span class="badge-dot"></span><span>Maxé</span></span>'
      : h.progressPct >= 80
        ? '<span class="badge badge-accent"><span class="badge-dot"></span><span>Dans les temps</span></span>'
        : `<span class="badge badge-danger"><span class="badge-dot"></span><span>-${h.deficit} niv.</span></span>`;

    heroCard.innerHTML = `
      <div class="flex items-start justify-between gap-3 pb-2 border-b border-subtle">
        <div class="flex items-center gap-3 min-w-0">
          <div class="hero-crest-frame hero-crest-${k}" aria-hidden="true">
            ${getHeroPortraitSvg(k)}
          </div>
          <div class="min-w-0">
            <h4 class="text-sm font-bold text-primary truncate">${escapeHtml(h.name)}</h4>
            <p class="text-2xs text-muted tabular-nums">Plafond HDV ${thLevel} : Niv. ${h.maxLevel}</p>
          </div>
        </div>
        ${statusBadge}
      </div>

      ${activeTimer ? `
        <div class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-sunken border border-subtle text-2xs">
          <span class="text-accent font-semibold">En cours → Niv. ${activeTimer.targetLevel + 1}</span>
          <span class="timer-pill" style="padding:2px 8px;">
            ${getUiIcon('clock', 11)}
            <span data-timer-seconds="${activeTimer.remainingSeconds}" data-timer-origin="${nowOrigin}">${formatDuration(activeTimer.remainingSeconds)}</span>
          </span>
        </div>
      ` : ''}

      <div class="space-y-1.5">
        <div class="flex justify-between items-baseline text-xs">
          <span class="font-bold tabular-nums text-primary text-sm">Niveau ${h.level} <span class="text-muted font-normal text-xs">/ ${h.maxLevel}</span></span>
          <span class="tabular-nums font-semibold" style="color:${heroColorVar[k]};">${h.progressPct}%</span>
        </div>
        <div class="progress-track progress-track-lg">
          <div class="progress-fill" style="width:${h.progressPct}%; background:${heroColorVar[k]};"></div>
        </div>
      </div>

      <div class="pt-2 border-t border-subtle flex flex-wrap items-center justify-between gap-2 text-2xs text-muted">
        <span>Coût restant estimé : <strong class="text-primary tabular-nums">${h.resourceNeeded > 0 ? `${formatCompactResource(h.resourceNeeded)} ${h.resourceType === 'dark_elixir' ? 'Élixir Noir' : 'Élixir'}` : 'Maxé'}</strong></span>
        <span class="tabular-nums">${h.daysNeeded > 0 ? `~${h.daysNeeded} j cumulés` : 'Complet'}${!h.verified ? ' (à vérifier)' : ''}</span>
      </div>
    `;
    heroesGrid.appendChild(heroCard);
  });
  container.appendChild(heroesGrid);

  // 3. Section Équipements de Héros & Paliers multiples de 3
  const equipSection = document.createElement('div');
  equipSection.className = 'card space-y-4';
  const quickWinsTotal = analysis.equipment?.quickWinsCount || 0;

  equipSection.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-subtle gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-sm sm:text-base font-semibold">Équipements & Paliers Clés (×3)</h3>
          ${quickWinsTotal > 0 ? `<span class="badge badge-warning">${quickWinsTotal} Quick Win${quickWinsTotal > 1 ? 's' : ''}</span>` : ''}
        </div>
        <p class="text-2xs text-secondary mt-0.5">Bonus majeurs débloqués aux niveaux 3, 6, 9, 12, 15, 18</p>
      </div>
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1" id="equip-hero-filter">
        <button class="btn btn-sm ${currentEquipFilter === 'all' ? 'btn-secondary active' : 'btn-ghost'} equip-filter-btn" data-filter="all">Tous</button>
        <button class="btn btn-sm ${currentEquipFilter === 'quick-wins' ? 'btn-secondary active' : 'btn-ghost'} equip-filter-btn" data-filter="quick-wins">Quick Wins</button>
        <button class="btn btn-sm ${currentEquipFilter === 'epic' ? 'btn-secondary active' : 'btn-ghost'} equip-filter-btn" data-filter="epic">Épiques</button>
        <button class="btn btn-sm ${currentEquipFilter === 'Roi' ? 'btn-secondary active' : 'btn-ghost'} equip-filter-btn" data-filter="Roi">Roi</button>
        <button class="btn btn-sm ${currentEquipFilter === 'Reine' ? 'btn-secondary active' : 'btn-ghost'} equip-filter-btn" data-filter="Reine">Reine</button>
        <button class="btn btn-sm ${currentEquipFilter === 'Gardien' ? 'btn-secondary active' : 'btn-ghost'} equip-filter-btn" data-filter="Gardien">Gardien</button>
        <button class="btn btn-sm ${currentEquipFilter === 'Prince' ? 'btn-secondary active' : 'btn-ghost'} equip-filter-btn" data-filter="Prince">Prince</button>
      </div>
    </div>
    <div id="equip-items-grid" class="grid-cards-auto">
      <!-- Injecté dynamiquement -->
    </div>
  `;
  container.appendChild(equipSection);

  const equipGrid = equipSection.querySelector('#equip-items-grid');
  renderEquipmentItems(equipGrid, analysis.rawData?.equipment || [], currentEquipFilter);

  const equipFilterBtns = equipSection.querySelectorAll('.equip-filter-btn');
  equipFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      equipFilterBtns.forEach(b => {
        b.classList.remove('btn-secondary', 'active');
        b.classList.add('btn-ghost');
      });
      btn.classList.add('btn-secondary', 'active');
      btn.classList.remove('btn-ghost');

      currentEquipFilter = btn.getAttribute('data-filter');
      renderEquipmentItems(equipGrid, analysis.rawData?.equipment || [], currentEquipFilter);
    });
  });

  animateVisualStats(container);
  ensureLiveTicker();
}

function renderEquipmentItems(gridContainer, rawEquipList, filter) {
  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  const enriched = rawEquipList
    .filter(Boolean)
    .map(eq => {
      const meta = decodeEntity(eq.data);
      const lvl = Number(eq.lvl) || 1;
      const mod = lvl % 3;
      const isQuickWin = (mod === 2);
      const nextKey = lvl + (mod === 0 ? 3 : (3 - mod));
      return { eq, meta, lvl, mod, isQuickWin, nextKey };
    })
    .filter(item => {
      if (filter === 'quick-wins') return item.isQuickWin;
      if (filter === 'epic') return item.meta.rarity === 'epic';
      if (filter !== 'all') return item.meta.hero === filter;
      return true;
    })
    // Trie Quick Wins d'abord, puis niveau décroissant
    .sort((a, b) => {
      if (a.isQuickWin !== b.isQuickWin) return a.isQuickWin ? -1 : 1;
      return b.lvl - a.lvl;
    });

  if (enriched.length === 0) {
    gridContainer.innerHTML = `
      <p class="text-xs text-muted col-span-full py-4 text-center">Aucun équipement correspondant à ce filtre.</p>
    `;
    return;
  }

  enriched.forEach(({ meta, lvl, mod, isQuickWin, nextKey }) => {
    const isEpic = meta.rarity === 'epic';
    const card = document.createElement('div');
    card.className = `card card-interactive p-3.5 flex flex-col justify-between gap-2.5 ${isEpic ? 'equip-card-epic' : ''} ${isQuickWin ? 'equip-card-quickwin' : ''}`;

    const rarityBadge = isEpic
      ? '<span class="badge badge-purple">Épique</span>'
      : '<span class="badge badge-neutral">Commun</span>';

    // 3 pips montrant la progression dans le palier ×3 courant
    const filledCount = mod === 0 ? 3 : mod;
    const pipsHtml = [1, 2, 3].map(idx => {
      if (idx <= filledCount) {
        return `<span class="milestone-pip ${isQuickWin && idx === 2 ? 'is-next' : 'is-filled'}"></span>`;
      }
      return `<span class="milestone-pip"></span>`;
    }).join('');

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="entity-icon-box ${isEpic ? 'entity-icon-dark_elixir' : ''}">${getUiIcon('equipment', 17)}</div>
          <div class="min-w-0">
            <h4 class="text-xs font-semibold truncate text-primary">${escapeHtml(meta.name)}</h4>
            <span class="text-2xs text-muted">${escapeHtml(meta.hero || 'Héros')}${meta.topTier ? ' • Méta' : ''}</span>
          </div>
        </div>
        ${rarityBadge}
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-subtle text-2xs">
        <div class="flex items-center gap-2">
          <span class="tabular-nums font-bold text-primary text-xs">Niv. ${lvl}</span>
          <div class="milestone-pips" title="Progression vers palier Niv. ${nextKey}">
            ${pipsHtml}
          </div>
        </div>
        ${isQuickWin
          ? `<span class="badge badge-warning"><span class="pulse-dot" style="width:5px;height:5px;"></span><span>→ Niv. ${nextKey}</span></span>`
          : `<span class="text-muted tabular-nums">Palier : ${nextKey}</span>`}
      </div>
    `;
    gridContainer.appendChild(card);
  });
}
