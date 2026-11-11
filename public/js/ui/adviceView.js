/**
 * CoC Freemium Optimizer — Vue Conseils Personnalisés
 * Filtres par urgence & catégorie, accordéon fluide "Pourquoi ?", glossaire cliquable et mode Débutant/Avancé
 */

import { store } from '../store.js';
import { escapeHtml, openModalSheet } from '../utils.js';
import { getUiIcon } from './icons.js';

let currentFilter = {
  urgency: 'all',
  category: 'all',
  searchQuery: ''
};

const CATEGORY_LABELS = {
  all: 'Toutes catégories',
  constructeurs: 'Constructeurs',
  heros: 'Héros',
  héros: 'Héros',
  general: 'Général',
  général: 'Général',
  defense: 'Défense',
  défense: 'Défense',
  economie: 'Économie',
  économie: 'Économie',
  farm: 'Farm',
  remparts: 'Remparts',
  laboratoire: 'Laboratoire',
  guerre: 'Guerre',
  pieges: 'Pièges',
  pièges: 'Pièges'
};

export function renderAdviceView(container, adviceList = [], glossaryData = null) {
  if (!container) return;
  container.innerHTML = '';

  const state = store.getState();
  const beginnerMode = state.beginnerMode || false;

  // Calcul des compteurs rapides
  const completedSet = new Set(state.completedAdviceIds || []);
  const hiddenSet = new Set(state.hiddenAdviceIds || []);
  const visibleAdvice = adviceList.filter(a => !hiddenSet.has(a.id));
  const critCount = visibleAdvice.filter(a => !completedSet.has(a.id) && a.urgence === 'critique').length;
  const impCount = visibleAdvice.filter(a => !completedSet.has(a.id) && a.urgence === 'important').length;
  const doneCount = visibleAdvice.filter(a => completedSet.has(a.id)).length;

  // Récupération dynamique des catégories présentes
  const categories = ['all', ...new Set(visibleAdvice.map(a => a.categorie).filter(Boolean))];

  // 1. Barre de Synthèse & Filtres Interactifs
  const toolbar = document.createElement('div');
  toolbar.className = 'card space-y-3 mb-4';

  const catPillsHtml = categories.map(cat => {
    const label = CATEGORY_LABELS[String(cat).toLowerCase()] || (cat.charAt(0).toUpperCase() + cat.slice(1));
    const active = currentFilter.category === cat ? 'btn-secondary active' : 'btn-ghost';
    return `<button class="btn btn-sm ${active} advice-cat-btn" data-category="${escapeHtml(cat)}">${escapeHtml(label)}</button>`;
  }).join('');

  toolbar.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-subtle">
      <div class="flex flex-wrap items-center gap-2">
        <span class="badge badge-danger">${critCount} critique${critCount > 1 ? 's' : ''}</span>
        <span class="badge badge-warning">${impCount} important${impCount > 1 ? 's' : ''}</span>
        <span class="badge badge-success">${doneCount} terminé${doneCount > 1 ? 's' : ''}</span>
      </div>
      <button id="btn-toggle-beginner-mode" class="btn btn-sm ${beginnerMode ? 'btn-primary' : 'btn-secondary'}">
        ${beginnerMode ? 'Mode : Débutant (Simplifié)' : 'Mode : Avancé (Chiffré)'}
      </button>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div class="flex-1">
        <input type="search" id="advice-search-input" placeholder="Rechercher un conseil (héros, remparts, ouvriers...)" value="${escapeHtml(currentFilter.searchQuery)}">
      </div>
      <div class="segmented-control" role="tablist" aria-label="Filtrer par urgence">
        <button class="segmented-item ${currentFilter.urgency === 'all' ? 'active' : ''} urgency-filter-btn" data-urgency="all">Toutes</button>
        <button class="segmented-item ${currentFilter.urgency === 'critique' ? 'active' : ''} urgency-filter-btn" data-urgency="critique">Critique</button>
        <button class="segmented-item ${currentFilter.urgency === 'important' ? 'active' : ''} urgency-filter-btn" data-urgency="important">Important</button>
        <button class="segmented-item ${currentFilter.urgency === 'utile' ? 'active' : ''} urgency-filter-btn" data-urgency="utile">Utile</button>
      </div>
    </div>

    <div class="flex items-center gap-1.5 overflow-x-auto pt-1">
      ${catPillsHtml}
    </div>
  `;
  container.appendChild(toolbar);

  // 2. Conteneur des Cartes de Conseils
  const cardsContainer = document.createElement('div');
  cardsContainer.id = 'advice-cards-container';
  cardsContainer.className = 'space-y-3';
  container.appendChild(cardsContainer);

  renderAdviceCards(cardsContainer, adviceList, glossaryData, beginnerMode);

  // Événements Filtres
  const searchInput = toolbar.querySelector('#advice-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilter.searchQuery = e.target.value.toLowerCase().trim();
      renderAdviceCards(cardsContainer, adviceList, glossaryData, store.getState().beginnerMode);
    });
  }

  toolbar.querySelectorAll('.urgency-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toolbar.querySelectorAll('.urgency-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter.urgency = btn.getAttribute('data-urgency');
      renderAdviceCards(cardsContainer, adviceList, glossaryData, store.getState().beginnerMode);
    });
  });

  toolbar.querySelectorAll('.advice-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toolbar.querySelectorAll('.advice-cat-btn').forEach(b => {
        b.classList.remove('btn-secondary', 'active');
        b.classList.add('btn-ghost');
      });
      btn.classList.add('btn-secondary', 'active');
      btn.classList.remove('btn-ghost');
      currentFilter.category = btn.getAttribute('data-category');
      renderAdviceCards(cardsContainer, adviceList, glossaryData, store.getState().beginnerMode);
    });
  });

  const beginnerBtn = toolbar.querySelector('#btn-toggle-beginner-mode');
  if (beginnerBtn) {
    beginnerBtn.addEventListener('click', () => {
      store.toggleBeginnerMode();
      const updatedMode = store.getState().beginnerMode;
      beginnerBtn.textContent = updatedMode ? 'Mode : Débutant (Simplifié)' : 'Mode : Avancé (Chiffré)';
      beginnerBtn.className = `btn btn-sm ${updatedMode ? 'btn-primary' : 'btn-secondary'}`;
      renderAdviceCards(cardsContainer, adviceList, glossaryData, updatedMode);
    });
  }
}

function findMatchingGlossaryTerms(advice, glossaryData) {
  if (!glossaryData || !glossaryData.terms) return [];
  const haystack = `${advice.titre || ''} ${advice.explication_simple || ''} ${advice.pourquoi || ''} ${advice.action || ''}`.toLowerCase();
  const matches = [];
  Object.entries(glossaryData.terms).forEach(([key, entry]) => {
    if (haystack.includes(key.toLowerCase())) {
      matches.push({ key, ...entry });
    }
  });
  return matches.slice(0, 3);
}

function renderAdviceCards(container, adviceList, glossaryData, beginnerMode) {
  if (!container) return;
  container.innerHTML = '';

  const state = store.getState();
  const hiddenIds = new Set(state.hiddenAdviceIds || []);
  const completedIds = new Set(state.completedAdviceIds || []);

  const filtered = adviceList.filter(item => {
    if (hiddenIds.has(item.id)) return false;
    if (currentFilter.urgency !== 'all' && item.urgence !== currentFilter.urgency) return false;
    if (currentFilter.category !== 'all' && item.categorie !== currentFilter.category) return false;
    if (currentFilter.searchQuery) {
      const q = currentFilter.searchQuery;
      const matchTitle = item.titre?.toLowerCase().includes(q);
      const matchDesc = item.explication_simple?.toLowerCase().includes(q);
      const matchCat = item.categorie?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card p-6 text-center text-muted text-xs">
        Aucun conseil ne correspond à vos filtres actuels.
      </div>
    `;
    return;
  }

  filtered.forEach(advice => {
    const isCompleted = completedIds.has(advice.id);
    const card = document.createElement('div');
    const borderCls = advice.urgence === 'critique'
      ? 'card-danger'
      : advice.urgence === 'important'
        ? 'card-warning'
        : 'card-accent';

    card.className = `card ${borderCls} ${isCompleted ? 'opacity-60' : ''}`;

    const urgencyBadgeClass = advice.urgence === 'critique'
      ? 'badge-danger'
      : advice.urgence === 'important'
        ? 'badge-warning'
        : 'badge-accent';

    const verifiedTag = advice.verified === false
      ? '<span class="badge badge-warning ml-2">(à vérifier)</span>'
      : '';

    const glossaryMatches = findMatchingGlossaryTerms(advice, glossaryData);
    const glossaryChipsHtml = glossaryMatches.length > 0
      ? `
        <div class="flex flex-wrap items-center gap-1.5 pt-1">
          <span class="text-2xs text-muted">Notions :</span>
          ${glossaryMatches.map(m => `
            <button type="button" class="glossary-chip" data-term-key="${escapeHtml(m.key)}">
              ${getUiIcon('info', 12)}
              <span>${escapeHtml(m.term)}</span>
            </button>
          `).join('')}
        </div>
      `
      : '';

    card.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div class="space-y-1.5 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge ${urgencyBadgeClass}">
              ${advice.urgence === 'critique' && !isCompleted ? '<span class="pulse-dot" style="width:6px;height:6px;"></span>' : '<span class="badge-dot"></span>'}
              <span>${escapeHtml((advice.urgence || 'utile').toUpperCase())}</span>
            </span>
            <span class="text-2xs uppercase tracking-wider text-muted font-semibold">${escapeHtml(advice.categorie)}</span>
            ${isCompleted ? `<span class="badge badge-success">${getUiIcon('check', 11)} Terminé</span>` : ''}
          </div>
          <h3 class="text-sm sm:text-base font-semibold text-primary">${escapeHtml(advice.titre)}</h3>
          <p class="text-xs text-secondary leading-relaxed">${escapeHtml(advice.explication_simple)}</p>
        </div>

        <div class="flex items-center gap-1.5 self-end sm:self-start flex-shrink-0">
          <button class="btn btn-sm btn-ghost btn-toggle-why" aria-expanded="false">
            <span>Pourquoi ?</span>
            ${getUiIcon('chevron')}
          </button>
          <button class="btn btn-sm ${isCompleted ? 'btn-ghost text-muted' : 'btn-secondary'} btn-complete-advice" data-id="${escapeHtml(advice.id)}">
            ${isCompleted ? 'Rétablir' : `${getUiIcon('check', 13)} Fait`}
          </button>
        </div>
      </div>

      <!-- Accordéon Fluide "Pourquoi ?" -->
      <div class="accordion-panel advice-drawer">
        <div class="accordion-inner">
          <div class="mt-3 pt-3 border-t border-subtle text-xs space-y-2.5">
            <div class="p-2.5 rounded-lg bg-sunken border border-subtle">
              <span class="font-semibold text-primary">Action recommandée :</span>
              <p class="text-2xs text-secondary mt-0.5">${escapeHtml(advice.action)}</p>
            </div>
            <div>
              <span class="font-semibold text-primary">Impact concret :</span>
              <p class="text-2xs text-secondary mt-0.5">${escapeHtml(advice.pourquoi)}</p>
            </div>
            ${!beginnerMode && advice.erreur_courante_a_eviter ? `
              <div>
                <span class="font-semibold text-warning">Erreur fréquente à éviter :</span>
                <p class="text-2xs text-secondary mt-0.5">${escapeHtml(advice.erreur_courante_a_eviter)}</p>
              </div>
            ` : ''}
            ${!beginnerMode && advice.cout_estime ? `
              <div class="flex flex-wrap justify-between gap-2 text-2xs pt-2 border-t border-subtle text-muted">
                <span>Coût estimé : <strong class="text-primary">${escapeHtml(advice.cout_estime)}</strong> ${verifiedTag}</span>
                <span>Durée : <strong class="text-primary">${escapeHtml(advice.duree_estimee || 'N/A')}</strong></span>
              </div>
            ` : ''}
            ${glossaryChipsHtml}
          </div>
        </div>
      </div>
    `;

    // Accordéon fluide CSS Grid 0fr -> 1fr
    const toggleWhyBtn = card.querySelector('.btn-toggle-why');
    const drawer = card.querySelector('.advice-drawer');
    if (toggleWhyBtn && drawer) {
      toggleWhyBtn.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('is-open');
        toggleWhyBtn.classList.toggle('is-expanded', isOpen);
        toggleWhyBtn.classList.toggle('text-accent', isOpen);
        toggleWhyBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // Boutons Glossaire interactif
    card.querySelectorAll('.glossary-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.getAttribute('data-term-key');
        const entry = glossaryData?.terms?.[key];
        if (!entry) return;
        openModalSheet({
          title: entry.term,
          bodyHtml: `
            <div class="space-y-3">
              <div class="p-4 rounded-xl bg-sunken border border-subtle">
                <p class="text-sm text-primary leading-relaxed">${escapeHtml(entry.definition)}</p>
              </div>
              <p class="text-2xs text-muted">Astuce : retrouvez tous les termes expliqués dans l'onglet Réglages → Glossaire.</p>
            </div>
          `
        });
      });
    });

    // Marquer comme fait
    const completeBtn = card.querySelector('.btn-complete-advice');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        store.toggleAdviceCompleted(advice.id);
        renderAdviceCards(container, adviceList, glossaryData, store.getState().beginnerMode);
      });
    }

    container.appendChild(card);
  });
}
