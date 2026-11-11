/**
 * CoC Freemium Optimizer — Vue Héros & Équipements
 * Affiche la matrice des 4 héros (dont Prince Gargouille) et les 12 équipements
 */

import { decodeEntity, decodeHero } from '../coc_data.js';

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

  // 1. Synthèse Force Globale des Héros
  const summaryCard = document.createElement('div');
  summaryCard.className = 'card card-hero mb-4';
  summaryCard.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-subtle gap-2">
      <div>
        <h3 class="text-base font-semibold">Force Cumulée des Héros</h3>
        <p class="text-xs text-secondary mt-0.5">Plafond total HDV ${thLevel} : ${heroes.totalMax} niveaux</p>
      </div>
      <span class="badge ${heroes.globalHeroIndex >= 90 ? 'badge-success' : heroes.globalHeroIndex >= 70 ? 'badge-accent' : 'badge-danger'}">
        <span class="badge-dot"></span>
        <span class="tabular-nums font-semibold">${heroes.globalHeroIndex}% (${heroes.totalCurrent} / ${heroes.totalMax})</span>
      </span>
    </div>
    <div class="progress-track progress-track-lg mt-3">
      <div class="progress-fill ${heroes.globalHeroIndex >= 90 ? 'progress-fill-success' : heroes.globalHeroIndex < 65 ? 'progress-fill-danger' : ''}" style="width: ${heroes.globalHeroIndex}%"></div>
    </div>
    <div class="flex flex-col sm:flex-row justify-between text-2xs text-secondary mt-2.5 gap-1">
      <span>Seuil de passage sain vers HDV ${thLevel + 1} : <strong class="tabular-nums text-primary">${heroes.healthyThreshold} niveaux (90%)</strong></span>
      <span>${heroes.isHealthyForNextTh ? 'Prêt pour l\'HDV supérieur' : 'Retard à combler avant de monter'}</span>
    </div>
  `;
  container.appendChild(summaryCard);

  // 2. Grille des 4 Héros
  const heroesGrid = document.createElement('div');
  heroesGrid.className = 'grid-2col mb-6';

  const heroKeys = ['king', 'queen', 'warden', 'minion_prince', 'champion'];
  heroKeys.forEach(k => {
    const h = heroes.items[k];
    if (!h) return;

    const meta = decodeHero(h.id);
    const heroCard = document.createElement('div');
    heroCard.className = 'card card-interactive p-4 flex flex-col justify-between';

    const statusBadge = h.deficit === 0
      ? '<span class="badge badge-success"><span class="badge-dot"></span><span>Maxé</span></span>'
      : h.progressPct >= 80
        ? '<span class="badge badge-accent"><span class="badge-dot"></span><span>Dans les temps</span></span>'
        : '<span class="badge badge-danger"><span class="badge-dot"></span><span>Retard (-' + h.deficit + ')</span></span>';

    heroCard.innerHTML = `
      <div>
        <div class="flex items-center justify-between pb-2 border-b border-subtle">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">${meta.icon || '🦸'}</span>
            <div>
              <h4 class="text-sm font-semibold text-primary">${h.name}</h4>
              <span class="text-2xs text-muted tabular-nums">Plafond HDV ${thLevel} : Niv. ${h.maxLevel}</span>
            </div>
          </div>
          ${statusBadge}
        </div>
        <div class="mt-3">
          <div class="flex justify-between text-xs mb-1">
            <span class="font-semibold tabular-nums text-primary">Niveau ${h.level}</span>
            <span class="tabular-nums text-secondary font-medium">${h.progressPct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${h.deficit === 0 ? 'progress-fill-success' : ''}" style="width: ${h.progressPct}%"></div>
          </div>
        </div>
      </div>
      <div class="mt-3 pt-2.5 border-t border-subtle flex justify-between text-2xs text-muted">
        <span>Ressource requise :</span>
        <span class="tabular-nums font-medium text-secondary">
          ${h.resourceNeeded > 0 ? (h.resourceNeeded / 1000).toLocaleString('fr-FR') + ' k ' + (h.resourceType === 'dark_elixir' ? 'Élixir Noir' : 'Élixir') : 'Aucune'}
        </span>
      </div>
    `;
    heroesGrid.appendChild(heroCard);
  });
  container.appendChild(heroesGrid);

  // 3. Section Équipements de Héros & Paliers multiples de 3
  const equipSection = document.createElement('div');
  equipSection.className = 'card';
  equipSection.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-subtle gap-2">
      <div>
        <h3 class="text-sm font-semibold">Équipements & Paliers Clés</h3>
        <p class="text-2xs text-secondary mt-0.5">Paliers d'aptitude majeurs tous les multiples de 3 (3, 6, 9, 12, 15, 18)</p>
      </div>
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1" id="equip-hero-filter">
        <button class="btn btn-sm btn-secondary active equip-filter-btn" data-filter="all">Tous</button>
        <button class="btn btn-sm btn-ghost equip-filter-btn" data-filter="quick-wins">Quick Wins</button>
        <button class="btn btn-sm btn-ghost equip-filter-btn" data-filter="Roi">Roi</button>
        <button class="btn btn-sm btn-ghost equip-filter-btn" data-filter="Reine">Reine</button>
        <button class="btn btn-sm btn-ghost equip-filter-btn" data-filter="Gardien">Gardien</button>
        <button class="btn btn-sm btn-ghost equip-filter-btn" data-filter="Prince">Prince</button>
      </div>
    </div>
    <div id="equip-items-grid" class="grid-cards-auto mt-4">
      <!-- Injecté dynamiquement -->
    </div>
  `;
  container.appendChild(equipSection);

  const equipGrid = equipSection.querySelector('#equip-items-grid');
  renderEquipmentItems(equipGrid, analysis.rawData?.equipment || [], 'all');

  const equipFilterBtns = equipSection.querySelectorAll('.equip-filter-btn');
  equipFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      equipFilterBtns.forEach(b => {
        b.classList.remove('btn-secondary', 'active');
        b.classList.add('btn-ghost');
      });
      btn.classList.add('btn-secondary', 'active');
      btn.classList.remove('btn-ghost');

      const filter = btn.getAttribute('data-filter');
      renderEquipmentItems(equipGrid, analysis.rawData?.equipment || [], filter);
    });
  });
}

