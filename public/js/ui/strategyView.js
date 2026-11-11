/**
 * CoC Freemium Optimizer — Vue Stratégies d'Armée
 * Compositions tactiques visuelles par HDV avec état de préparation des troupes & plan étape par étape
 */

import { showToast } from '../app.js';
import { escapeHtml } from '../utils.js';
import { getUiIcon } from './icons.js';

const SVG_ICONS = {
  farm: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v20"></path><path d="M18 2v20"></path><path d="M6 12h12"></path></svg>`,
  gdc: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="20"></line><line x1="19" y1="21" x2="21" y2="19"></line></svg>`,
  rush: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
  noheroes: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`
};

const STRATEGIES_DATA = {
  farm: {
    id: 'farm',
    name: 'Farm & Pillage Massif (Super Gobelins)',
    iconKey: 'farm',
    difficulty: 'Facile',
    badgeClass: 'badge-success',
    requiredEntities: [
      { id: 4000002, label: 'Gobelin (Niv. 7+ pour Super)' },
      { id: 4000004, label: 'Sapeur' },
      { id: 26000003, label: 'Sort de Saut' },
      { id: 26000028, label: "Sort d'Invisibilité" }
    ],
    armyChips: ['80× Super Gobelins', '8× Sapeurs', '4× Gargouilles'],
    spellChips: ['4× Saut', "3× Invisibilité", '1× Rage (optionnel)'],
    siege: 'Non requis (ou Démolisseur de remparts)',
    clanCastle: 'Super Gobelins supplémentaires + Sort de Saut',
    steps: [
      'Posez 1 à 2 Super Gobelins sur chaque mine, extracteur et réserve à portée extérieure.',
      'Ouvrez les compartiments profonds avec un Sort de Saut ou vos Sapeurs.',
      "Envoyez une vague de 10 Super Gobelins vers l'Hôtel de Ville sous Sort d'Invisibilité pour sécuriser l'étoile."
    ]
  },
  gdc: {
    id: 'gdc',
    name: 'GDC 3 Étoiles (Sorcières & Golems)',
    iconKey: 'gdc',
    difficulty: 'Intermédiaire',
    badgeClass: 'badge-accent',
    requiredEntities: [
      { id: 4000024, label: 'Sorcière' },
      { id: 4000023, label: 'Golem' },
      { id: 26000010, label: 'Sort de Séisme' },
      { id: 26000002, label: 'Sort de Rage' }
    ],
    armyChips: ['3× Golems', '14× Sorcières', '4× Sorciers', '2× Archers'],
    spellChips: ['8× Séisme', '1× Rage', '1× Gel', '1× Poison'],
    siege: 'Lance-Bûches ou Démolisseur de remparts',
    clanCastle: 'Yéti + Valkyries + Sort de Rage',
    steps: [
      "Utilisez 4 Sorts de Séisme de chaque côté des défenses clés (Tours de l'Enfer) pour casser les compartiments centraux.",
      'Déployez les 3 Golems en ligne large suivis des Sorcières et du Lance-Bûches droit sur le cœur.',
      "Activez la capacité du Grand Gardien dès que l'armée encaisse les tirs de l'Aigle Artilleur et des Tours de l'Enfer."
    ]
  },
  rush: {
    id: 'rush',
    name: 'Rush Trophées (Zap Dragons)',
    iconKey: 'rush',
    difficulty: 'Facile',
    badgeClass: 'badge-warning',
    requiredEntities: [
      { id: 4000008, label: 'Dragon' },
      { id: 4000005, label: 'Ballon' },
      { id: 26000000, label: 'Sort de Foudre' },
      { id: 26000005, label: 'Sort de Gel' }
    ],
    armyChips: ['11× Dragons', '8× Ballons'],
    spellChips: ['9× Foudre', '1× Rage', '1× Gel'],
    siege: 'Dirigeable de combat ou Lance-Bûches',
    clanCastle: 'Ballons ou Dragon Électrique + Sort de Gel',
    steps: [
      'Détruisez 3 Défenses Anti-Aériennes avec vos Sorts de Foudre (en touchant idéalement un Propulseur ou Arc-X proche).',
      'Posez un Dragon à chaque extrémité pour nettoyer les angles, puis déployez le gros des Dragons et Ballons en arc.',
      "Envoyez vos Héros nettoyer l'extérieur ou sécuriser le pourcentage vers les 3 étoiles."
    ]
  },
  noheroes: {
    id: 'noheroes',
    name: 'Sans Héros (Période d’Amélioration)',
    iconKey: 'noheroes',
    difficulty: 'Accessible',
    badgeClass: 'badge-purple',
    requiredEntities: [
      { id: 4000010, label: 'Bébé Dragon' },
      { id: 4000005, label: 'Ballon' },
      { id: 26000000, label: 'Sort de Foudre' }
    ],
    armyChips: ['18× Bébés Dragons', '12× Ballons', '8× Gargouilles'],
    spellChips: ['9× Foudre', '1× Rage'],
    siege: 'Dirigeable de combat (vers HDV)',
    clanCastle: 'Ballons ou Super Gobelins pour l’HDV',
    steps: [
      "Neutralisez 2 à 3 Défenses Anti-Aériennes exposées avec vos Sorts de Foudre avant de déployer.",
      'Espaciez chaque Bébé Dragon tout autour du village pour qu’ils conservent leur bonus Enragé individuel.',
      'Envoyez le Dirigeable vers l’Hôtel de Ville sous Sort de Rage si nécessaire pour sécuriser 2 étoiles faciles.'
    ]
  }
};

