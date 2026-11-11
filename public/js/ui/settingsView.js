/**
 * CoC Freemium Optimizer — Vue Réglages, Import & Synchronisation
 * Import JSON, gestion multi-comptes, QR Code de synchronisation et glossaire
 */

import { store } from '../store.js';
import { compressVillageToHash, generateQrCode } from '../sync.js';
import { showToast, processAndRenderVillage } from '../app.js';

export function renderSettingsView(container, glossaryData) {
  if (!container) return;
  container.innerHTML = '';

  const state = store.getState();
  const currentVillage = store.getActiveVillageData();

  // 1. Section Synchronisation Desktop <-> Mobile
  const syncSection = document.createElement('div');
  syncSection.className = 'card space-y-3 mb-4';
  syncSection.innerHTML = `
    <div class="flex items-center justify-between pb-2 border-b border-subtle">
      <div>
        <h3 class="text-sm font-semibold">Synchronisation Inter-Appareils</h3>
        <p class="text-2xs text-secondary mt-0.5">Transférez instantanément votre village vers votre mobile ou un autre PC</p>
      </div>
      <button id="btn-generate-qr" class="btn btn-sm btn-primary">Générer QR & Lien</button>
    </div>
    <div id="sync-qr-display-container" class="hidden pt-3 border-t border-subtle flex flex-col items-center gap-3">
      <div class="p-3 bg-white rounded-xl shadow-md">
        <canvas id="sync-qr-canvas" width="200" height="200"></canvas>
      </div>
      <p class="text-2xs text-secondary text-center max-w-sm">
        Scannez ce QR code avec l'appareil photo de votre smartphone pour ouvrir l'application avec exactement votre village.
      </p>
      <div class="flex items-center gap-2 w-full max-w-md">
        <input type="text" id="sync-url-text" readonly class="text-xs font-mono text-secondary p-2 bg-sunken rounded-lg flex-1 truncate">
        <button id="btn-copy-sync-link" class="btn btn-sm btn-secondary flex-shrink-0">Copier</button>
      </div>
    </div>
  `;
  container.appendChild(syncSection);

  // 2. Section Importation & Exportation
  const importSection = document.createElement('div');
  importSection.className = 'card space-y-4 mb-4';
  importSection.innerHTML = `
    <div class="pb-2 border-b border-subtle">
      <h3 class="text-sm font-semibold">Gestion du Fichier de Village</h3>
      <p class="text-2xs text-secondary mt-0.5">Glissez-déposez ou collez votre fichier village_state.json</p>
    </div>

    <!-- Zone de dépôt de fichier -->
    <div id="settings-dropzone" class="p-6 border-2 border-dashed border-subtle hover:border-accent rounded-xl text-center cursor-pointer transition-colors bg-sunken">
      <svg class="mx-auto text-muted mb-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
      <div class="text-xs font-medium text-primary">Glissez votre fichier .json ici</div>
      <p class="text-2xs text-muted mt-1">ou cliquez pour sélectionner un fichier</p>
      <input type="file" id="settings-file-input" accept=".json" class="hidden">
    </div>

    <!-- Actions de collage et export -->
    <div class="flex flex-wrap items-center gap-2 pt-2">
      <button id="btn-open-paste-drawer" class="btn btn-sm btn-secondary">Coller du JSON brut</button>
      <button id="btn-download-active-json" class="btn btn-sm btn-ghost">Télécharger .json</button>
    </div>

    <!-- Tiroir Collage JSON -->
    <div id="paste-drawer" class="hidden space-y-2 pt-3 border-t border-subtle">
      <textarea id="settings-paste-textarea" rows="5" class="w-full text-xs font-mono p-3 bg-sunken rounded-lg border border-subtle" placeholder='Collez votre structure JSON { "tag": "#...", "buildings": [...] }'></textarea>
      <button id="btn-apply-paste-json" class="btn btn-sm btn-primary">Appliquer et Enregistrer</button>
    </div>
  `;
  container.appendChild(importSection);

  // 3. Section Multi-Comptes
  const accountsSection = document.createElement('div');
  accountsSection.className = 'card space-y-3 mb-4';
  const accounts = state.accounts || {};
  const tags = Object.keys(accounts);

  let accountsListHtml = '';
  if (tags.length === 0) {
    accountsListHtml = '<p class="text-2xs text-muted">Aucun compte enregistré en mémoire.</p>';
  } else {
    tags.forEach(t => {
      const isActive = (t === state.activeTag);
      accountsListHtml += `
        <div class="flex items-center justify-between p-2.5 rounded-lg bg-sunken border border-subtle text-xs">
          <div class="flex items-center gap-2">
            <span class="tabular-nums font-semibold text-primary">${t}</span>
            ${isActive ? '<span class="badge badge-accent">Actif</span>' : ''}
          </div>
          <div class="flex items-center gap-1.5">
            ${!isActive ? `<button class="btn btn-sm btn-secondary btn-activate-account" data-tag="${t}">Activer</button>` : ''}
            <button class="btn btn-sm btn-ghost text-danger btn-delete-account" data-tag="${t}" title="Supprimer">Supprimer</button>
          </div>
        </div>
      `;
    });
  }

  accountsSection.innerHTML = `
    <div class="pb-2 border-b border-subtle">
      <h3 class="text-sm font-semibold">Comptes Enregistrés (${tags.length})</h3>
      <p class="text-2xs text-secondary mt-0.5">Basculez facilement entre vos différents villages sauvegardés</p>
    </div>
    <div class="space-y-2 mt-2">
      ${accountsListHtml}
    </div>
  `;
  container.appendChild(accountsSection);

  // 4. Section Glossaire Interactif
  if (glossaryData && glossaryData.terms) {
    const glossarySection = document.createElement('div');
    glossarySection.className = 'card space-y-3';
    let termsHtml = '';
    Object.values(glossaryData.terms).forEach(t => {
      termsHtml += `
        <details class="p-2.5 rounded-lg bg-sunken border border-subtle text-xs group">
          <summary class="font-medium text-primary cursor-pointer select-none">${t.term}</summary>
          <p class="text-2xs text-secondary mt-1.5 leading-relaxed">${t.definition}</p>
        </details>
      `;
    });

    glossarySection.innerHTML = `
      <div class="pb-2 border-b border-subtle">
        <h3 class="text-sm font-semibold">Glossaire Clash of Clans</h3>
        <p class="text-2xs text-secondary mt-0.5">Explications claires des notions techniques pour joueurs non experts</p>
      </div>
      <div class="space-y-2 mt-2 max-h-[380px] overflow-y-auto pr-1">
        ${termsHtml}
      </div>
    `;
    container.appendChild(glossarySection);
  }

  // --- Gestionnaires d'Événements ---

  // Génération QR Code
  const btnGenQr = syncSection.querySelector('#btn-generate-qr');
  const qrDisplay = syncSection.querySelector('#sync-qr-display-container');
  const qrCanvas = syncSection.querySelector('#sync-qr-canvas');
  const syncUrlInput = syncSection.querySelector('#sync-url-text');
  const btnCopySync = syncSection.querySelector('#btn-copy-sync-link');

  if (btnGenQr && currentVillage) {
    btnGenQr.addEventListener('click', async () => {
      try {
        btnGenQr.disabled = true;
        btnGenQr.textContent = 'Génération...';
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
        btnGenQr.textContent = 'Générer QR & Lien';
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

  // Glisser-déposer de fichier
  const dropzone = importSection.querySelector('#settings-dropzone');
  const fileInput = importSection.querySelector('#settings-file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleImportFile(e.target.files[0], container, glossaryData);
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-accent');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('border-accent'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-accent');
      if (e.dataTransfer.files.length > 0) {
        handleImportFile(e.dataTransfer.files[0], container, glossaryData);
      }
    });
  }

  // Coller JSON
  const btnOpenPaste = importSection.querySelector('#btn-open-paste-drawer');
  const pasteDrawer = importSection.querySelector('#paste-drawer');
  const btnApplyPaste = importSection.querySelector('#btn-apply-paste-json');
  const pasteTextarea = importSection.querySelector('#settings-paste-textarea');

  if (btnOpenPaste && pasteDrawer) {
    btnOpenPaste.addEventListener('click', () => {
      pasteDrawer.classList.toggle('hidden');
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
        renderSettingsView(container, glossaryData);
      } catch (err) {
        showToast('JSON invalide : ' + err.message, 'error');
      }
    });
  }

  // Télécharger JSON
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

  // Gestion des comptes
  const activateBtns = accountsSection.querySelectorAll('.btn-activate-account');
  activateBtns.forEach(b => {
    b.addEventListener('click', () => {
      const tag = b.getAttribute('data-tag');
      store.setActiveTag(tag);
      const v = store.getActiveVillageData();
      processAndRenderVillage(v);
      renderSettingsView(container, glossaryData);
      showToast(`Village ${tag} activé`, 'success');
    });
  });

  const deleteBtns = accountsSection.querySelectorAll('.btn-delete-account');
  deleteBtns.forEach(b => {
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
      renderSettingsView(container, glossaryData);
    } catch (err) {
      showToast('Fichier invalide : ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}
