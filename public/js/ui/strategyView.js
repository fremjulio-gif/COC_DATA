/**
 * CoC Freemium Optimizer — Vue Stratégies d'Armée
 * Compositions tactiques adaptées au niveau d'HDV (Farm, GDC 3 étoiles, Rush, Sans Héros)
 * Style Apple Minimaliste avec icônes SVG fines (zéro emoji)
 */

import { showToast } from '../app.js';

const SVG_ICONS = {
  farm: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v20"></path><path d="M18 2v20"></path><path d="M6 12h12"></path></svg>`,
  gdc: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="20"></line><line x1="19" y1="21" x2="21" y2="19"></line></svg>`,
  rush: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
  noheroes: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`
};

const STRATEGIES_DATA = {
  farm: {
    id: "farm",
    name: "Farm & Pillage Massif",
    iconKey: "farm",
    difficulty: "Facile",
    armyUnits: "80x Super Gobelins, 8x Sapeurs, 4x Gargouilles",
    spells: "4x Sort de Saut, 3x Sort d'Invisibilité",
    siege: "Non requis (ou Démolisseur de remparts)",
    clanCastle: "Super Gobelins supplémentaires",
    plan: "1. Posez 1 à 2 Super Gobelins sur chaque extracteur et mine extérieure.<br>2. Ouvrez les compartiments internes avec un Sort de Saut ou les Sapeurs.<br>3. Envoyez une vague de 10 Super Gobelins vers l'Hôtel de Ville sous Sort d'Invisibilité pour sécuriser l'étoile et le butin."
  },
  gdc: {
    id: "gdc",
    name: "GDC 3 Étoiles (Sorcières & Golems)",
    iconKey: "gdc",
    difficulty: "Intermédiaire",
    armyUnits: "3x Golems, 14x Sorcières, 4x Sorciers, 2x Archers",
    spells: "8x Sort de Séisme, 1x Sort de Rage, 1x Sort de Gel, 1x Sort de Poison",
    siege: "Lance-Bûches ou Démolisseur",
    clanCastle: "Yéti + Valkyries + Sort de Rage",
    plan: "1. Utilisez 4 Séismes pour ouvrir le cœur du village adverse.<br>2. Déployez les Golems en ligne, suivis des Sorcières et du Lance-Bûches au centre.<br>3. Activez la capacité du Grand Gardien quand les troupes approchent de l'Aigle Artilleur."
  },
  rush: {
    id: "rush",
    name: "Rush Trophées (Zap Dragons)",
    iconKey: "rush",
    difficulty: "Facile",
    armyUnits: "11x Dragons, 8x Ballons",
    spells: "9x Sort de Foudre, 1x Sort de Rage, 1x Sort de Gel",
    siege: "Dirigeable de combat ou Lance-Bûches",
    clanCastle: "Ballons ou Dragon Électrique + Sort de Gel",
    plan: "1. Détruisez 3 défenses anti-aériennes adverses avec vos sorts de foudre.<br>2. Déployez vos Dragons en arc de cercle face à la dernière défense anti-aérienne.<br>3. Envoyez le Dirigeable et les héros vers l'Hôtel de Ville sous Rage pour assurer les 2 ou 3 étoiles."
  },
  noheroes: {
    id: "noheroes",
    name: "Sans Héros (Héros en Amélioration)",
    iconKey: "noheroes",
    difficulty: "Accessible",
    armyUnits: "18x Bébés Dragons, 12x Ballons, 8x Gargouilles",
    spells: "9x Sort de Foudre, 1x Sort de Rage",
    siege: "Dirigeable de combat",
    clanCastle: "Ballons ou Super Gobelins",
    plan: "1. Détruisez 2 ou 3 défenses anti-aériennes extérieures avec les Zaps.<br>2. Posez les Bébés Dragons un par un autour du village pour profiter de leur boost Enragé solo.<br>3. Sécurisez facilement 50 % de destruction et 1 à 2 étoiles sans aucun héros disponible."
  }
};

let currentTab = 'farm';

