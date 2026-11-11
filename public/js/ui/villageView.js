/**
 * CoC Freemium Optimizer — Vue Village
 * Remparts segmentés, Station d'Artisanat interactive (3 modes), Bâtiments & Pièges filtrables/triables
 */

import { decodeBuilding, decodeTrap } from '../coc_data.js';
import {
  escapeHtml,
  formatDuration,
  createRadialRingSvg,
  animateVisualStats,
  ensureLiveTicker
} from '../utils.js';
import { getUiIcon, getCategoryIconBox } from './icons.js';

let selectedCraftedIdx = 0;
let currentFilterCategory = 'all';
let currentSortBy = 'lag';
let currentSearch = '';

export function renderVillageView(container, analysis, capsData) {
  if (!container) return;
  container.innerHTML = '';

  if (!analysis || !analysis.success) {
    container.innerHTML = `
      <div class="card card-warning p-4">
        <p class="text-xs text-secondary">Aucune donnée de village disponible. Veuillez importer un fichier village_state.json.</p>
      </div>
    `;
    return;
  }

  const thLevel = analysis.thLevel || 11;
  const thCaps = capsData?.townhalls?.[String(thLevel)] || {};
  const capsBuildings = thCaps.buildings || {};
  const nowOrigin = Date.now();

  // Map des timers actifs par building ID
  const activeTimersById = {};
  (analysis.builders?.activeUpgrades || []).forEach(upg => {
    if (upg.type === 'building') {
      if (!activeTimersById[upg.id]) activeTimersById[upg.id] = [];
      activeTimersById[upg.id].push(upg);
    }
  });

  // 1. Ligne Synthèse : Remparts + Station d'Artisanat Interactive
  const summaryRow = document.createElement('div');
  summaryRow.className = 'grid-2col mb-4';

  // --- Carte Remparts avec Anneau Radial & Barre Segmentée ---
  const wallsCard = document.createElement('div');
  wallsCard.className = 'card space-y-3';
  const walls = analysis.walls;
  const wallRing = createRadialRingSvg({
    pct: walls.completionPct,
    size: 72,
    stroke: 7,
    color: walls.completionPct >= 90 ? 'var(--color-success)' : 'var(--accent)',
    centerValue: `${Math.round(walls.completionPct)}%`,
    valueSize: '15px'
  });

  const sortedWallLvls = Object.keys(walls.countsByLevel || {}).sort((a, b) => Number(b) - Number(a));
  const segColors = ['var(--accent)', 'var(--color-warning)', 'var(--text-muted)', 'var(--border-strong)'];
  const stackedSegmentsHtml = sortedWallLvls.map((lvl, idx) => {
    const cnt = walls.countsByLevel[lvl];
    const pct = walls.totalWalls > 0 ? ((cnt / walls.totalWalls) * 100).toFixed(1) : 0;
    return `<div class="stacked-segment" style="width:${pct}%; background-color:${segColors[idx] || segColors[3]};" title="Niv. ${lvl} : ${cnt} murs (${pct}%)"></div>`;
  }).join('');

  const wallLegendHtml = sortedWallLvls.map((lvl, idx) => {
    const cnt = walls.countsByLevel[lvl];
    return `
      <span class="badge badge-neutral tabular-nums">
        <span class="badge-dot" style="background-color:${segColors[idx] || segColors[3]};"></span>
        <span>${cnt}× Niv. ${lvl}</span>
      </span>
    `;
  }).join('');

  wallsCard.innerHTML = `
    <div class="flex items-center justify-between gap-3 pb-2 border-b border-subtle">
      <div class="flex items-center gap-3">
        ${wallRing}
        <div>
          <h3 class="text-sm sm:text-base font-semibold">Remparts</h3>
          <p class="text-2xs text-secondary mt-0.5">Plafond HDV ${thLevel} : Niv. ${walls.maxWallLevel}</p>
          <p class="text-xs font-semibold tabular-nums text-primary mt-1">${walls.maxedWallsCount} / ${walls.totalWalls} maxés</p>
        </div>
      </div>
      <span class="badge ${walls.status === 'maxed' ? 'badge-success' : walls.status === 'ontrack' ? 'badge-accent' : 'badge-warning'}">
        ${walls.remainingToMax} restants
      </span>
    </div>
    <div class="stacked-bar" aria-label="Répartition des niveaux de remparts">
      ${stackedSegmentsHtml}
    </div>
    <div class="flex flex-wrap gap-1.5">
      ${wallLegendHtml}
    </div>
    <div class="pt-2 border-t border-subtle flex justify-between items-center text-2xs">
      <span class="text-muted">Coût total restant estimé :</span>
      <span class="tabular-nums font-semibold text-primary">
        ${(walls.totalCostRemaining / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M Or / Élixir
        ${walls.verified === false ? '<span class="text-warning ml-1">(à vérifier)</span>' : ''}
      </span>
    </div>
  `;
  summaryRow.appendChild(wallsCard);

  // --- Carte Station d'Artisanat Interactive (v18.600.5) ---
  const craftedCard = document.createElement('div');
  craftedCard.className = 'card space-y-3';
  const crafted = analysis.craftedDefense;

  if (crafted && Array.isArray(crafted.types) && crafted.types.length > 0) {
    if (selectedCraftedIdx >= crafted.types.length) selectedCraftedIdx = 0;

    const renderCraftedContent = () => {
      const activeType = crafted.types[selectedCraftedIdx] || crafted.types[0];
      const modeTabsHtml = crafted.types.map((t, idx) => `
        <button class="segmented-item crafted-tab-btn ${idx === selectedCraftedIdx ? 'active' : ''}" data-crafted-idx="${idx}">
          <span>${escapeHtml(t.shortName)}</span>
        </button>
      `).join('');

      const modulesHtml = activeType.modules.map(m => `
        <div class="p-2 rounded-lg bg-sunken border border-subtle space-y-1.5">
          <div class="flex items-center justify-between text-2xs">
            <span class="font-medium text-secondary">${escapeHtml(m.name)}</span>
            <span class="tabular-nums font-semibold text-primary">Niv. ${m.level} / ${m.maxLevel}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${m.progressPct >= 90 ? 'progress-fill-success' : 'progress-fill-purple'}" style="width:${m.progressPct}%"></div>
          </div>
        </div>
      `).join('');

      craftedCard.innerHTML = `
        <div class="flex items-center justify-between pb-2 border-b border-subtle gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            ${getCategoryIconBox('crafted')}
            <div class="min-w-0">
              <h3 class="text-sm sm:text-base font-semibold truncate">Station d'Artisanat</h3>
              <p class="text-2xs text-secondary truncate">Défense modulaire 3×3 (v18.600.5)</p>
            </div>
          </div>
          <span class="badge badge-purple tabular-nums">${activeType.totalLevel} / ${activeType.maxLevel}</span>
        </div>

        <div class="segmented-control" role="tablist" aria-label="Modes Station d'Artisanat">
          ${modeTabsHtml}
        </div>

        <p class="text-2xs text-secondary leading-relaxed">${escapeHtml(activeType.desc)}</p>

        <div class="space-y-2">
          ${modulesHtml}
        </div>
      `;

      craftedCard.querySelectorAll('.crafted-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedCraftedIdx = Number(btn.getAttribute('data-crafted-idx')) || 0;
          renderCraftedContent();
        });
      });
    };

    renderCraftedContent();
  } else {
    craftedCard.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-subtle">
        <div class="flex items-center gap-2.5">
          ${getCategoryIconBox('crafted')}
          <h3 class="text-sm font-semibold">Station d'Artisanat</h3>
        </div>
        <span class="badge badge-neutral">Non débloquée</span>
      </div>
      <p class="text-xs text-muted">Disponible à partir de l'Hôtel de Ville supérieur / v18.x.</p>
    `;
  }
  summaryRow.appendChild(craftedCard);
  container.appendChild(summaryRow);

  // 2. Explorateur de Bâtiments, Défenses & Pièges
  const buildingsSection = document.createElement('div');
  buildingsSection.className = 'card space-y-4';
  buildingsSection.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-subtle gap-3">
      <div>
        <h3 class="text-sm sm:text-base font-semibold">Inventaire du Village (HDV ${thLevel})</h3>
        <p class="text-2xs text-secondary mt-0.5">Niveau minimal actuel vs plafond autorisé à votre HDV</p>
      </div>
      <div class="flex items-center gap-2">
        <select id="village-sort-select" class="text-xs" aria-label="Trier les bâtiments" style="width:auto;min-height:36px;padding:4px 10px;">
          <option value="lag" ${currentSortBy === 'lag' ? 'selected' : ''}>Trier : Plus gros retard</option>
          <option value="level" ${currentSortBy === 'level' ? 'selected' : ''}>Trier : Niveau</option>
          <option value="name" ${currentSortBy === 'name' ? 'selected' : ''}>Trier : Alphabétique</option>
        </select>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center gap-2.5">
      <div class="flex-1">
        <input type="search" id="village-search-input" placeholder="Rechercher (Canon, Arc-X, Aigle, Bombe...)" value="${escapeHtml(currentSearch)}">
      </div>
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1" id="village-category-filter">
        <button class="btn btn-sm ${currentFilterCategory === 'all' ? 'btn-secondary active' : 'btn-ghost'} category-btn" data-category="all">Tous</button>
        <button class="btn btn-sm ${currentFilterCategory === 'defense' ? 'btn-secondary active' : 'btn-ghost'} category-btn" data-category="defense">Défenses</button>
        <button class="btn btn-sm ${currentFilterCategory === 'resource' ? 'btn-secondary active' : 'btn-ghost'} category-btn" data-category="resource">Ressources</button>
        <button class="btn btn-sm ${currentFilterCategory === 'army' ? 'btn-secondary active' : 'btn-ghost'} category-btn" data-category="army">Armée</button>
        <button class="btn btn-sm ${currentFilterCategory === 'trap' ? 'btn-secondary active' : 'btn-ghost'} category-btn" data-category="trap">Pièges</button>
      </div>
    </div>

    <div id="village-items-grid" class="grid-cards-auto">
      <!-- Items injectés -->
    </div>
  `;
  container.appendChild(buildingsSection);

  const itemsGrid = buildingsSection.querySelector('#village-items-grid');
  const redrawGrid = () => {
    renderVillageEntities(
      itemsGrid,
      analysis.rawData?.buildings || [],
      analysis.rawData?.traps || [],
      capsBuildings,
      activeTimersById,
      nowOrigin
    );
  };

  redrawGrid();

  // Événements
  buildingsSection.querySelector('#village-search-input')?.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    redrawGrid();
  });

  buildingsSection.querySelector('#village-sort-select')?.addEventListener('change', (e) => {
    currentSortBy = e.target.value;
    redrawGrid();
  });

  const filterBtns = buildingsSection.querySelectorAll('.category-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('btn-secondary', 'active');
        b.classList.add('btn-ghost');
      });
      btn.classList.add('btn-secondary', 'active');
      btn.classList.remove('btn-ghost');

      currentFilterCategory = btn.getAttribute('data-category');
      redrawGrid();
    });
  });

  animateVisualStats(container);
  ensureLiveTicker();
}

