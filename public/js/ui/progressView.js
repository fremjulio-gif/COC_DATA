/**
 * CoC Freemium Optimizer — Vue Progression & Simulateur de Projection Interactive
 * Modélisation temps réel calculée depuis les données réelles du village + contrôles interactifs
 */

import { createForecastingChart, createHeroesChart, createWallsChart } from '../charts.js';
import { escapeHtml } from '../utils.js';
import { getUiIcon } from './icons.js';

let simHeroWorkers = 2;
let simUseApprentice = true;

function computeProjectionModel(analysis, workersCount, useApprentice) {
  const heroes = analysis.heroes || {};
  const totalCurrent = heroes.totalCurrent || 0;
  const totalMax = heroes.totalMax || 1;
  const healthyThreshold = heroes.healthyThreshold || Math.round(totalMax * 0.9);
  const currentPct = heroes.globalHeroIndex ?? Math.round((totalCurrent / totalMax) * 100);

  // Jours-ouvrier cumulés depuis upgrade_costs.json pour les héros restants
  const heroItems = Object.values(heroes.items || {});
  const totalHeroBuilderDays = heroItems.reduce((sum, h) => sum + (Number(h.daysNeeded) || 0), 0);
  const hasAnyUnverified = heroItems.some(h => !h.verified);

  const levelsRemainingToMax = Math.max(0, totalMax - totalCurrent);
  const levelsNeededToHealthy = Math.max(0, healthyThreshold - totalCurrent);
  const healthyFraction = levelsRemainingToMax > 0
    ? Math.min(1, levelsNeededToHealthy / levelsRemainingToMax)
    : 0;

  const healthyBuilderDays = Math.round(totalHeroBuilderDays * healthyFraction);
  const apprenticeHours = useApprentice ? (analysis.helpers?.builderHelperHours || 0) : 0;

  // Vitesse effective en jours-ouvrier gagnés par jour réel
  const effectiveDailyRate = Math.max(1, workersCount) + (apprenticeHours / 24);
  const optimalDays = Math.max(0, Math.round(healthyBuilderDays / effectiveDailyRate));
  const fullMaxDays = Math.max(0, Math.round(totalHeroBuilderDays / effectiveDailyRate));
  const standardDays = Math.round(optimalDays * 1.28);

  // Génération de 5 jalons cohérents pour Chart.js et tableau accessible
  const labels = optimalDays === 0
    ? ['Auj.', 'J+7', 'J+14', 'J+21', 'HDV Suivant']
    : [
      'Auj.',
      `J+${Math.max(1, Math.round(optimalDays * 0.45))}`,
      `J+${optimalDays} (Optimal)`,
      `J+${Math.round((optimalDays + standardDays) / 2)}`,
      `J+${Math.max(optimalDays + 1, standardDays)} (Standard)`
    ];

  const targetHealthyPct = Math.min(100, Math.round((healthyThreshold / totalMax) * 100));
  const lerp = (a, b, t) => Math.min(100, Math.round(a + (b - a) * t));

  const optimalSeries = optimalDays === 0
    ? [currentPct, Math.min(100, currentPct + 2), Math.min(100, currentPct + 4), 100, 100]
    : [
      currentPct,
      lerp(currentPct, targetHealthyPct, 0.48),
      targetHealthyPct,
      lerp(targetHealthyPct, 100, 0.55),
      100
    ];

  const standardSeries = optimalDays === 0
    ? [currentPct, Math.min(100, currentPct + 1), Math.min(100, currentPct + 2), Math.min(100, currentPct + 3), 100]
    : [
      currentPct,
      lerp(currentPct, targetHealthyPct, 0.34),
      lerp(currentPct, targetHealthyPct, 0.72),
      lerp(currentPct, targetHealthyPct, 0.88),
      targetHealthyPct
    ];

  return {
    totalHeroBuilderDays,
    healthyBuilderDays,
    optimalDays,
    standardDays,
    fullMaxDays,
    apprenticeHours,
    hasAnyUnverified,
    labels,
    optimalSeries,
    standardSeries,
    optimalLabel: `Optimal (${workersCount} ouvr.${useApprentice && apprenticeHours > 0 ? ` + Apprenti` : ''})`
  };
}

