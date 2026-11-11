/**
 * CoC Freemium Optimizer — Vue Laboratoire & Armée
 * Affiche la progression des troupes, sorts et engins de siège
 */

import { decodeUnit, decodeSpell } from '../coc_data.js';

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

  const thLevel = analysis.thLevel || 11;
  const thCaps = capsData?.townhalls?.[String(thLevel)] || {};
  const capsUnits = thCaps.units || {};
  const capsSpells = thCaps.spells || {};

  // 1. Synthèse du Laboratoire
  const summaryCard = document.createElement('div');
  summaryCard.className = 'card card-hero mb-4';

  const labUpgrades = analysis.builders?.labUpgrades || [];
  const activeLab = labUpgrades[0] || null;

  let labActiveHtml = '';
  if (activeLab) {
    const meta = decodeUnit(activeLab.id) || decodeSpell(activeLab.id);
    labActiveHtml = `
      <div class="mt-3 p-3 bg-sunken rounded-lg border border-subtle flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-lg">${meta.icon || '🔬'}</span>
          <div>
            <div class="text-xs font-semibold text-primary">Recherche en cours : ${meta.name} (Niv. ${activeLab.targetLevel})</div>
            <div class="text-2xs text-muted">Assistant Labo actif : +${analysis.helpers?.labHelperHours || 0}h/j</div>
          </div>
        </div>
        <span class="badge badge-accent tabular-nums">En cours</span>
      </div>
    `;
  }

  summaryCard.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-subtle gap-2">
      <div>
        <h3 class="text-base font-semibold">Laboratoire & Recherches</h3>
        <p class="text-xs text-secondary mt-0.5">Plafonds d'amélioration pour l'Hôtel de Ville ${thLevel}</p>
      </div>
      <span class="badge ${analysis.army?.completionPct >= 80 ? 'badge-success' : 'badge-accent'}">
        <span class="badge-dot"></span>
        <span class="tabular-nums font-semibold">${analysis.army?.completionPct || 0}% de maxage</span>
      </span>
    </div>
    <div class="progress-track progress-track-lg mt-3">
      <div class="progress-fill ${analysis.army?.completionPct >= 80 ? 'progress-fill-success' : ''}" style="width: ${analysis.army?.completionPct || 0}%"></div>
    </div>
    ${labActiveHtml}
  `;
  container.appendChild(summaryCard);

  // 2. Grilles Troupes & Sorts
  const armyGrid = document.createElement('div');
  armyGrid.className = 'grid-2col';

  // Colonne Troupes
  const unitsSection = document.createElement('div');
  unitsSection.className = 'card';
  unitsSection.innerHTML = `
    <h3 class="text-sm font-semibold pb-2 border-b border-subtle">Troupes</h3>
    <div id="units-list-container" class="space-y-2 mt-3 max-h-[500px] overflow-y-auto pr-1">
      <!-- Injecté dynamiquement -->
    </div>
  `;
  armyGrid.appendChild(unitsSection);

  // Colonne Sorts
  const spellsSection = document.createElement('div');
  spellsSection.className = 'card';
  spellsSection.innerHTML = `
    <h3 class="text-sm font-semibold pb-2 border-b border-subtle">Sorts</h3>
    <div id="spells-list-container" class="space-y-2 mt-3 max-h-[500px] overflow-y-auto pr-1">
      <!-- Injecté dynamiquement -->
    </div>
  `;
  armyGrid.appendChild(spellsSection);

  container.appendChild(armyGrid);

  // Rendu des listes
  const unitsListEl = unitsSection.querySelector('#units-list-container');
  const spellsListEl = spellsSection.querySelector('#spells-list-container');

  renderArmyEntities(unitsListEl, analysis.rawData?.units || [], capsUnits, decodeUnit);
  renderArmyEntities(spellsListEl, analysis.rawData?.spells || [], capsSpells, decodeSpell);
}

function renderArmyEntities(container, rawList, capsMap, decodeFn) {
  if (!container) return;
  container.innerHTML = '';

  rawList.forEach(item => {
    if (!item) return;
    const meta = decodeFn(item.data);
    const lvl = Number(item.lvl) || 1;
    const cap = capsMap[item.data] || lvl;
    const isMaxed = lvl >= cap;

    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-2 rounded-lg bg-sunken border border-subtle text-xs';
    row.innerHTML = `
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-base flex-shrink-0">${meta.icon || '⚔️'}</span>
        <div class="min-w-0">
          <div class="font-medium text-primary truncate">${meta.name}</div>
          <div class="text-2xs text-muted tabular-nums">Plafond : Niv. ${cap}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="tabular-nums font-semibold ${isMaxed ? 'text-success' : 'text-primary'}">Niv. ${lvl}</span>
        ${isMaxed ? '<span class="badge badge-success">Max</span>' : ''}
      </div>
    `;
    container.appendChild(row);
  });
}