function renderVillageEntities(gridContainer, rawBuildings, rawTraps, capsBuildings, activeTimersById, nowOrigin) {
  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  const groups = {};

  // Bâtiments (hors Murs et Station d'Artisanat déjà mis en avant en haut)
  rawBuildings.forEach(b => {
    if (!b || b.data === 1000010 || b.data === 1000097) return;
    const id = b.data;
    if (!groups[id]) {
      const meta = decodeBuilding(id);
      groups[id] = {
        id,
        meta,
        category: meta.category || 'other',
        entries: [],
        maxLevelInVillage: 0,
        minLevelInVillage: 999,
        totalCount: 0,
        hasGearUp: false
      };
    }
    const count = Number(b.cnt) || 1;
    const lvl = Number(b.lvl) || 1;
    if (b.gear_up) groups[id].hasGearUp = true;
    groups[id].entries.push({ level: lvl, count, timer: b.timer });
    groups[id].totalCount += count;
    if (lvl > groups[id].maxLevelInVillage) groups[id].maxLevelInVillage = lvl;
    if (lvl < groups[id].minLevelInVillage) groups[id].minLevelInVillage = lvl;
  });

  // Pièges
  rawTraps.forEach(t => {
    if (!t) return;
    const id = t.data;
    if (!groups[id]) {
      const meta = decodeTrap(id);
      groups[id] = {
        id,
        meta,
        category: 'trap',
        entries: [],
        maxLevelInVillage: 0,
        minLevelInVillage: 999,
        totalCount: 0,
        hasGearUp: false
      };
    }
    const count = Number(t.cnt) || 1;
    const lvl = Number(t.lvl) || 1;
    groups[id].entries.push({ level: lvl, count, timer: t.timer });
    groups[id].totalCount += count;
    if (lvl > groups[id].maxLevelInVillage) groups[id].maxLevelInVillage = lvl;
    if (lvl < groups[id].minLevelInVillage) groups[id].minLevelInVillage = lvl;
  });

  // Calcul des retards et filtrage
  const itemsList = Object.values(groups).map(item => {
    const knownCap = capsBuildings[item.id] ?? null;
    const deficit = knownCap !== null ? Math.max(0, knownCap - item.minLevelInVillage) : -1;
    return { ...item, knownCap, deficit };
  }).filter(item => {
    if (currentFilterCategory !== 'all' && item.category !== currentFilterCategory) return false;
    if (currentSearch && !item.meta.name.toLowerCase().includes(currentSearch)) return false;
    return true;
  });

  // Tri
  itemsList.sort((a, b) => {
    if (currentSortBy === 'lag') {
      if (b.deficit !== a.deficit) return b.deficit - a.deficit;
      return a.meta.name.localeCompare(b.meta.name);
    }
    if (currentSortBy === 'level') {
      return b.minLevelInVillage - a.minLevelInVillage;
    }
    return a.meta.name.localeCompare(b.meta.name);
  });

  if (itemsList.length === 0) {
    gridContainer.innerHTML = `
      <p class="text-xs text-muted col-span-full py-4 text-center">Aucun élément ne correspond à votre recherche.</p>
    `;
    return;
  }

  itemsList.forEach(item => {
    const cap = item.knownCap;
    const hasVerifiedCap = cap !== null && cap > 0;
    const isMaxed = hasVerifiedCap && item.minLevelInVillage >= cap;
    const isDelayed = hasVerifiedCap && (cap - item.minLevelInVillage) > 1;
    const progressPct = hasVerifiedCap
      ? Math.min(100, Math.round((item.minLevelInVillage / cap) * 100))
      : 100;

    const activeTimers = activeTimersById[item.id] || [];
    const firstTimer = activeTimers[0] || null;

    const card = document.createElement('div');
    card.className = `card card-interactive p-3.5 flex flex-col justify-between gap-3 ${firstTimer ? 'card-accent' : ''}`;

    const statusBadge = !hasVerifiedCap
      ? '<span class="badge badge-neutral">À vérifier</span>'
      : isMaxed
        ? '<span class="badge badge-success"><span class="badge-dot"></span><span>Maxé</span></span>'
        : isDelayed
          ? `<span class="badge badge-warning"><span class="badge-dot"></span><span>-${cap - item.minLevelInVillage} niv.</span></span>`
          : '<span class="badge badge-accent"><span class="badge-dot"></span><span>À jour</span></span>';

    const levelDisplay = item.minLevelInVillage === item.maxLevelInVillage
      ? `Niv. ${item.minLevelInVillage}`
      : `Niv. ${item.minLevelInVillage}–${item.maxLevelInVillage}`;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          ${getCategoryIconBox(item.category)}
          <div class="min-w-0">
            <h4 class="text-xs font-semibold truncate text-primary">${escapeHtml(item.meta.name)}</h4>
            <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span class="text-2xs text-muted tabular-nums">${item.totalCount} ex.</span>
              ${item.hasGearUp ? '<span class="badge badge-purple">Modifié</span>' : ''}
            </div>
          </div>
        </div>
        ${statusBadge}
      </div>

      ${firstTimer ? `
        <div class="flex items-center justify-between px-2 py-1 rounded-lg bg-sunken border border-subtle text-2xs">
          <span class="text-accent font-semibold">En amélioration (${activeTimers.length})</span>
          <span class="font-mono font-semibold text-primary tabular-nums" data-timer-seconds="${firstTimer.remainingSeconds}" data-timer-origin="${nowOrigin}">${formatDuration(firstTimer.remainingSeconds)}</span>
        </div>
      ` : ''}

      <div>
        <div class="flex justify-between text-2xs mb-1.5">
          <span class="text-primary tabular-nums font-semibold">${levelDisplay}</span>
          <span class="text-muted tabular-nums">${hasVerifiedCap ? `Plafond : ${cap}` : 'Plafond : à vérifier'}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${!hasVerifiedCap ? '' : isMaxed ? 'progress-fill-success' : isDelayed ? 'progress-fill-warning' : ''}" style="width: ${hasVerifiedCap ? progressPct : 100}%; opacity: ${hasVerifiedCap ? 1 : 0.35};"></div>
        </div>
      </div>
    `;
    gridContainer.appendChild(card);
  });
}