function renderEquipmentItems(gridContainer, rawEquipList, filter) {
  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  let visibleCount = 0;

  rawEquipList.forEach(eq => {
    if (!eq) return;
    const meta = decodeEntity(eq.data);
    const lvl = Number(eq.lvl) || 1;
    const isQuickWin = (lvl % 3 === 2);
    const nextKey = lvl + (lvl % 3 === 0 ? 3 : (3 - (lvl % 3)));

    if (filter === 'quick-wins' && !isQuickWin) return;
    if (filter !== 'all' && filter !== 'quick-wins' && meta.hero !== filter) return;

    visibleCount++;
    const card = document.createElement('div');
    card.className = 'card card-interactive p-3 flex flex-col justify-between';

    const rarityBadge = meta.rarity === 'epic'
      ? '<span class="badge badge-accent">Épique</span>'
      : '<span class="badge badge-neutral">Commun</span>';

    const quickWinBadge = isQuickWin
      ? '<span class="badge badge-warning font-semibold">Quick Win (Niv. ' + nextKey + ')</span>'
      : '';

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between pb-1">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-base">${meta.icon || '⚙️'}</span>
            <div class="min-w-0">
              <h4 class="text-xs font-semibold truncate text-primary">${meta.name}</h4>
              <span class="text-2xs text-muted">${meta.hero || 'Héros'}</span>
            </div>
          </div>
          ${rarityBadge}
        </div>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-subtle text-2xs">
          <span class="tabular-nums font-semibold text-primary">Niveau ${lvl}</span>
          ${quickWinBadge || '<span class="text-muted tabular-nums">Prochain palier : ' + nextKey + '</span>'}
        </div>
      </div>
    `;
    gridContainer.appendChild(card);
  });

  if (visibleCount === 0) {
    gridContainer.innerHTML = `
      <p class="text-2xs text-muted col-span-full py-4 text-center">Aucun équipement correspondant à ce filtre.</p>
    `;
  }
}
