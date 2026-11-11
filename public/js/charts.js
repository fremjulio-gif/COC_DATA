/**
 * CoC Freemium Optimizer — Wrappers Graphiques Chart.js (Auto-hébergé)
 * Thème adaptatif Clair / Sombre, dynamique selon HDV et simulateur interactif
 */

const chartInstances = {};

function getThemeColors() {
  if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
    return {
      tick: '#94a3b8',
      grid: 'rgba(255, 255, 255, 0.06)',
      capBar: 'rgba(255, 255, 255, 0.1)',
      tooltipBg: 'rgba(15, 17, 26, 0.96)',
      tooltipText: '#f8fafc',
      tooltipBorder: 'rgba(255, 255, 255, 0.14)'
    };
  }
  const cs = getComputedStyle(document.documentElement);
  return {
    tick: cs.getPropertyValue('--chart-tick').trim() || '#94a3b8',
    grid: cs.getPropertyValue('--chart-grid').trim() || 'rgba(255, 255, 255, 0.06)',
    capBar: cs.getPropertyValue('--chart-cap-bar').trim() || 'rgba(255, 255, 255, 0.09)',
    tooltipBg: cs.getPropertyValue('--surface-glass-modal').trim() || 'rgba(16, 19, 30, 0.94)',
    tooltipText: cs.getPropertyValue('--text-primary').trim() || '#f8fafc',
    tooltipBorder: cs.getPropertyValue('--border-default').trim() || 'rgba(255, 255, 255, 0.14)'
  };
}

export function getChartInstance(id) {
  return chartInstances[id] || null;
}

export function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

/**
 * Graphique 1 : Tous les Héros débloqués à l'HDV vs Plafonds
 */
export function createHeroesChart(canvasEl, heroes) {
  if (!canvasEl || typeof Chart === 'undefined' || !heroes || !heroes.items) return null;
  destroyChart('heroes');

  const colorsTheme = getThemeColors();
  const heroOrder = [
    { key: 'king', short: 'Roi', color: '#f59e0b' },
    { key: 'queen', short: 'Reine', color: '#ec4899' },
    { key: 'warden', short: 'Gardien', color: '#38bdf8' },
    { key: 'minion_prince', short: 'Prince', color: '#a855f7' },
    { key: 'champion', short: 'Championne', color: '#ef4444' }
  ];

  const labels = [];
  const currentData = [];
  const maxData = [];
  const barColors = [];

  heroOrder.forEach(({ key, short, color }) => {
    const h = heroes.items[key];
    if (h) {
      labels.push(short);
      currentData.push(h.level);
      maxData.push(h.maxLevel);
      barColors.push(color);
    }
  });

  const ctx = canvasEl.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Niveau Actuel',
          data: currentData,
          backgroundColor: barColors,
          borderRadius: 6,
          barPercentage: 0.65
        },
        {
          label: 'Plafond HDV',
          data: maxData,
          backgroundColor: colorsTheme.capBar,
          borderRadius: 6,
          barPercentage: 0.65
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 450 },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: colorsTheme.tick, font: { size: 11 }, boxWidth: 10, padding: 14 }
        },
        tooltip: {
          backgroundColor: colorsTheme.tooltipBg,
          titleColor: colorsTheme.tooltipText,
          bodyColor: colorsTheme.tooltipText,
          borderColor: colorsTheme.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colorsTheme.tick, font: { size: 11, weight: '600' } }
        },
        y: {
          grid: { color: colorsTheme.grid },
          ticks: { color: colorsTheme.tick, font: { size: 10 } },
          beginAtZero: true
        }
      }
    }
  });

  chartInstances['heroes'] = chart;
  return chart;
}

/**
 * Graphique 2 : Répartition des Remparts (Doughnut)
 */
export function createWallsChart(canvasEl, walls) {
  if (!canvasEl || typeof Chart === 'undefined' || !walls) return null;
  destroyChart('walls');

  const colorsTheme = getThemeColors();
  const counts = walls.countsByLevel || {};
  const levels = Object.keys(counts).sort((a, b) => Number(b) - Number(a));
  const labels = levels.map(lvl => `Niv. ${lvl} (${counts[lvl]})`);
  const data = levels.map(lvl => counts[lvl]);
  const colors = ['#0a84ff', '#64d2ff', '#ff9f0a', '#94a3b8', '#475569'];

  const ctx = canvasEl.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, Math.max(1, data.length)),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      animation: { duration: 500 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: colorsTheme.tick, font: { size: 11 }, boxWidth: 10, padding: 12 }
        },
        tooltip: {
          backgroundColor: colorsTheme.tooltipBg,
          titleColor: colorsTheme.tooltipText,
          bodyColor: colorsTheme.tooltipText,
          borderColor: colorsTheme.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8
        }
      }
    }
  });

  chartInstances['walls'] = chart;
  return chart;
}

/**
 * Graphique 3 : Modélisation Prévisionnelle Dynamique (Optimal vs Standard)
 */
export function createForecastingChart(canvasEl, forecastModel) {
  if (!canvasEl || typeof Chart === 'undefined') return null;
  destroyChart('forecasting');

  const colorsTheme = getThemeColors();
  const labels = forecastModel?.labels || ['Auj.', 'Étape 1', 'Étape 2', 'Seuil', 'Max'];
  const optimalSeries = forecastModel?.optimalSeries || [55, 72, 85, 93, 100];
  const standardSeries = forecastModel?.standardSeries || [55, 63, 72, 80, 90];
  const minBound = Math.max(0, Math.floor((Math.min(...optimalSeries, ...standardSeries) - 10) / 10) * 10);

  const ctx = canvasEl.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: forecastModel?.optimalLabel || 'Rythme Optimal (Simulé)',
          data: optimalSeries,
          borderColor: '#30d158',
          backgroundColor: 'rgba(48, 209, 88, 0.12)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.32,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#30d158'
        },
        {
          label: 'Rythme Standard (Latence Farm +28%)',
          data: standardSeries,
          borderColor: '#ff9f0a',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 5],
          tension: 0.32,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          pointBackgroundColor: '#ff9f0a'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: colorsTheme.tick, font: { size: 11 }, boxWidth: 10, padding: 14 }
        },
        tooltip: {
          backgroundColor: colorsTheme.tooltipBg,
          titleColor: colorsTheme.tooltipText,
          bodyColor: colorsTheme.tooltipText,
          borderColor: colorsTheme.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctxItem) => `${ctxItem.dataset.label}: ${ctxItem.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colorsTheme.tick, font: { size: 10.5 } }
        },
        y: {
          grid: { color: colorsTheme.grid },
          ticks: { color: colorsTheme.tick, font: { size: 10.5 }, callback: v => `${v}%` },
          min: minBound,
          max: 100
        }
      }
    }
  });

  chartInstances['forecasting'] = chart;
  return chart;
}
