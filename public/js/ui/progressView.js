/**
 * CoC Freemium Optimizer — Vue Progression & Projection
 * Modélisation temporelle, graphiques Chart.js et alternatives sous forme de tables accessibles
 */

import { createForecastingChart, createHeroesChart, createWallsChart } from '../charts.js';

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

  // 1. Synthèse Prévisionnelle (3 Cartes KPIs)
  const kpiGrid = document.createElement('div');
  kpiGrid.className = 'grid-3col mb-4';
  kpiGrid.innerHTML = `
    <div class="card">
      <span class="text-2xs text-muted uppercase font-medium">Seuil HDV ${nextTh} Sain</span>
      <div class="text-2xl font-bold tabular-nums text-success mt-1">~53 jours</div>
      <p class="text-xs text-secondary mt-1">Avec 2 ouvriers héros + Apprenti Ouvrier</p>
      <div class="mt-3 pt-2 border-t border-subtle text-2xs text-muted flex justify-between">
        <span>Objectif sain :</span>
        <strong class="text-primary tabular-nums">${analysis.heroes?.healthyThreshold || 135} / ${analysis.heroes?.totalMax || 150} niveaux (90%)</strong>
      </div>
    </div>

    <div class="card">
      <span class="text-2xs text-muted uppercase font-medium">Temps Ouvrier Héros</span>
      <div class="text-2xl font-bold tabular-nums text-warning mt-1">~232 j</div>
      <p class="text-xs text-secondary mt-1">Cumulé pour atteindre le seuil 90%</p>
      <div class="mt-3 pt-2 border-t border-subtle text-2xs text-muted flex justify-between">
        <span>Assistant Labo :</span>
        <strong class="text-primary">+${analysis.helpers?.labHelperHours || 0}h / jour effectives</strong>
      </div>
    </div>

    <div class="card">
      <span class="text-2xs text-muted uppercase font-medium">Rythme Standard</span>
      <div class="text-2xl font-bold tabular-nums text-primary mt-1">~108 j</div>
      <p class="text-xs text-secondary mt-1">Avec temps de pause et latence de farm</p>
      <div class="mt-3 pt-2 border-t border-subtle text-2xs text-muted flex justify-between">
        <span>Labo restant estimé :</span>
        <strong class="text-primary">~52 jours</strong>
      </div>
    </div>
  `;
  container.appendChild(kpiGrid);

  // 2. Section Graphique de Modélisation Prévisionnelle
  const forecastCard = document.createElement('div');
  forecastCard.className = 'card mb-6';
  forecastCard.innerHTML = `
    <div class="pb-3 border-b border-subtle">
      <h3 class="text-sm font-semibold">Trajectoire de Maxage vers l'HDV ${nextTh}</h3>
      <p class="text-xs text-secondary mt-1">
        Interprétation : Au rythme optimal actuel (2 ouvriers assignés en permanence aux héros et aide quotidienne de l'Apprenti Ouvrier), votre village franchira le seuil sain de 90 % en <strong>53 jours</strong>.
      </p>
    </div>

    <!-- Canvas Graphique -->
    <div style="height: 260px;" class="mt-4">
      <canvas id="chart-canvas-forecasting"></canvas>
    </div>

    <!-- Alternative Tableau Accessible (WCAG AA) -->
    <details class="mt-4 pt-3 border-t border-subtle">
      <summary class="text-2xs text-muted cursor-pointer hover:text-primary transition-colors">
        Afficher les données du graphique sous forme de tableau accessible
      </summary>
      <div class="table-accessible-container mt-2">
        <table class="table-accessible">
          <caption class="sr-only">Projection d'avancement des héros vers l'HDV ${nextTh}</caption>
          <thead>
            <tr>
              <th scope="col">Jalon temporel</th>
              <th scope="col">Scénario Optimal</th>
              <th scope="col">Scénario Standard</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>J0 (Aujourd'hui)</td><td>55 %</td><td>55 %</td></tr>
            <tr><td>J+30</td><td>75 %</td><td>65 %</td></tr>
            <tr><td>J+53 (Seuil 90%)</td><td>90 % (Prêt HDV ${nextTh})</td><td>74 %</td></tr>
            <tr><td>J+75</td><td>96 %</td><td>82 %</td></tr>
            <tr><td>J+108</td><td>100 % (Maxé HDV ${thLevel})</td><td>90 % (Seuil sain)</td></tr>
          </tbody>
        </table>
      </div>
    </details>
  `;
  container.appendChild(forecastCard);

  // 3. Section Deux Graphiques (Héros vs Plafonds et Remparts)
  const doubleChartRow = document.createElement('div');
  doubleChartRow.className = 'grid-2col';

  // Carte Graphique Héros
  const heroesChartCard = document.createElement('div');
  heroesChartCard.className = 'card';
  heroesChartCard.innerHTML = `
    <div class="pb-2 border-b border-subtle">
      <h3 class="text-sm font-semibold">Héros vs Plafond HDV ${thLevel}</h3>
      <p class="text-2xs text-secondary mt-0.5">
        Vos 4 héros totalisent <strong>${analysis.heroes?.totalCurrent || 0} / ${analysis.heroes?.totalMax || 0}</strong> niveaux (${analysis.heroes?.globalHeroIndex || 0}%).
      </p>
    </div>
    <div style="height: 220px;" class="mt-3">
      <canvas id="chart-canvas-heroes"></canvas>
    </div>
  `;
  doubleChartRow.appendChild(heroesChartCard);

  // Carte Graphique Remparts
  const wallsChartCard = document.createElement('div');
  wallsChartCard.className = 'card';
  wallsChartCard.innerHTML = `
    <div class="pb-2 border-b border-subtle">
      <h3 class="text-sm font-semibold">Répartition des 300 Remparts</h3>
      <p class="text-2xs text-secondary mt-0.5">
        <strong>${analysis.walls?.completionPct || 0}%</strong> de vos remparts ont atteint le niveau max ${analysis.walls?.maxWallLevel || 12}.
      </p>
    </div>
    <div style="height: 220px;" class="mt-3">
      <canvas id="chart-canvas-walls"></canvas>
    </div>
  `;
  doubleChartRow.appendChild(wallsChartCard);

  container.appendChild(doubleChartRow);

  // Initialisation des graphiques après insertion dans le DOM
  requestAnimationFrame(() => {
    const canvasForecast = forecastCard.querySelector('#chart-canvas-forecasting');
    const canvasHeroes = heroesChartCard.querySelector('#chart-canvas-heroes');
    const canvasWalls = wallsChartCard.querySelector('#chart-canvas-walls');

    if (canvasForecast) createForecastingChart(canvasForecast, analysis);
    if (canvasHeroes) createHeroesChart(canvasHeroes, analysis.heroes);
    if (canvasWalls) createWallsChart(canvasWalls, analysis.walls);
  });
}
