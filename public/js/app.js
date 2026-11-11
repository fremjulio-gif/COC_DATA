/**
 * CoC Freemium Optimizer — Point d'Entrée Applicatif
 * Architecture modulaire ES Modules, PWA et gestionnaire d'état réactif
 */

import { store } from './store.js';
import { router } from './router.js';
import { i18n } from './i18n.js';

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
      console.log('[PWA] Service Worker enregistré avec succès :', reg.scope);
    } catch (err) {
      console.warn('[PWA] Échec enregistrement Service Worker :', err);
    }
  }
}

async function loadInitialVillageData() {
  // 1. Charge depuis localStorage
  store.loadFromStorage();
  let village = store.getActiveVillageData();

  // 2. Si aucun village n'est en mémoire, interroge l'endpoint local /api/village
  if (!village) {
    try {
      const res = await fetch('/api/village');
      if (res.ok) {
        village = await res.json();
        store.importVillage(village);
        console.log('[App] Village initial chargé via API locale :', village.tag);
      }
    } catch (err) {
      console.warn('[App] Aucune API locale disponible, en attente d\'un import manuel :', err);
    }
  }

  updateHeaderUI(store.getState());
}

function updateHeaderUI(state) {
  const tagBadge = document.getElementById('header-tag-badge');
  const statusText = document.getElementById('header-status-text');

  if (tagBadge) {
    tagBadge.textContent = state.activeTag || 'Aucun village';
  }
  if (statusText) {
    const count = Object.keys(state.accounts).length;
    statusText.textContent = count > 0 
      ? `${count} village${count > 1 ? 's' : ''} enregistré${count > 1 ? 's' : ''}` 
      : 'En attente d\'import';
  }
}

// Initialisation globale au chargement du DOM
document.addEventListener('DOMContentLoaded', async () => {
  await i18n.init();
  initTheme();
  router.init();
  registerServiceWorker();

  store.subscribe((state) => {
    updateHeaderUI(state);
  });

  await loadInitialVillageData();
});
