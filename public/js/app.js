/**
 * CoC Freemium Optimizer — Point d'Entrée Applicatif
 * Architecture modulaire ES Modules, PWA et gestionnaire d'état réactif
 */

import { store } from './store.js';
import { router } from './router.js';
import { i18n } from './i18n.js';
import { analyzeVillage } from './analysis.js';
import { evaluateAdvice } from './advice.js';
import { renderHomeView } from './ui/homeView.js';
import { renderAdviceView } from './ui/adviceView.js';
import { renderVillageView } from './ui/villageView.js';
import { renderHeroesView } from './ui/heroesView.js';
import { renderArmyView } from './ui/armyView.js';
import { renderProgressView } from './ui/progressView.js';
import { renderStrategyView } from './ui/strategyView.js';

let capsData = null;
let costsData = null;
let rulesData = null;
let glossaryData = null;

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  const iconSvg = type === 'success' 
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    : type === 'error'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function initTheme() {
  const currentTheme = store.getState().theme;
  applyTheme(currentTheme);

  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const state = store.getState();
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      store.setTheme(nextTheme);
      applyTheme(nextTheme);
      showToast(`Thème ${nextTheme === 'dark' ? 'Sombre' : 'Clair'} activé`, 'info');
    });
  }
}

function applyTheme(theme) {
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service Worker enregistré :', reg.scope);
    } catch (err) {
      console.warn('[PWA] Échec enregistrement Service Worker :', err);
    }
  }
}

async function loadStaticData() {
  try {
    const [capsRes, costsRes, rulesRes, glossaryRes] = await Promise.all([
      fetch('/data/townhall_caps.json'),
      fetch('/data/upgrade_costs.json'),
      fetch('/data/advice_rules.json'),
      fetch('/data/glossary.fr.json')
    ]);

    if (capsRes.ok) capsData = await capsRes.json();
    if (costsRes.ok) costsData = await costsRes.json();
    if (rulesRes.ok) rulesData = await rulesRes.json();
    if (glossaryRes.ok) glossaryData = await glossaryRes.json();
  } catch (err) {
    console.warn('[App] Erreur lors du chargement des données de référence :', err);
  }
}

async function loadInitialVillageData() {
  store.loadFromStorage();
  let village = store.getActiveVillageData();

  if (!village) {
    try {
      const res = await fetch('/api/village');
      if (res.ok) {
        village = await res.json();
        store.importVillage(village);
        console.log('[App] Village initial chargé via API locale :', village.tag);
      }
    } catch (err) {
      console.warn('[App] Aucune API locale disponible, attente d\'un import manuel :', err);
    }
  }

  processAndRenderVillage(village);
}

export function processAndRenderVillage(village) {
  if (!village) return;

  const analysis = analyzeVillage(village, capsData, costsData);
  analysis.rawData = village;
  store.setAnalysis(analysis);

  updateHeaderUI(store.getState(), analysis);

  // Évaluation des règles de conseils
  const adviceList = evaluateAdvice(analysis, rulesData, store.getState());

  // Rendu de la vue Accueil
  renderHomeView(analysis, capsData, adviceList);

  // Rendu de la vue Conseils
  const adviceContainer = document.getElementById('advice-container');
  if (adviceContainer) renderAdviceView(adviceContainer, adviceList, glossaryData);

  // Rendu de la vue Village
  const villageContainer = document.getElementById('village-inventory-container');
  if (villageContainer) renderVillageView(villageContainer, analysis, capsData);

  // Rendu de la vue Héros
  const heroesContainer = document.getElementById('heroes-container');
  if (heroesContainer) renderHeroesView(heroesContainer, analysis, capsData);

  // Rendu de la vue Armée
  const armyContainer = document.getElementById('army-container');
  if (armyContainer) renderArmyView(armyContainer, analysis, capsData);

  // Rendu de la vue Progression & Projection
  const progressContainer = document.getElementById('progress-container');
  if (progressContainer) renderProgressView(progressContainer, analysis, capsData);

  // Rendu de la vue Stratégies
  const strategyContainer = document.getElementById('strategy-container');
  if (strategyContainer) renderStrategyView(strategyContainer, analysis);
}

function updateHeaderUI(state, analysis) {
  const tagBadge = document.getElementById('header-tag-badge');
  const statusText = document.getElementById('header-status-text');

  if (tagBadge) {
    tagBadge.textContent = state.activeTag || (analysis?.tag) || 'Aucun village';
  }
  if (statusText) {
    const count = Object.keys(state.accounts).length;
    statusText.textContent = count > 0 
      ? `${count} village${count > 1 ? 's' : ''} enregistré${count > 1 ? 's' : ''}` 
      : 'En attente d\'import';
  }
}

// Initialisation globale
document.addEventListener('DOMContentLoaded', async () => {
  await i18n.init();
  await loadStaticData();
  initTheme();
  router.init();
  registerServiceWorker();

  // Re-rendre lors du changement de route si nécessaire (notamment redimensionnement des graphiques)
  router.onRouteChange((route) => {
    if (route === 'progress' && store.getState().analysis) {
      const progressContainer = document.getElementById('progress-container');
      if (progressContainer) renderProgressView(progressContainer, store.getState().analysis, capsData);
    }
  });

  store.subscribe((state) => {
    updateHeaderUI(state, state.analysis);
  });

  await loadInitialVillageData();
});
