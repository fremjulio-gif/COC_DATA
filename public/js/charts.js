/**
 * CoC Freemium Optimizer — Wrappers Graphiques Chart.js (Auto-hébergé)
 * Esthétique Apple Minimaliste, destruction propre des instances et accessibilité
 */

const chartInstances = {};

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
 * Graphique 1 : 4 Héros vs Plafonds HDV
 */
export function createHeroesChart(canvasEl, heroes) {
  if (!canvasEl || typeof Chart === 'undefined' || !heroes || !heroes.items) return null;
  destroyChart('heroes');

  const heroKeys = ['king', 'queen', 'warden', 'minion_prince'];
  const labels = [];
  const currentData = [];
  const maxData = [];
  const colors = ['#f59e0b', '#ec4899', '#38bdf8', '#a855f7'];

  heroKeys.forEach(k => {
    const h = heroes.items[k];
    if (h) {
      labels.push(h.name.replace(' des Barbares', '').replace(' des Archères', ''));
      currentData.push(h.level);
      maxData.push(h.maxLevel);
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
          backgroundColor: colors,
          borderRadius: 6,
          barPercentage: 0.6
        },
        {
          label: 'Plafond HDV',
          data: maxData,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: '#a1a1aa', font: { size: 11 }, boxWidth: 10 }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 22, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#a1a1aa', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#71717a', font: { size: 10 } },
          beginAtZero: true
        }
      }
    }
  });

  chartInstances['heroes'] = chart;
  return chart;
}

/**
 * Graphique 2 : Répartition des Remparts (Doughnut sobre)
 */
export function createWallsChart(canvasEl, walls) {
  if (!canvasEl || typeof Chart === 'undefined' || !walls) return null;
  destroyChart('walls');

  const counts = walls.countsByLevel || {};
  const levels = Object.keys(counts).sort((a, b) => Number(b) - Number(a));
  const labels = levels.map(lvl => `Murs Niv. ${lvl}`);
  const data = levels.map(lvl => counts[lvl]);
  const colors = ['#0a84ff', '#64d2ff', '#52525b', '#3f3f46'];

  const ctx = canvasEl.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#a1a1aa', font: { size: 11 }, boxWidth: 10 }
        }
      }
    }
  });

  chartInstances['walls'] = chart;
  return chart;
}

/**
 * Graphique 3 : Modélisation Prévisionnelle (Scénario A Optimal vs B Standard)
 */
export function createForecastingChart(canvasEl, analysis) {
  if (!canvasEl || typeof Chart === 'undefined') return null;
  destroyChart('forecasting');

  const daysLabels = ['J0 (Auj.)', 'J+30', 'J+53 (Seuil Optimal)', 'J+75', 'J+108 (Standard)'];
  const optimalTrajectory = [55, 75, 90, 96, 100];
  const standardTrajectory = [55, 65, 74, 82, 90];

  const ctx = canvasEl.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: daysLabels,
      datasets: [
        {
          label: 'Scénario Optimal (2 Ouvriers Héros + Assistants)',
          data: optimalTrajectory,
          borderColor: '#30d158',
          backgroundColor: 'rgba(48, 209, 88, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4
        },
        {
          label: 'Scénario Standard (Latence de Farm)',
          data: standardTrajectory,
          borderColor: '#ff9f0a',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.3,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#a1a1aa', font: { size: 11 }, boxWidth: 10 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#a1a1aa', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#71717a', font: { size: 10 }, callback: v => `${v}%` },
          min: 40,
          max: 100
        }
      }
    }
  });

  chartInstances['forecasting'] = chart;
  return chart;
}
