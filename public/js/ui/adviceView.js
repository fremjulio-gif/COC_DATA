/**
 * CoC Freemium Optimizer — Vue Conseils Personnalisés
 * Grille déclarative filtrable, volet "Pourquoi ?", glossaire et mode Débutant/Avancé
 */

import { store } from '../store.js';

let currentFilter = {
  urgency: 'all',
  category: 'all',
  searchQuery: ''
};

export function renderAdviceView(container, adviceList = [], glossaryData = null) {
  if (!container) return;
  container.innerHTML = '';

  const beginnerMode = store.getState().beginnerMode || false;

  // 1. Barre de Filtres & Recherche
  const filterToolbar = document.createElement('div');
  filterToolbar.className = 'card mb-4 space-y-3';
  filterToolbar.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex-1">
        <input type="search" id="advice-search-input" placeholder="Rechercher un conseil (ex. héros, remparts, ouvriers...)" value="${currentFilter.searchQuery}" class="w-full">
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-toggle-beginner-mode" class="btn btn-sm ${beginnerMode ? 'btn-primary' : 'btn-secondary'}">
          ${beginnerMode ? 'Mode : Débutant (Simplifié)' : 'Mode : Avancé (Chiffré)'}
        </button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-subtle">
      <span class="text-2xs text-muted mr-1">Urgence :</span>
      <button class="btn btn-sm ${currentFilter.urgency === 'all' ? 'btn-secondary active' : 'btn-ghost'} urgency-filter-btn" data-urgency="all">Toutes</button>
      <button class="btn btn-sm ${currentFilter.urgency === 'critique' ? 'btn-secondary active' : 'btn-ghost'} urgency-filter-btn" data-urgency="critique">Critique</button>
      <button class="btn btn-sm ${currentFilter.urgency === 'important' ? 'btn-secondary active' : 'btn-ghost'} urgency-filter-btn" data-urgency="important">Important</button>
      <button class="btn btn-sm ${currentFilter.urgency === 'utile' ? 'btn-secondary active' : 'btn-ghost'} urgency-filter-btn" data-urgency="utile">Utile</button>
    </div>
  `;
  container.appendChild(filterToolbar);

  // 2. Conteneur des cartes de conseils
  const cardsContainer = document.createElement('div');
  cardsContainer.id = 'advice-cards-container';
  cardsContainer.className = 'space-y-3';
  container.appendChild(cardsContainer);

  renderAdviceCards(cardsContainer, adviceList, glossaryData, beginnerMode);

  // Écouteurs d'événements pour les filtres
  const searchInput = filterToolbar.querySelector('#advice-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilter.searchQuery = e.target.value.toLowerCase().trim();
      renderAdviceCards(cardsContainer, adviceList, glossaryData, store.getState().beginnerMode);
    });
  }

  const urgencyBtns = filterToolbar.querySelectorAll('.urgency-filter-btn');
  urgencyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      urgencyBtns.forEach(b => {
        b.classList.remove('btn-secondary', 'active');
        b.classList.add('btn-ghost');
      });
      btn.classList.add('btn-secondary', 'active');
      btn.classList.remove('btn-ghost');

      currentFilter.urgency = btn.getAttribute('data-urgency');
      renderAdviceCards(cardsContainer, adviceList, glossaryData, store.getState().beginnerMode);
    });
  });

  const beginnerBtn = filterToolbar.querySelector('#btn-toggle-beginner-mode');
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

function renderAdviceCards(container, adviceList, glossaryData, beginnerMode) {
  if (!container) return;
  container.innerHTML = '';

  const state = store.getState();
  const hiddenIds = new Set(state.hiddenAdviceIds || []);
  const completedIds = new Set(state.completedAdviceIds || []);

  const filtered = adviceList.filter(item => {
    if (hiddenIds.has(item.id)) return false;
    if (currentFilter.urgency !== 'all' && item.urgence !== currentFilter.urgency) return false;
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
        Aucun conseil ne correspond aux critères de filtre sélectionnés.
      </div>
    `;
    return;
  }

  filtered.forEach(advice => {
    const isCompleted = completedIds.has(advice.id);
    const card = document.createElement('div');
    card.className = `card ${advice.urgence === 'critique' ? 'card-danger' : advice.urgence === 'important' ? 'card-warning' : ''} ${isCompleted ? 'opacity-60' : ''}`;

    const urgencyBadgeClass = advice.urgence === 'critique' 
      ? 'badge-danger' 
      : advice.urgence === 'important' 
        ? 'badge-warning' 
        : 'badge-accent';

    const verifiedTag = advice.verified === false
      ? '<span class="text-2xs text-warning ml-2 font-mono">(à vérifier)</span>'
      : '';

    card.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div class="space-y-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="badge ${urgencyBadgeClass}">
              <span class="badge-dot"></span>
              <span>${advice.urgence.toUpperCase()}</span>
            </span>
            <span class="text-2xs uppercase tracking-wider text-muted font-medium">${advice.categorie}</span>
            ${isCompleted ? '<span class="badge badge-success">Terminé</span>' : ''}
          </div>
          <h3 class="text-sm font-semibold text-primary pt-0.5">${advice.titre}</h3>
          <p class="text-xs text-secondary leading-relaxed">${advice.explication_simple}</p>
        </div>
        <div class="flex items-center gap-1.5 self-end sm:self-start flex-shrink-0 pt-1">
          <button class="btn btn-sm btn-ghost btn-toggle-why" data-target="drawer-${advice.id}">
            <span>Pourquoi ?</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <button class="btn btn-sm ${isCompleted ? 'btn-ghost text-muted' : 'btn-secondary'} btn-complete-advice" data-id="${advice.id}">
            ${isCompleted ? 'Rétablir' : 'Fait'}
          </button>
        </div>
      </div>

      <!-- Volet Déroulant "Pourquoi ?" -->
      <div id="drawer-${advice.id}" class="hidden mt-3 pt-3 border-t border-subtle text-xs space-y-2.5">
        <div>
          <span class="font-semibold text-primary">Impact concret :</span>
          <p class="text-2xs text-secondary mt-0.5">${advice.pourquoi}</p>
        </div>
        <div>
          <span class="font-semibold text-primary">Action recommandée :</span>
          <p class="text-2xs text-secondary mt-0.5">${advice.action}</p>
        </div>
        ${!beginnerMode && advice.erreur_courante_a_eviter ? `
          <div>
            <span class="font-semibold text-warning">Erreur fréquente à éviter :</span>
            <p class="text-2xs text-secondary mt-0.5">${advice.erreur_courante_a_eviter}</p>
          </div>
        ` : ''}
        ${!beginnerMode && advice.cout_estime ? `
          <div class="flex justify-between text-2xs pt-1 border-t border-subtle text-muted">
            <span>Coût estimé : <strong class="text-primary">${advice.cout_estime}</strong> ${verifiedTag}</span>
            <span>Durée : <strong class="text-primary">${advice.duree_estimee || 'N/A'}</strong></span>
          </div>
        ` : ''}
      </div>
    `;

    // Gestion de l'accordéon "Pourquoi ?"
    const toggleWhyBtn = card.querySelector('.btn-toggle-why');
    const drawer = card.querySelector(`#drawer-${advice.id}`);
    if (toggleWhyBtn && drawer) {
      toggleWhyBtn.addEventListener('click', () => {
        const isHidden = drawer.classList.contains('hidden');
        if (isHidden) {
          drawer.classList.remove('hidden');
          toggleWhyBtn.classList.add('text-accent');
        } else {
          drawer.classList.add('hidden');
          toggleWhyBtn.classList.remove('text-accent');
        }
      });
    }

    // Bouton marquer comme fait
    const completeBtn = card.querySelector('.btn-complete-advice');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        store.toggleAdviceCompleted(advice.id);
        renderAdviceCards(container, adviceList, glossaryData, beginnerMode);
      });
    }

    container.appendChild(card);
  });
}
