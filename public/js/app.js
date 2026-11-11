/**
 * CoC Freemium Optimizer — Point d'Entrée Applicatif
 * Architecture modulaire ES Modules, PWA, Modale Mobile "Explorer" et état réactif
 */

import { store } from './store.js';
import { router } from './router.js';
import { i18n } from './i18n.js';
import { analyzeVillage } from './analysis.js';
import { evaluateAdvice } from './advice.js';
import { decompressVillageFromHash } from './sync.js';
import { escapeHtml, openModalSheet, closeModalSheet, ensureLiveTicker, applyTheme, getEffectiveTheme } from './utils.js';
import { getUiIcon } from './ui/icons.js';
import { renderHomeView } from './ui/homeView.js';
import { renderAdviceView } from './ui/adviceView.js';
import { renderVillageView } from './ui/villageView.js';
import { renderHeroesView } from './ui/heroesView.js';
import { renderArmyView } from './ui/armyView.js';
import { renderProgressView } from './ui/progressView.js';
import { renderStrategyView } from './ui/strategyView.js';
import { renderSettingsView } from './ui/settingsView.js';

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
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2.2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    : type === 'error'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 260);
  }, 3500);
}

function initTheme() {
  const currentTheme = store.getState().theme;
  applyTheme(currentTheme);

  if (window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    media.addEventListener?.('change', () => {
      if (store.getState().theme === 'auto') {
        applyTheme('auto');
      }
    });
  }

  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const state = store.getState();
      const effective = getEffectiveTheme(state.theme);
      const nextTheme = effective === 'dark' ? 'light' : 'dark';
      store.setTheme(nextTheme);
      applyTheme(nextTheme);
      showToast(`Thème ${nextTheme === 'dark' ? 'Sombre' : 'Clair'} activé`, 'info');

      // Rafraîchit Chart.js si l'utilisateur est sur la vue Projection, ou les boutons de Réglages
      if (router.getCurrentRoute() === 'progress' && state.analysis) {
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) renderProgressView(progressContainer, state.analysis, capsData);
      } else if (router.getCurrentRoute() === 'settings') {
        const settingsContainer = document.getElementById('settings-container');
        if (settingsContainer) renderSettingsView(settingsContainer, glossaryData);
      }
    });
  }
}

function initGlobalModalAndMobileMenu() {
  const backdrop = document.getElementById('global-modal-backdrop');
  const closeBtn = document.getElementById('global-modal-close');
  const moreBtn = document.getElementById('mobile-more-trigger');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModalSheet);
  }

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModalSheet();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModalSheet();
  });

  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      const active = router.getCurrentRoute();
      const analysis = store.getState().analysis;
      const armyPct = analysis?.army?.completionPct || 0;
      const thLevel = analysis?.thLevel || 11;

      openModalSheet({
        title: 'Explorer toutes les vues',
        bodyHtml: `
          <div class="space-y-4">
            <div class="mobile-more-grid">
              <button class="mobile-more-tile ${active === 'army' ? 'is-active' : ''}" data-mobile-nav="army">
                <div class="entity-icon-box entity-icon-army">${getUiIcon('lab', 19)}</div>
                <div>
                  <div class="text-sm font-bold text-primary">Armée & Labo</div>
                  <div class="text-2xs text-muted">${armyPct}% maxé</div>
                </div>
              </button>

              <button class="mobile-more-tile ${active === 'progress' ? 'is-active' : ''}" data-mobile-nav="progress">
                <div class="entity-icon-box entity-icon-builder">${getUiIcon('chart', 19)}</div>
                <div>
                  <div class="text-sm font-bold text-primary">Projection</div>
                  <div class="text-2xs text-muted">Simulateur HDV ${thLevel + 1}</div>
                </div>
              </button>

              <button class="mobile-more-tile ${active === 'strategy' ? 'is-active' : ''}" data-mobile-nav="strategy">
                <div class="entity-icon-box entity-icon-resource">${getUiIcon('army', 19)}</div>
                <div>
                  <div class="text-sm font-bold text-primary">Stratégies</div>
                  <div class="text-2xs text-muted">Farm / GDC / Rush</div>
                </div>
              </button>

              <button class="mobile-more-tile ${active === 'settings' ? 'is-active' : ''}" data-mobile-nav="settings">
                <div class="entity-icon-box">${getUiIcon('qr', 19)}</div>
                <div>
                  <div class="text-sm font-bold text-primary">Réglages & Sync</div>
                  <div class="text-2xs text-muted">Import JSON & QR</div>
                </div>
              </button>
            </div>
          </div>
        `
      });

      const modalBody = document.getElementById('global-modal-body');
      modalBody?.querySelectorAll('[data-mobile-nav]').forEach(tile => {
        tile.addEventListener('click', () => {
          const targetRoute = tile.getAttribute('data-mobile-nav');
          closeModalSheet();
          router.navigateTo(targetRoute, true);
        });
      });
    });
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

