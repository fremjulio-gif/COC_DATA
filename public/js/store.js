/**
 * CoC Freemium Optimizer — Store Réactif & Persistance Versionnée
 * Support du multi-comptes, migration de schéma v1 -> v2, abonnements d'état
 */

export const STORAGE_KEY = 'coc_freemium_optimizer_v2';
export const LEGACY_STORAGE_KEY = 'coc_optimizer_village_data';

export class AppStore {
  constructor(initialState = {}) {
    this.listeners = new Set();
    this.state = {
      version: 2,
      theme: 'auto', // 'auto' | 'dark' | 'light'
      activeTag: null,
      accounts: {}, // { [tag]: { villageData, lastUpdated, name } }
      analysis: null,
      hiddenAdviceIds: [], // IDs de conseils masqués
      completedAdviceIds: [], // IDs de conseils marqués comme faits
      beginnerMode: false,
      ...initialState
    };
  }

  /**
   * Charge l'état depuis le localStorage avec migration transparente
   */
  loadFromStorage(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return this.state;

    try {
      // 1. Tente de charger le schéma V2
      const rawV2 = storage.getItem(STORAGE_KEY);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        if (parsed && parsed.version === 2) {
          this.state = {
            ...this.state,
            ...parsed,
            // Conserve les sets sous forme de tableaux pour JSON
            hiddenAdviceIds: parsed.hiddenAdviceIds || [],
            completedAdviceIds: parsed.completedAdviceIds || []
          };
          this.notify();
          return this.state;
        }
      }

      // 2. Migration de l'ancien schéma V1 (si existant)
      const rawLegacy = storage.getItem(LEGACY_STORAGE_KEY);
      if (rawLegacy) {
        const legacyData = JSON.parse(rawLegacy);
        if (legacyData && legacyData.tag) {
          const tag = legacyData.tag;
          this.state.accounts[tag] = {
            villageData: legacyData,
            lastUpdated: legacyData.timestamp || Date.now(),
            name: tag
          };
          this.state.activeTag = tag;
          this.saveToStorage(storage);
          this.notify();
          return this.state;
        }
      }
    } catch (err) {
      console.warn('[Store] Impossible de lire le localStorage :', err);
    }

    return this.state;
  }

  /**
   * Sauvegarde l'état actuel dans le localStorage
   */
  saveToStorage(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return;

    try {
      const serialized = {
        version: 2,
        theme: this.state.theme,
        activeTag: this.state.activeTag,
        accounts: this.state.accounts,
        hiddenAdviceIds: this.state.hiddenAdviceIds,
        completedAdviceIds: this.state.completedAdviceIds,
        beginnerMode: this.state.beginnerMode
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch (err) {
      console.warn('[Store] Impossible de sauvegarder dans le localStorage :', err);
    }
  }

  /**
   * Enregistre ou met à jour une base importée
   * @param {Object} villageData JSON brut du village
   * @param {Object} storage Adaptateur localStorage
   */
  importVillage(villageData, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!villageData || typeof villageData !== 'object') {
      throw new Error('Données de village invalides');
    }

    const tag = villageData.tag || '#VILLAGE_LOCAL';
    const timestamp = villageData.timestamp || Math.floor(Date.now() / 1000);

    this.state.accounts[tag] = {
      villageData,
      lastUpdated: timestamp,
      name: tag
    };
    this.state.activeTag = tag;

    this.saveToStorage(storage);
    this.notify();
    return tag;
  }

  /**
   * Supprime un compte enregistré
   */
  deleteAccount(tag, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!tag || !this.state.accounts[tag]) return;

    delete this.state.accounts[tag];
    if (this.state.activeTag === tag) {
      const remainingTags = Object.keys(this.state.accounts);
      this.state.activeTag = remainingTags.length > 0 ? remainingTags[0] : null;
      this.state.analysis = null;
    }

    this.saveToStorage(storage);
    this.notify();
  }

  /**
   * Définit le village actif
   */
  setActiveTag(tag) {
    if (this.state.accounts[tag]) {
      this.state.activeTag = tag;
      this.notify();
    }
  }

  /**
   * Récupère les données brutes du village actif
   */
  getActiveVillageData() {
    if (!this.state.activeTag) return null;
    const account = this.state.accounts[this.state.activeTag];
    return account ? account.villageData : null;
  }

  /**
   * Met à jour le rapport d'analyse en mémoire
   */
  setAnalysis(analysis) {
    this.state.analysis = analysis;
    this.notify();
  }

  /**
   * Bascule le statut d'un conseil (masqué ou complété)
   */
  toggleAdviceHidden(adviceId, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    const idx = this.state.hiddenAdviceIds.indexOf(adviceId);
    if (idx >= 0) {
      this.state.hiddenAdviceIds.splice(idx, 1);
    } else {
      this.state.hiddenAdviceIds.push(adviceId);
    }
    this.saveToStorage(storage);
    this.notify();
  }

  toggleAdviceCompleted(adviceId, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    const idx = this.state.completedAdviceIds.indexOf(adviceId);
    if (idx >= 0) {
      this.state.completedAdviceIds.splice(idx, 1);
    } else {
      this.state.completedAdviceIds.push(adviceId);
    }
    this.saveToStorage(storage);
    this.notify();
  }

  /**
   * Change le thème d'affichage ('auto', 'dark', 'light')
   */
  setTheme(theme, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    this.state.theme = theme;
    this.saveToStorage(storage);
    this.notify();
  }

  /**
   * Bascule le mode Débutant / Avancé
   */
  toggleBeginnerMode(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    this.state.beginnerMode = !this.state.beginnerMode;
    this.saveToStorage(storage);
    this.notify();
  }

  /**
   * Abonnement aux changements d'état
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[Store] Erreur dans le listener :', err);
      }
    }
  }

  getState() {
    return this.state;
  }
}

// Instance singleton par défaut pour l'application
export const store = new AppStore();
