/**
 * CoC Freemium Optimizer — Routeur d'Écrans & Navigation par Onglets
 * Gère l'historique URL (hash), les onglets desktop et la barre tactile mobile
 */

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
    this.handleHashChange(); // État initial
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
        pane.classList.add('is-active');
        pane.removeAttribute('hidden');
      } else {
        pane.classList.remove('is-active');
        pane.setAttribute('hidden', '');
      }
    });

    // Remonter en haut de page lors d'un changement de vue
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateTabUI(route) {
    // Onglets Desktop
    const desktopTabs = document.querySelectorAll('.nav-tab-btn');
    desktopTabs.forEach((tab) => {
      const target = tab.getAttribute('data-route');
      if (target === route) {
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('is-active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    // Barre d'Onglets Mobile
    const mobileTabs = document.querySelectorAll('.mobile-tab-item');
    mobileTabs.forEach((tab) => {
      const target = tab.getAttribute('data-route');
      if (target === route) {
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('is-active');
        tab.setAttribute('aria-selected', 'false');
      }
    });
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
