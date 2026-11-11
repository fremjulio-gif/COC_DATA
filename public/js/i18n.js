/**
 * CoC Freemium Optimizer — Moteur d'Internationalisation Léger
 * Français par défaut avec architecture prête pour l'anglais
 */

export class I18nManager {
  constructor(locale = 'fr') {
    this.locale = locale;
    this.strings = {};
  }

  async init() {
    try {
      const response = await fetch(`/i18n/${this.locale}.json`);
      if (response.ok) {
        this.strings = await response.json();
      }
    } catch (err) {
      console.warn(`[i18n] Échec du chargement de la locale ${this.locale} :`, err);
    }
  }

  t(keyPath, fallback = '', params = {}) {
    const parts = keyPath.split('.');
    let cur = this.strings;
    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) {
        cur = cur[part];
      } else {
        return fallback || keyPath;
      }
    }

    if (typeof cur !== 'string') {
      return fallback || keyPath;
    }

    // Remplacement des paramètres {variable}
    return cur.replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : `{${k}}`));
  }
}

export const i18n = new I18nManager('fr');