export function renderProgressView(container, analysis, capsData) {
  if (!container) return;
  container.innerHTML = '';

  if (!analysis || !analysis.success) {
    container.innerHTML = `
      <div class="card card-warning p-4">
        <p class="text-xs text-secondary">Données de projection non disponibles.</p>
      </div>
    `;
    return;
  }

  const thLevel = analysis.thLevel || 11;
  const nextTh = thLevel + 1;
  const maxAvailableWorkers = Math.min(4, Math.max(1, analysis.builders?.totalBuilders || 4));
  if (simHeroWorkers > maxAvailableWorkers) simHeroWorkers = maxAvailableWorkers;

  const apprenticeHoursMax = analysis.helpers?.builderHelperHours || 0;

  // 1. Panneau Simulateur Interactif
  const simCard = document.createElement('div');
  simCard.className = 'card card-hero p-5 mb-4 space-y-4';
  simCard.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-subtle">
      <div class="flex items-center gap-2.5">
        <span class="text-accent">${getUiIcon('sparkles', 19)}</span>
        <div>
          <h3 class="text-base font-bold">Simulateur de Trajectoire HDV ${nextTh}</h3>
          <p class="text-2xs text-secondary">Ajustez vos ouvriers dédiés et votre Apprenti Ouvrier pour simuler en direct</p>
        </div>
      </div>
      <span class="badge badge-accent tabular-nums">Seuil sain : 90 % (${analysis.heroes?.healthyThreshold || 0}/${analysis.heroes?.totalMax || 0} niv.)</span>
    </div>

    <div class="grid-2col gap-4 items-center">
      <div class="p-3.5 rounded-xl bg-sunken border border-subtle space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-primary">Ouvriers dédiés aux Héros</span>
          <span id="sim-workers-badge" class="badge badge-accent tabular-nums">${simHeroWorkers} ouvrier${simHeroWorkers > 1 ? 's' : ''}</span>
        </div>
        <input id="sim-workers-slider" class="range-slider" type="range" min="1" max="${maxAvailableWorkers}" step="1" value="${simHeroWorkers}" aria-label="Nombre d'ouvriers dédiés aux héros">
        <div class="flex justify-between text-2xs text-muted tabular-nums">
          <span>1 (Farm)</span>
          <span>${Math.min(2, maxAvailableWorkers)} (Équilibré)</span>
          <span>${maxAvailableWorkers} (Rush Héros)</span>
        </div>
      </div>

      <div class="p-3.5 rounded-xl bg-sunken border border-subtle flex items-center justify-between gap-3">
        <div>
          <div class="text-xs font-semibold text-primary">Apprenti Ouvrier quotidien</div>
          <div class="text-2xs text-muted mt-0.5">
            ${apprenticeHoursMax > 0
              ? `Gain effectif : +${apprenticeHoursMax}h / jour sur vos chantiers`
              : 'Niveau 0 (non débloqué dans cette base)'}
          </div>
        </div>
        <label class="ios-switch">
          <input type="checkbox" id="sim-apprentice-toggle" ${simUseApprentice && apprenticeHoursMax > 0 ? 'checked' : ''} ${apprenticeHoursMax === 0 ? 'disabled' : ''}>
          <span class="ios-switch-track"></span>
        </label>
      </div>
    </div>
  `;
  container.appendChild(simCard);

  // 2. Conteneur des 3 KPIs Simulé (mis à jour dynamiquement)
  const kpiGrid = document.createElement('div');
  kpiGrid.className = 'grid-3col mb-4';
  kpiGrid.id = 'progress-sim-kpis';
  container.appendChild(kpiGrid);

  // 3. Section Graphique Prévisionnel + Tableau Accessible
  const forecastCard = document.createElement('div');
  forecastCard.className = 'card mb-6';
  forecastCard.innerHTML = `
    <div class="pb-3 border-b border-subtle">
      <h3 class="text-sm sm:text-base font-semibold">Trajectoire de Maxage vers l'HDV ${nextTh}</h3>
      <p id="forecast-summary-line" class="text-xs text-secondary mt-1"></p>
    </div>
    <div style="height: 270px;" class="mt-4">
      <canvas id="chart-canvas-forecasting"></canvas>
    </div>
    <details class="mt-4 pt-3 border-t border-subtle">
      <summary class="text-2xs text-muted cursor-pointer transition-colors">
        Afficher les données du graphique sous forme de tableau accessible
      </summary>
      <div class="table-accessible-container mt-2">
        <table class="table-accessible">
          <caption class="sr-only">Projection simulée d'avancement des héros vers l'HDV ${nextTh}</caption>
          <thead>
            <tr>
              <th scope="col">Jalon temporel</th>
              <th scope="col">Scénario Optimal</th>
              <th scope="col">Scénario Standard</th>
            </tr>
          </thead>
          <tbody id="forecast-accessible-tbody"></tbody>
        </table>
      </div>
    </details>
  `;
  container.appendChild(forecastCard);

  // 4. Section Deux Graphiques (Héros vs Plafonds & Remparts)
  const doubleChartRow = document.createElement('div');
  doubleChartRow.className = 'grid-2col';

  const heroesChartCard = document.createElement('div');
  heroesChartCard.className = 'card';
  heroesChartCard.innerHTML = `
    <div class="pb-2 border-b border-subtle">
      <h3 class="text-sm font-semibold">Héros vs Plafond HDV ${thLevel}</h3>
      <p class="text-2xs text-secondary mt-0.5">
        Total actuel : <strong class="text-primary tabular-nums">${analysis.heroes?.totalCurrent || 0} / ${analysis.heroes?.totalMax || 0}</strong> niveaux (${analysis.heroes?.globalHeroIndex || 0}%).
      </p>
    </div>
    <div style="height: 230px;" class="mt-3">
      <canvas id="chart-canvas-heroes"></canvas>
    </div>
  `;
  doubleChartRow.appendChild(heroesChartCard);

  const wallsChartCard = document.createElement('div');
  wallsChartCard.className = 'card';
  wallsChartCard.innerHTML = `
    <div class="pb-2 border-b border-subtle">
      <h3 class="text-sm font-semibold">Répartition des ${analysis.walls?.totalWalls || 0} Remparts</h3>
      <p class="text-2xs text-secondary mt-0.5">
        <strong class="text-primary tabular-nums">${analysis.walls?.completionPct || 0}%</strong> au niveau max ${analysis.walls?.maxWallLevel || thLevel + 1}.
      </p>
    </div>
    <div style="height: 230px;" class="mt-3">
      <canvas id="chart-canvas-walls"></canvas>
    </div>
  `;
  doubleChartRow.appendChild(wallsChartCard);
  container.appendChild(doubleChartRow);

  // Fonction de mise à jour temps réel du simulateur
  const refreshSimulation = () => {
    const model = computeProjectionModel(analysis, simHeroWorkers, simUseApprentice);
    const unverifiedMark = model.hasAnyUnverified ? ' <span class="text-warning">(à vérifier)</span>' : '';

    kpiGrid.innerHTML = `
      <div class="card card-success">
        <span class="text-2xs text-muted uppercase font-semibold">Seuil HDV ${nextTh} Sain (90%)</span>
        <div class="text-2xl font-bold tabular-nums text-success mt-1">
          ${model.optimalDays === 0 ? 'Atteint !' : `~${model.optimalDays} jours`}
        </div>
        <p class="text-xs text-secondary mt-1">
          Avec ${simHeroWorkers} ouvrier${simHeroWorkers > 1 ? 's' : ''}${simUseApprentice && model.apprenticeHours > 0 ? ` + Apprenti (${model.apprenticeHours}h/j)` : ''}
        </p>
        <div class="mt-3 pt-2 border-t border-subtle text-2xs text-muted flex justify-between">
          <span>Maxage complet 100% :</span>
          <strong class="text-primary tabular-nums">~${model.fullMaxDays} j${unverifiedMark}</strong>
        </div>
      </div>

      <div class="card card-warning">
        <span class="text-2xs text-muted uppercase font-semibold">Effort Ouvrier Cumulé</span>
        <div class="text-2xl font-bold tabular-nums text-warning mt-1">~${model.healthyBuilderDays} j</div>
        <p class="text-xs text-secondary mt-1">Temps ouvrier restant jusqu'au seuil 90%</p>
        <div class="mt-3 pt-2 border-t border-subtle text-2xs text-muted flex justify-between">
          <span>Assistant Labo :</span>
          <strong class="text-primary tabular-nums">+${analysis.helpers?.labHelperHours || 0}h / jour</strong>
        </div>
      </div>

      <div class="card">
        <span class="text-2xs text-muted uppercase font-semibold">Rythme Standard</span>
        <div class="text-2xl font-bold tabular-nums text-primary mt-1">
          ${model.standardDays === 0 ? 'Atteint !' : `~${model.standardDays} jours`}
        </div>
        <p class="text-xs text-secondary mt-1">Incluant latence moyenne de farm (+28%)</p>
        <div class="mt-3 pt-2 border-t border-subtle text-2xs text-muted flex justify-between">
          <span>Héros actuels :</span>
          <strong class="text-primary tabular-nums">${analysis.heroes?.globalHeroIndex || 0}% du plafond</strong>
        </div>
      </div>
    `;

    const summaryLine = forecastCard.querySelector('#forecast-summary-line');
    if (summaryLine) {
      summaryLine.innerHTML = model.optimalDays === 0
        ? `Votre village a déjà dépassé le seuil sain de 90 % pour l'Hôtel de Ville ${thLevel} : vous pouvez préparer le passage vers l'HDV ${nextTh}.`
        : `Interprétation : Avec <strong>${simHeroWorkers} ouvrier${simHeroWorkers > 1 ? 's' : ''}</strong> sur vos héros${simUseApprentice && model.apprenticeHours > 0 ? ` et l'Apprenti Ouvrier (+${model.apprenticeHours}h/j)` : ''}, vous atteindrez le seuil sain de 90 % dans environ <strong>${model.optimalDays} jours</strong>.`;
    }

    const tbody = forecastCard.querySelector('#forecast-accessible-tbody');
    if (tbody) {
      tbody.innerHTML = model.labels.map((lbl, idx) => `
        <tr>
          <td>${escapeHtml(lbl)}</td>
          <td class="tabular-nums font-semibold text-success">${model.optimalSeries[idx]} %</td>
          <td class="tabular-nums text-warning">${model.standardSeries[idx]} %</td>
        </tr>
      `).join('');
    }

    const canvasForecast = forecastCard.querySelector('#chart-canvas-forecasting');
    if (canvasForecast) createForecastingChart(canvasForecast, model);
  };

  // Événements du Simulateur
  const sliderEl = simCard.querySelector('#sim-workers-slider');
  const badgeEl = simCard.querySelector('#sim-workers-badge');
  const toggleEl = simCard.querySelector('#sim-apprentice-toggle');

  if (sliderEl) {
    sliderEl.addEventListener('input', (e) => {
      simHeroWorkers = Number(e.target.value) || 2;
      if (badgeEl) badgeEl.textContent = `${simHeroWorkers} ouvrier${simHeroWorkers > 1 ? 's' : ''}`;
      refreshSimulation();
    });
  }

  if (toggleEl) {
    toggleEl.addEventListener('change', (e) => {
      simUseApprentice = Boolean(e.target.checked);
      refreshSimulation();
    });
  }

  // Initialisation Chart.js après montage DOM
  requestAnimationFrame(() => {
    refreshSimulation();
    const canvasHeroes = heroesChartCard.querySelector('#chart-canvas-heroes');
    const canvasWalls = wallsChartCard.querySelector('#chart-canvas-walls');
    if (canvasHeroes) createHeroesChart(canvasHeroes, analysis.heroes);
    if (canvasWalls) createWallsChart(canvasWalls, analysis.walls);
  });
}