async function checkSyncUrlHash() {
  const hash = window.location.hash || '';
  if (hash.includes('sync=')) {
    try {
      const syncHash = hash.replace(/^#?\/?sync=/, '');
      const village = await decompressVillageFromHash(syncHash);
      if (village && village.tag) {
        store.importVillage(village);
        processAndRenderVillage(village);
        showToast(`Village ${village.tag} synchronisé avec succès !`, 'success');
        window.location.hash = '#home';
        return true;
      }
    } catch (err) {
      showToast('Échec de la synchronisation par lien : ' + err.message, 'error');
    }
  }
  return false;
}

async function loadInitialVillageData() {
  const synced = await checkSyncUrlHash();
  if (synced) return;

  store.loadFromStorage();
  let village = store.getActiveVillageData();

  if (!village) {
    try {
      const res = await fetch('/api/village');
      if (res.ok) {
        village = await res.json();
        store.importVillage(village);
        console.log('[App] Village initial chargé via API :', village.tag);
      }
    } catch (err) {
      console.warn('[App] Aucune API locale disponible, attente d\'un import manuel :', err);
    }
  }

  processAndRenderVillage(village);
}

function updateAdviceBadges(adviceList) {
  const state = store.getState();
  const completed = new Set(state.completedAdviceIds || []);
  const hidden = new Set(state.hiddenAdviceIds || []);
  const criticalCount = (adviceList || []).filter(
    a => !completed.has(a.id) && !hidden.has(a.id) && a.urgence === 'critique'
  ).length;

  ['desktop-advice-badge', 'mobile-advice-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (criticalCount > 0) {
      el.textContent = String(criticalCount);
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

export function processAndRenderVillage(village) {
  if (!village) {
    renderHomeView(null, capsData, []);
    const settingsContainer = document.getElementById('settings-container');
    if (settingsContainer) renderSettingsView(settingsContainer, glossaryData);
    return;
  }

  const analysis = analyzeVillage(village, capsData, costsData);
  analysis.rawData = village;
  store.setAnalysis(analysis);

  const state = store.getState();
  updateHeaderUI(state, analysis);

  const adviceList = evaluateAdvice(analysis, rulesData, state);
  updateAdviceBadges(adviceList);

  renderHomeView(analysis, capsData, adviceList);

  const adviceContainer = document.getElementById('advice-container');
  if (adviceContainer) renderAdviceView(adviceContainer, adviceList, glossaryData);

  const villageContainer = document.getElementById('village-inventory-container');
  if (villageContainer) renderVillageView(villageContainer, analysis, capsData);

  const heroesContainer = document.getElementById('heroes-container');
  if (heroesContainer) renderHeroesView(heroesContainer, analysis, capsData);

  const armyContainer = document.getElementById('army-container');
  if (armyContainer) renderArmyView(armyContainer, analysis, capsData);

  const progressContainer = document.getElementById('progress-container');
  if (progressContainer) renderProgressView(progressContainer, analysis, capsData);

  const strategyContainer = document.getElementById('strategy-container');
  if (strategyContainer) renderStrategyView(strategyContainer, analysis);

  const settingsContainer = document.getElementById('settings-container');
  if (settingsContainer) renderSettingsView(settingsContainer, glossaryData);
}

function updateHeaderUI(state, analysis) {
  const tagBadge = document.getElementById('header-tag-badge');
  const statusText = document.getElementById('header-status-text');

  if (tagBadge) {
    tagBadge.textContent = state.activeTag || (analysis?.tag) || 'Aucun village';
  }
  if (statusText) {
    const count = Object.keys(state.accounts).length;
    const thPart = analysis?.thLevel ? `HDV ${analysis.thLevel} • ` : '';
    statusText.textContent = count > 0
      ? `${thPart}${count} village${count > 1 ? 's' : ''}`
      : 'En attente d\'import';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  store.loadFromStorage();
  await i18n.init();
  await loadStaticData();
  initTheme();
  initGlobalModalAndMobileMenu();
  router.init();
  registerServiceWorker();
  ensureLiveTicker();

  router.onRouteChange((route) => {
    const state = store.getState();
    if (route === 'home' && state.analysis) {
      const adviceList = evaluateAdvice(state.analysis, rulesData, state);
      updateAdviceBadges(adviceList);
      renderHomeView(state.analysis, capsData, adviceList);
    } else if (route === 'progress' && state.analysis) {
      const progressContainer = document.getElementById('progress-container');
      if (progressContainer) renderProgressView(progressContainer, state.analysis, capsData);
    } else if (route === 'settings') {
      const settingsContainer = document.getElementById('settings-container');
      if (settingsContainer) renderSettingsView(settingsContainer, glossaryData);
    }
  });

  store.subscribe((state) => {
    updateHeaderUI(state, state.analysis);
    if (state.analysis) {
      const adviceList = evaluateAdvice(state.analysis, rulesData, state);
      updateAdviceBadges(adviceList);
    }
  });

  await loadInitialVillageData();
});
