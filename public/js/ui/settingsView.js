/**
 * CoC Freemium Optimizer — Vue Réglages, Import, Sync QR & Multi-Comptes
 * Import drag-and-drop, collage JSON, QR Code Gzip, sync serveur & glossaire searchable
 */

import { store } from '../store.js';
import { compressVillageToHash, decompressVillageFromHash, generateQrCode } from '../sync.js';
import { showToast, processAndRenderVillage } from '../app.js';
import { escapeHtml, applyTheme } from '../utils.js';
import { getUiIcon } from './icons.js';

export function renderSettingsView(container, glossaryData) {
  if (!container) return;
  container.innerHTML = '';

  const state = store.getState();
  const currentVillage = store.getActiveVillageData();
  const accounts = state.accounts || {};
  const tags = Object.keys(accounts);

  // 1. Grille supérieure : Sync Inter-Appareils + Apparence / Sources
  const topGrid = document.createElement('div');
  topGrid.className = 'grid-2col mb-4';

  // --- Carte Synchronisation Inter-Appareils ---
  const syncSection = document.createElement('div');
  syncSection.className = 'card space-y-3';
  syncSection.innerHTML = `
    <div class="flex items-start justify-between gap-2 pb-2 border-b border-subtle">
      <div>
        <h3 class="text-sm sm:text-base font-bold">Synchronisation Desktop ↔ Mobile</h3>
        <p class="text-2xs text-secondary mt-0.5">Transférez votre village instantanément par QR Code ou lien compressé Gzip</p>
      </div>
      <span class="text-accent">${getUiIcon('qr', 20)}</span>
    </div>

    <div class="flex flex-wrap gap-2">
      <button id="btn-generate-qr" class="btn btn-sm btn-primary flex-1" ${!currentVillage ? 'disabled' : ''}>
        ${getUiIcon('qr', 14)}
        <span>Générer QR & Lien</span>
      </button>
      <button id="btn-reload-server" class="btn btn-sm btn-secondary">
        Actualiser Serveur
      </button>
    </div>

    <div id="sync-qr-display-container" class="hidden pt-3 border-t border-subtle flex flex-col items-center gap-3">
      <div class="p-3 bg-white rounded-xl shadow-md">
        <canvas id="sync-qr-canvas" width="200" height="200"></canvas>
      </div>
      <p class="text-2xs text-secondary text-center max-w-sm">
        Scannez ce QR Code avec l'appareil photo de votre téléphone pour ouvrir votre village exact.
      </p>
      <div class="flex items-center gap-2 w-full">
        <input type="text" id="sync-url-text" readonly class="text-xs font-mono text-secondary flex-1 truncate">
        <button id="btn-copy-sync-link" class="btn btn-sm btn-secondary flex-shrink-0">Copier</button>
      </div>
    </div>

    <div class="pt-2 border-t border-subtle space-y-1.5">
      <label for="manual-sync-hash-input" class="text-2xs text-muted block">Importer depuis un lien ou hash <code class="text-accent">v2....</code></label>
      <div class="flex items-center gap-2">
        <input type="text" id="manual-sync-hash-input" placeholder="Collez un lien #sync=... reçu d'un autre appareil">
        <button id="btn-apply-sync-hash" class="btn btn-sm btn-secondary flex-shrink-0">Charger</button>
      </div>
    </div>
  `;
  topGrid.appendChild(syncSection);

  // --- Carte Apparence, Mode & Multi-Comptes ---
  const prefsSection = document.createElement('div');
  prefsSection.className = 'card space-y-4';

  const accountsListHtml = tags.length === 0
    ? '<p class="text-2xs text-muted">Aucun compte enregistré en mémoire.</p>'
    : tags.map(t => {
        const isActive = (t === state.activeTag);
        return `
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-sunken border ${isActive ? 'border-accent' : 'border-subtle'} text-xs gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="tabular-nums font-bold text-primary truncate">${escapeHtml(t)}</span>
              ${isActive ? '<span class="badge badge-accent">Actif</span>' : ''}
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              ${!isActive ? `<button class="btn btn-sm btn-secondary btn-activate-account" data-tag="${escapeHtml(t)}">Activer</button>` : ''}
              <button class="btn btn-sm btn-ghost text-danger btn-delete-account" data-tag="${escapeHtml(t)}" title="Supprimer">Suppr.</button>
            </div>
          </div>
        `;
      }).join('');

  prefsSection.innerHTML = `
    <div class="space-y-2 pb-3 border-b border-subtle">
      <div class="flex items-center justify-between">
        <h3 class="text-sm sm:text-base font-bold">Apparence</h3>
        <span class="text-2xs text-muted">Apple Thème</span>
      </div>
      <div class="segmented-control" role="radiogroup" aria-label="Choix du thème">
        <button class="segmented-item theme-pick-btn ${state.theme === 'auto' ? 'active' : ''}" data-theme-val="auto">Auto</button>
        <button class="segmented-item theme-pick-btn ${state.theme === 'dark' ? 'active' : ''}" data-theme-val="dark">Sombre</button>
        <button class="segmented-item theme-pick-btn ${state.theme === 'light' ? 'active' : ''}" data-theme-val="light">Clair</button>
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">Villages Enregistrés (${tags.length})</h3>
        <span class="text-2xs text-muted">Persistance locale v2</span>
      </div>
      <div class="space-y-2 max-h-[240px] overflow-y-auto pr-1">
        ${accountsListHtml}
      </div>
    </div>
  `;
  topGrid.appendChild(prefsSection);
  container.appendChild(topGrid);

  // 2. Section Importation & Exportation JSON
  const importSection = document.createElement('div');
  importSection.className = 'card space-y-4 mb-4';
  importSection.innerHTML = `
    <div class="pb-2 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h3 class="text-sm sm:text-base font-bold">Importer / Exporter votre Base JSON</h3>
        <p class="text-2xs text-secondary mt-0.5">Export jeu Clash of Clans (Paramètres → Plus de paramètres → Exporter les données)</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button id="btn-open-paste-drawer" class="btn btn-sm btn-secondary">Coller du JSON</button>
        <button id="btn-download-active-json" class="btn btn-sm btn-ghost" ${!currentVillage ? 'disabled' : ''}>Exporter .json</button>
      </div>
    </div>

    <div id="settings-dropzone" class="dropzone" tabindex="0" role="button" aria-label="Sélectionner ou déposer un fichier JSON">
      <div class="text-accent mb-2 flex justify-center">${getUiIcon('upload', 30)}</div>
      <div class="text-sm font-semibold text-primary">Glissez votre fichier .json ici</div>
      <p class="text-xs text-muted mt-1">ou cliquez pour parcourir vos fichiers (iOS Fichiers / Android / PC)</p>
      <input type="file" id="settings-file-input" accept=".json,application/json" class="hidden">
    </div>

    <!-- Tiroir Collage JSON -->
    <div id="paste-drawer" class="accordion-panel">
      <div class="accordion-inner space-y-2.5 pt-2">
        <textarea id="settings-paste-textarea" rows="5" class="font-mono text-xs" placeholder='Collez ici votre JSON brut { "tag": "#...", "buildings": [...] }'></textarea>
        <button id="btn-apply-paste-json" class="btn btn-sm btn-primary">Analyser et Enregistrer</button>
      </div>
    </div>
  `;
  container.appendChild(importSection);

  // 3. Section Glossaire Interactif Filtrable
  if (glossaryData && glossaryData.terms) {
    const glossarySection = document.createElement('div');
    glossarySection.className = 'card space-y-3';
    const terms = Object.values(glossaryData.terms);

    glossarySection.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-subtle">
        <div>
          <h3 class="text-sm sm:text-base font-bold">Glossaire Clash of Clans</h3>
          <p class="text-2xs text-secondary mt-0.5">Toutes les notions clés expliquées sans jargon</p>
        </div>
        <div class="sm:w-64">
          <input type="search" id="glossary-search-input" placeholder="Filtrer le glossaire...">
        </div>
      </div>
      <div id="glossary-items-list" class="grid-2col gap-2.5 max-h-[380px] overflow-y-auto pr-1"></div>
    `;
    container.appendChild(glossarySection);

    const glossaryListEl = glossarySection.querySelector('#glossary-items-list');
    const renderGlossary = (q = '') => {
      const filtered = terms.filter(t =>
        !q || t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
      );
      glossaryListEl.innerHTML = filtered.map(t => `
        <div class="p-3 rounded-xl bg-sunken border border-subtle space-y-1">
          <div class="text-xs font-semibold text-primary">${escapeHtml(t.term)}</div>
          <p class="text-2xs text-secondary leading-relaxed">${escapeHtml(t.definition)}</p>
        </div>
      `).join('');
    };
    renderGlossary('');

    glossarySection.querySelector('#glossary-search-input')?.addEventListener('input', (e) => {
      renderGlossary(e.target.value.toLowerCase().trim());
    });
  }

  // --- Gestionnaires d'Événements ---

  // QR Code
  const btnGenQr = syncSection.querySelector('#btn-generate-qr');
  const qrDisplay = syncSection.querySelector('#sync-qr-display-container');
  const qrCanvas = syncSection.querySelector('#sync-qr-canvas');
  const syncUrlInput = syncSection.querySelector('#sync-url-text');
  const btnCopySync = syncSection.querySelector('#btn-copy-sync-link');

  if (btnGenQr && currentVillage) {
    btnGenQr.addEventListener('click', async () => {
      try {
        btnGenQr.disabled = true;
        const hash = await compressVillageToHash(currentVillage);
        const fullUrl = `${window.location.origin}/#sync=${hash}`;
        qrDisplay.classList.remove('hidden');
        syncUrlInput.value = fullUrl;
        generateQrCode(qrCanvas, fullUrl);
        showToast('QR Code et lien de synchronisation générés !', 'success');
      } catch (err) {
        showToast('Erreur : ' + err.message, 'error');
      } finally {
        btnGenQr.disabled = false;
      }
    });
  }

  if (btnCopySync && syncUrlInput) {
    btnCopySync.addEventListener('click', () => {
      navigator.clipboard.writeText(syncUrlInput.value).then(() => {
        showToast('Lien copié dans le presse-papier', 'success');
      });
    });
  }

  // Importer depuis hash manuel
  const btnApplyHash = syncSection.querySelector('#btn-apply-sync-hash');
  const manualHashInput = syncSection.querySelector('#manual-sync-hash-input');
  if (btnApplyHash && manualHashInput) {
    btnApplyHash.addEventListener('click', async () => {
      const raw = manualHashInput.value.trim();
      if (!raw) return;
      try {
        const extracted = raw.includes('sync=') ? raw.split('sync=')[1] : raw;
        const village = await decompressVillageFromHash(extracted);
        store.importVillage(village);
        processAndRenderVillage(village);
        showToast(`Village ${village.tag} synchronisé avec succès !`, 'success');
      } catch (err) {
        showToast('Lien/Hash invalide : ' + err.message, 'error');
      }
    });
  }

  // Recharger depuis /api/village
  syncSection.querySelector('#btn-reload-server')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/village?t=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      store.importVillage(data);
      processAndRenderVillage(data);
      showToast(`Base serveur (${data.tag}) chargée !`, 'success');
    } catch (err) {
      showToast('Impossible de contacter le serveur local/Vercel : ' + err.message, 'error');
    }
  });

  // Thème Segmented Control
  prefsSection.querySelectorAll('.theme-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-theme-val');
      store.setTheme(val);
      applyTheme(val);
      prefsSection.querySelectorAll('.theme-pick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showToast(`Thème : ${val === 'auto' ? 'Automatique' : val === 'dark' ? 'Sombre' : 'Clair'}`, 'info');
    });
  });

  // Dropzone fichier
  const dropzone = importSection.querySelector('#settings-dropzone');
  const fileInput = importSection.querySelector('#settings-file-input');
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleImportFile(e.target.files[0], container, glossaryData);
    });
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      if (e.dataTransfer.files.length > 0) handleImportFile(e.dataTransfer.files[0], container, glossaryData);
    });
  }

  // Tiroir collage JSON
  const btnOpenPaste = importSection.querySelector('#btn-open-paste-drawer');
  const pasteDrawer = importSection.querySelector('#paste-drawer');
  const btnApplyPaste = importSection.querySelector('#btn-apply-paste-json');
  const pasteTextarea = importSection.querySelector('#settings-paste-textarea');

  if (btnOpenPaste && pasteDrawer) {
    btnOpenPaste.addEventListener('click', () => {
      pasteDrawer.classList.toggle('is-open');
    });
  }

  if (btnApplyPaste && pasteTextarea) {
    btnApplyPaste.addEventListener('click', () => {
      const raw = pasteTextarea.value.trim();
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        store.importVillage(parsed);
        processAndRenderVillage(parsed);
        showToast('Village importé avec succès !', 'success');
      } catch (err) {
        showToast('JSON invalide : ' + err.message, 'error');
      }
    });
  }

  // Export JSON
  const btnDownload = importSection.querySelector('#btn-download-active-json');
  if (btnDownload && currentVillage) {
    btnDownload.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(currentVillage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `village_${currentVillage.tag || 'export'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Téléchargement lancé', 'info');
    });
  }

  // Comptes Multi-Villages
  prefsSection.querySelectorAll('.btn-activate-account').forEach(b => {
    b.addEventListener('click', () => {
      const tag = b.getAttribute('data-tag');
      store.setActiveTag(tag);
      const v = store.getActiveVillageData();
      processAndRenderVillage(v);
      showToast(`Village ${tag} activé`, 'success');
    });
  });

  prefsSection.querySelectorAll('.btn-delete-account').forEach(b => {
    b.addEventListener('click', () => {
      const tag = b.getAttribute('data-tag');
      if (confirm(`Supprimer le village ${tag} ?`)) {
        store.deleteAccount(tag);
        const v = store.getActiveVillageData();
        processAndRenderVillage(v);
        renderSettingsView(container, glossaryData);
        showToast(`Village ${tag} supprimé`, 'info');
      }
    });
  });
}

function handleImportFile(file, container, glossaryData) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      store.importVillage(parsed);
      processAndRenderVillage(parsed);
      showToast('Fichier importé avec succès !', 'success');
    } catch (err) {
      showToast('Fichier invalide : ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}