let currentTab = 'farm';

export function renderStrategyView(container, analysis) {
  if (!container) return;
  container.innerHTML = '';

  const thLevel = analysis?.thLevel || 11;

  // Map rapide des niveaux de troupes et sorts possédés
  const ownedLevels = {};
  (analysis?.rawData?.units || []).forEach(u => { ownedLevels[u.data] = u.lvl; });
  (analysis?.rawData?.spells || []).forEach(s => { ownedLevels[s.data] = s.lvl; });

  const card = document.createElement('div');
  card.className = 'card space-y-4';

  card.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-subtle gap-3">
      <div>
        <h3 class="text-sm sm:text-base font-bold">Compositions Stratégiques — HDV ${thLevel}</h3>
        <p class="text-2xs text-secondary mt-0.5">Sélectionnez un style de jeu pour vérifier l'état de vos troupes et voir le plan d'attaque</p>
      </div>
      <button id="btn-copy-strategy" class="btn btn-sm btn-secondary self-start sm:self-auto">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span id="copy-strategy-label">Copier la compo</span>
      </button>
    </div>

    <!-- Sélecteur d'onglets -->
    <div class="segmented-control" id="strategy-segmented-control" role="tablist">
      <button class="segmented-item ${currentTab === 'farm' ? 'active' : ''}" data-strat="farm">
        ${SVG_ICONS.farm}
        <span>Farm & Pillage</span>
      </button>
      <button class="segmented-item ${currentTab === 'gdc' ? 'active' : ''}" data-strat="gdc">
        ${SVG_ICONS.gdc}
        <span>GDC (3★)</span>
      </button>
      <button class="segmented-item ${currentTab === 'rush' ? 'active' : ''}" data-strat="rush">
        ${SVG_ICONS.rush}
        <span>Rush Trophées</span>
      </button>
      <button class="segmented-item ${currentTab === 'noheroes' ? 'active' : ''}" data-strat="noheroes">
        ${SVG_ICONS.noheroes}
        <span>Sans Héros</span>
      </button>
    </div>

    <div id="strategy-details-container"></div>
  `;
  container.appendChild(card);

  const detailsContainer = card.querySelector('#strategy-details-container');
  renderStrategyDetails(detailsContainer, currentTab, ownedLevels);

  const tabBtns = card.querySelectorAll('.segmented-item');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.getAttribute('data-strat');
      renderStrategyDetails(detailsContainer, currentTab, ownedLevels);
    });
  });

  const copyBtn = card.querySelector('#btn-copy-strategy');
  const copyLabel = card.querySelector('#copy-strategy-label');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const strat = STRATEGIES_DATA[currentTab];
      const textToCopy = `[CoC Optimizer - HDV ${thLevel}] ${strat.name}\n• Troupes : ${strat.armyChips.join(', ')}\n• Sorts : ${strat.spellChips.join(', ')}\n• Engin : ${strat.siege}\n• CDC : ${strat.clanCastle}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        if (copyLabel) copyLabel.textContent = 'Copié !';
        copyBtn.classList.add('border-accent');
        showToast('Composition copiée dans le presse-papier !', 'success');
        setTimeout(() => {
          if (copyLabel) copyLabel.textContent = 'Copier la compo';
          copyBtn.classList.remove('border-accent');
        }, 1800);
      }).catch(() => {
        showToast('Échec de la copie automatique', 'error');
      });
    });
  }
}