export function renderStrategyView(container, analysis) {
  if (!container) return;
  container.innerHTML = '';

  const thLevel = analysis?.thLevel || 11;

  const card = document.createElement('div');
  card.className = 'card space-y-4';

  card.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-subtle gap-2">
      <div>
        <h3 class="text-sm font-semibold">Compositions Stratégiques HDV ${thLevel}</h3>
        <p class="text-xs text-secondary mt-0.5">Compositions recommandées et adaptées aux mécaniques freemium</p>
      </div>
      <button id="btn-copy-strategy" class="btn btn-sm btn-secondary flex items-center gap-1.5 self-start sm:self-auto">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span id="copy-strategy-label">Copier la compo</span>
      </button>
    </div>

    <!-- Sélecteur d'onglets de stratégie -->
    <div class="segmented-control" id="strategy-segmented-control">
      <button class="segmented-item ${currentTab === 'farm' ? 'active' : ''}" data-strat="farm">
        ${SVG_ICONS.farm}
        <span>Farm & Pillage</span>
      </button>
      <button class="segmented-item ${currentTab === 'gdc' ? 'active' : ''}" data-strat="gdc">
        ${SVG_ICONS.gdc}
        <span>GDC (3 Étoiles)</span>
      </button>
      <button class="segmented-item ${currentTab === 'rush' ? 'active' : ''}" data-strat="rush">
        ${SVG_ICONS.rush}
        <span>Classé / Rush</span>
      </button>
      <button class="segmented-item ${currentTab === 'noheroes' ? 'active' : ''}" data-strat="noheroes">
        ${SVG_ICONS.noheroes}
        <span>Sans Héros</span>
      </button>
    </div>

    <!-- Conteneur Détails de la Stratégie -->
    <div id="strategy-details-container" class="mt-4">
      <!-- Rendu dynamique -->
    </div>
  `;
  container.appendChild(card);

  const detailsContainer = card.querySelector('#strategy-details-container');
  renderStrategyDetails(detailsContainer, currentTab);

  const tabBtns = card.querySelectorAll('.segmented-item');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.getAttribute('data-strat');
      renderStrategyDetails(detailsContainer, currentTab);
    });
  });

  const copyBtn = card.querySelector('#btn-copy-strategy');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const strat = STRATEGIES_DATA[currentTab];
      const textToCopy = `[CoC Optimizer - HDV ${thLevel}] ${strat.name}\n• Troupes : ${strat.armyUnits}\n• Sorts : ${strat.spells}\n• Engin : ${strat.siege}\n• CDC : ${strat.clanCastle}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Composition copiée dans le presse-papier !', 'success');
      }).catch(() => {
        showToast('Échec de la copie automatique', 'error');
      });
    });
  }
}

function renderStrategyDetails(container, stratKey) {
  if (!container) return;
  const strat = STRATEGIES_DATA[stratKey] || STRATEGIES_DATA.farm;

  container.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-subtle">
        <div class="flex items-center gap-2">
          <div class="text-accent">${SVG_ICONS[strat.iconKey]}</div>
          <h4 class="text-sm font-semibold text-primary">${strat.name}</h4>
        </div>
        <span class="badge badge-accent">${strat.difficulty}</span>
      </div>

      <div class="grid-2col text-xs gap-3">
        <div class="p-3 bg-sunken rounded-lg border border-subtle">
          <div class="text-muted font-medium text-2xs uppercase">Armée Principale</div>
          <div class="text-primary font-semibold mt-1">${strat.armyUnits}</div>
        </div>
        <div class="p-3 bg-sunken rounded-lg border border-subtle">
          <div class="text-muted font-medium text-2xs uppercase">Sorts & Flacons</div>
          <div class="text-primary font-semibold mt-1">${strat.spells}</div>
        </div>
        <div class="p-3 bg-sunken rounded-lg border border-subtle">
          <div class="text-muted font-medium text-2xs uppercase">Engin de Siège Recommandé</div>
          <div class="text-secondary mt-1">${strat.siege}</div>
        </div>
        <div class="p-3 bg-sunken rounded-lg border border-subtle">
          <div class="text-muted font-medium text-2xs uppercase">Château de Clan (CDC)</div>
          <div class="text-secondary mt-1">${strat.clanCastle}</div>
        </div>
      </div>

      <div class="p-3.5 bg-sunken rounded-lg border border-subtle text-xs mt-3">
        <div class="font-semibold text-primary mb-1.5 flex items-center gap-1.5">
          <span>Plan d'Attaque Étape par Étape</span>
        </div>
        <div class="text-secondary leading-relaxed text-2xs space-y-1">
          ${strat.plan}
        </div>
      </div>
    </div>
  `;
}
