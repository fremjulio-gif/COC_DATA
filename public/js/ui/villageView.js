/**
 * CoC Freemium Optimizer — Vue Village
 * Affiche l'inventaire complet des bâtiments, défenses, ressources, pièges et remparts
 */

import { decodeBuilding, decodeTrap, decodeEntity } from '../coc_data.js';

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

  // 1. Synthèse Remparts & Crafted Defense
  const summaryRow = document.createElement('div');
  summaryRow.className = 'grid-2col mb-4';

  // Carte Remparts
  const wallsCard = document.createElement('div');
  wallsCard.className = 'card';
  const walls = analysis.walls;
  wallsCard.innerHTML = `
    <div class="flex items-center justify-between pb-2 border-b border-subtle">
      <div>
        <h3 class="text-sm font-semibold">Remparts</h3>
        <p class="text-2xs text-secondary mt-0.5">Plafond HDV ${thLevel} : Niv. ${walls.maxWallLevel}</p>
      </div>
      <span class="badge ${walls.status === 'maxed' ? 'badge-success' : walls.status === 'ontrack' ? 'badge-accent' : 'badge-warning'}">
        <span class="badge-dot"></span>
        <span>${walls.completionPct}% Niv. ${walls.maxWallLevel}</span>
      </span>
    </div>
    <div class="progress-track mt-3">
      <div class="progress-fill ${walls.completionPct >= 90 ? 'progress-fill-success' : ''}" style="width: ${walls.completionPct}%"></div>
    </div>
    <div class="flex justify-between text-2xs text-secondary mt-2">
      <span>${walls.maxedWallsCount} / ${walls.totalWalls} murs maxés</span>
      <span>${walls.remainingToMax} restants</span>
    </div>
    <div class="mt-3 pt-2 border-t border-subtle flex justify-between text-2xs">
      <span class="text-muted">Coût restant estimé :</span>
      <span class="tabular-nums font-medium text-primary">${(walls.totalCostRemaining / 1000000).toFixed(1)} M Or / Élixir</span>
    </div>
  `;
  summaryRow.appendChild(wallsCard);

  // Carte Station d'Artisanat Défensif (v18.600.5)
  const craftedCard = document.createElement('div');
  craftedCard.className = 'card';
  const crafted = analysis.craftedDefense;
  if (crafted && Array.isArray(crafted.types) && crafted.types.length > 0) {
    const activeType = crafted.activeType || crafted.types[0];
    let modulesHtml = '';
    activeType.modules.forEach(m => {
      modulesHtml += `
        <div class="flex items-center justify-between py-1 border-b border-subtle text-2xs">
          <span class="text-secondary">${m.name}</span>
          <span class="tabular-nums font-medium text-primary">Niv. ${m.level} / ${m.maxLevel}</span>
        </div>
      `;
    });

    craftedCard.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-subtle">
        <div>
          <h3 class="text-sm font-semibold">Station d'Artisanat</h3>
          <p class="text-2xs text-secondary mt-0.5">v18.600.5 • 3 configurations modulaires</p>
        </div>
        <span class="badge badge-accent">
          <span class="badge-dot"></span>
          <span>${activeType.shortName}</span>
        </span>
      </div>
      <div class="mt-2.5">
        <div class="flex justify-between text-2xs text-muted mb-1">
          <span>Niveau modulaire cumulé</span>
          <span class="tabular-nums font-medium text-primary">${activeType.totalLevel} / ${activeType.maxLevel} (${activeType.completionPct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${activeType.completionPct}%"></div>
        </div>
      </div>
      <div class="mt-3 space-y-1">
        ${modulesHtml}
      </div>
    `;
  } else {
    craftedCard.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-subtle">
        <h3 class="text-sm font-semibold">Station d'Artisanat</h3>
        <span class="badge badge-neutral">Non débloquée</span>
      </div>
      <p class="text-2xs text-muted mt-2">Disponible à partir de la mise à jour 18.x.</p>
    `;
  }
  summaryRow.appendChild(craftedCard);
  container.appendChild(summaryRow);

  // 2. Grille des Bâtiments & Défenses
  const buildingsSection = document.createElement('div');
  buildingsSection.className = 'card mt-4';
  buildingsSection.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-subtle gap-2">
      <div>
        <h3 class="text-sm font-semibold">Bâtiments & Défenses</h3>
        <p class="text-2xs text-secondary mt-0.5">Niveau actuel vs plafond autorisé à l'HDV ${thLevel}</p>
      </div>
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1" id="village-category-filter">
        <button class="btn btn-sm btn-secondary active category-btn" data-category="all">Tous</button>
        <button class="btn btn-sm btn-ghost category-btn" data-category="defense">Défenses</button>
        <button class="btn btn-sm btn-ghost category-btn" data-category="resource">Ressources</button>
        <button class="btn btn-sm btn-ghost category-btn" data-category="army">Armée</button>
      </div>
    </div>
    <div id="village-items-grid" class="grid-cards-auto mt-4">
      <!-- Items injectés ci-dessous -->
    </div>
  `;
  container.appendChild(buildingsSection);

  const itemsGrid = buildingsSection.querySelector('#village-items-grid');
  renderBuildingItems(itemsGrid, analysis.rawData?.buildings || [], capsBuildings, 'all');

  // Gestion des filtres de catégories
  const filterBtns = buildingsSection.querySelectorAll('.category-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('btn-secondary', 'active');
        b.classList.add('btn-ghost');
      });
      btn.classList.add('btn-secondary', 'active');
      btn.classList.remove('btn-ghost');

      const cat = btn.getAttribute('data-category');
      renderBuildingItems(itemsGrid, analysis.rawData?.buildings || [], capsBuildings, cat);
    });
  });
}

function renderBuildingItems(gridContainer, rawBuildings, capsBuildings, filterCategory) {
  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  const groups = {};
  rawBuildings.forEach(b => {
    if (!b || b.data === 1000010 || b.data === 1000097) return; // Murs et Crafted defense traités à part

    const id = b.data;
    if (!groups[id]) {
      groups[id] = {
        meta: decodeBuilding(id),
        entries: [],
        maxLevelInVillage: 0,
        minLevelInVillage: 999,
        totalCount: 0
      };
    }
    const count = Number(b.cnt) || 1;
    const lvl = Number(b.lvl) || 1;
    groups[id].entries.push({ level: lvl, count, timer: b.timer });
    groups[id].totalCount += count;
    if (lvl > groups[id].maxLevelInVillage) groups[id].maxLevelInVillage = lvl;
    if (lvl < groups[id].minLevelInVillage) groups[id].minLevelInVillage = lvl;
  });

  const sortedIds = Object.keys(groups).sort((a, b) => {
    return groups[a].meta.name.localeCompare(groups[b].meta.name);
  });

  let visibleCount = 0;

  sortedIds.forEach(id => {
    const item = groups[id];
    const cat = item.meta.category || 'other';
    if (filterCategory !== 'all' && cat !== filterCategory) return;

    visibleCount++;
    const cap = capsBuildings[id] || item.maxLevelInVillage;
    const isMaxed = item.minLevelInVillage >= cap;
    const isDelayed = (cap - item.minLevelInVillage) > 1;

    const progressPct = cap > 0 ? Math.min(100, Math.round((item.minLevelInVillage / cap) * 100)) : 100;

    const card = document.createElement('div');
    card.className = 'card card-interactive p-3 flex flex-col justify-between';

    const statusBadge = isMaxed
      ? '<span class="badge badge-success"><span class="badge-dot"></span><span>Maxé</span></span>'
      : isDelayed
        ? '<span class="badge badge-warning"><span class="badge-dot"></span><span>En retard</span></span>'
        : '<span class="badge badge-accent"><span class="badge-dot"></span><span>Dans les temps</span></span>';

    const levelDisplay = item.minLevelInVillage === item.maxLevelInVillage
      ? `Niv. ${item.minLevelInVillage}`
      : `Niv. ${item.minLevelInVillage} – ${item.maxLevelInVillage}`;

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between pb-1.5">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-base flex-shrink-0">${item.meta.icon || '🏛️'}</span>
            <div class="min-w-0">
              <h4 class="text-xs font-semibold truncate text-primary">${item.meta.name}</h4>
              <span class="text-2xs text-muted tabular-nums">${item.totalCount} exemplaire${item.totalCount > 1 ? 's' : ''}</span>
            </div>
          </div>
          ${statusBadge}
        </div>
        <div class="mt-2.5">
          <div class="flex justify-between text-2xs mb-1">
            <span class="text-secondary tabular-nums font-medium">${levelDisplay}</span>
            <span class="text-muted tabular-nums">Plafond : ${cap}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${isMaxed ? 'progress-fill-success' : ''}" style="width: ${progressPct}%"></div>
          </div>
        </div>
      </div>
    `;
    gridContainer.appendChild(card);
  });

  if (visibleCount === 0) {
    gridContainer.innerHTML = `
      <p class="text-2xs text-muted col-span-full py-4 text-center">Aucun élément dans cette catégorie.</p>
    `;
  }
}