function renderStrategyDetails(container, stratKey, ownedLevels) {
  if (!container) return;
  const strat = STRATEGIES_DATA[stratKey] || STRATEGIES_DATA.farm;

  const readinessBadges = strat.requiredEntities.map(req => {
    const lvl = ownedLevels[req.id];
    if (lvl === undefined) {
      return `<span class="badge badge-neutral">${escapeHtml(req.label)} : non débloqué</span>`;
    }
    return `<span class="badge badge-success tabular-nums">${getUiIcon('check', 11)} ${escapeHtml(req.label)} : Niv. ${lvl}</span>`;
  }).join('');

  const armyPillsHtml = strat.armyChips.map(c => `<span class="badge badge-accent">${escapeHtml(c)}</span>`).join('');
  const spellPillsHtml = strat.spellChips.map(c => `<span class="badge badge-purple">${escapeHtml(c)}</span>`).join('');

  const stepsHtml = strat.steps.map((step, i) => `
    <div class="flex items-start gap-3 p-3 rounded-xl bg-sunken border border-subtle">
      <div class="flex items-center justify-center flex-shrink-0 font-bold text-xs tabular-nums" style="width:26px;height:26px;border-radius:9999px;background-color:var(--accent-subtle);color:var(--accent);border:1px solid var(--accent-border);">
        ${i + 1}
      </div>
      <p class="text-xs text-primary leading-relaxed">${escapeHtml(step)}</p>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-subtle">
        <div class="flex items-center gap-2">
          <div class="text-accent">${SVG_ICONS[strat.iconKey]}</div>
          <h4 class="text-sm sm:text-base font-bold text-primary">${escapeHtml(strat.name)}</h4>
        </div>
        <span class="badge ${strat.badgeClass}">Difficulté : ${escapeHtml(strat.difficulty)}</span>
      </div>

      <!-- Vos niveaux actuels pour cette compo -->
      <div class="p-3 rounded-xl bg-sunken border border-subtle space-y-2">
        <div class="text-2xs uppercase tracking-wider font-semibold text-muted">Préparation de votre Laboratoire</div>
        <div class="flex flex-wrap gap-1.5">
          ${readinessBadges}
        </div>
      </div>

      <div class="grid-2col gap-3">
        <div class="p-3.5 bg-sunken rounded-xl border border-subtle space-y-2">
          <div class="text-muted font-semibold text-2xs uppercase tracking-wider">Troupes à former</div>
          <div class="flex flex-wrap gap-1.5">${armyPillsHtml}</div>
        </div>
        <div class="p-3.5 bg-sunken rounded-xl border border-subtle space-y-2">
          <div class="text-muted font-semibold text-2xs uppercase tracking-wider">Sorts & Flacons</div>
          <div class="flex flex-wrap gap-1.5">${spellPillsHtml}</div>
        </div>
        <div class="p-3 bg-sunken rounded-xl border border-subtle">
          <div class="text-muted font-semibold text-2xs uppercase tracking-wider">Engin de Siège</div>
          <div class="text-xs font-medium text-primary mt-1">${escapeHtml(strat.siege)}</div>
        </div>
        <div class="p-3 bg-sunken rounded-xl border border-subtle">
          <div class="text-muted font-semibold text-2xs uppercase tracking-wider">Château de Clan (Renforts)</div>
          <div class="text-xs font-medium text-primary mt-1">${escapeHtml(strat.clanCastle)}</div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-xs font-semibold uppercase tracking-wider text-muted">Déploiement étape par étape</div>
        <div class="space-y-2">${stepsHtml}</div>
      </div>
    </div>
  `;
}
