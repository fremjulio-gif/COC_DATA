/**
 * CoC Freemium Optimizer — Routeur d'Écrans & Navigation par Onglets
 * Gère l'historique URL (hash), les onglets desktop, la barre mobile + tiroir Explorer
 */

const SECONDARY_ROUTES = new Set(['army', 'progress', 'strategy', 'settings']);

export class AppRouter {
  constructor(routes = [], defaultRoute = 'home') {
    this.routes = routes;
    this.defaultRoute = defaultRoute;
    this.currentRoute = defaultRoute;
    this.hooks = new Set();
  }

  init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.setupTabListeners();
    this.handleHashChange();
  }

  handleHashChange() {
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    const route = this.routes.includes(rawHash) ? rawHash : this.defaultRoute;
    this.navigateTo(route, false);
  }

  navigateTo(route, updateHash = true) {
    if (!this.routes.includes(route)) {
      route = this.defaultRoute;
    }

    this.currentRoute = route;

    if (updateHash && window.location.hash !== `#${route}`) {
      window.location.hash = `#${route}`;
    }

    this.updateActiveViews(route);
    this.updateTabUI(route);
    this.notifyHooks(route);
  }

  updateActiveViews(route) {
    const panes = document.querySelectorAll('.view-pane');
    panes.forEach((pane) => {
      const paneId = pane.getAttribute('data-view');
      if (paneId === route) {
        pane.removeAttribute('hidden');
        pane.classList.remove('is-active');
        void pane.offsetWidth; // relance la transition CSS fluide
        pane.classList.add('is-active');
      } else {
        pane.classList.remove('is-active');
        pane.setAttribute('hidden', '');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateTabUI(route) {
    // Onglets Desktop
    const desktopTabs = document.querySelectorAll('.nav-tab-btn');
    desktopTabs.forEach((tab) => {
      const target = tab.getAttribute('data-route');
      const isMatch = target === route;
      tab.classList.toggle('is-active', isMatch);
      tab.setAttribute('aria-selected', String(isMatch));
    });

    // Barre d'Onglets Mobile (surligne "Explorer" sur les vues secondaires)
    const mobileTabs = document.querySelectorAll('.mobile-tab-item[data-route]');
    mobileTabs.forEach((tab) => {
      const target = tab.getAttribute('data-route');
      const isMatch = target === route;
      tab.classList.toggle('is-active', isMatch);
      tab.setAttribute('aria-selected', String(isMatch));
    });

    const moreTrigger = document.getElementById('mobile-more-trigger');
    if (moreTrigger) {
      moreTrigger.classList.toggle('is-active', SECONDARY_ROUTES.has(route));
    }
  }

  setupTabListeners() {
    document.addEventListener('click', (e) => {
      const tabTarget = e.target.closest('[data-route]');
      if (tabTarget) {
        const route = tabTarget.getAttribute('data-route');
        if (route) {
          e.preventDefault();
          this.navigateTo(route, true);
        }
      }
    });

    // Accessibilité clavier sur cartes cliquables [role="button"][data-route]
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const el = document.activeElement;
        if (el && el.hasAttribute('data-route') && el.tagName !== 'BUTTON' && el.tagName !== 'A') {
          e.preventDefault();
          const route = el.getAttribute('data-route');
          if (route) this.navigateTo(route, true);
        }
      }
    });
  }

  onRouteChange(callback) {
    this.hooks.add(callback);
    return () => this.hooks.delete(callback);
  }

  notifyHooks(route) {
    for (const hook of this.hooks) {
      try {
        hook(route);
      } catch (err) {
        console.error('[Router] Erreur dans hook de navigation :', err);
      }
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}

export const router = new AppRouter([
  'home',
  'advice',
  'village',
  'heroes',
  'army',
  'progress',
  'strategy',
  'settings'
], 'home');
