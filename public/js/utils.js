/**
 * CoC Freemium Optimizer — Utilitaires UI, Sécurité Anti-XSS & Timers Live
 */

/**
 * Échappe toute chaîne dynamique avant injection dans du markup HTML
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formate une durée en secondes (ex: "2j 11h 20m" ou "18h 31m 12s")
 */
export function formatDuration(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (sec <= 0) return 'Terminé';

  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;

  if (days > 0) {
    return `${days}j ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  if (mins > 0) {
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

/**
 * Formate un grand nombre de ressources (ex: 1200000 -> "1,2 M", 108000 -> "108 k")
 */
export function formatCompactResource(amount) {
  const n = Number(amount) || 0;
  if (n >= 1000000) {
    return `${(n / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  }
  if (n >= 1000) {
    return `${Math.round(n / 1000).toLocaleString('fr-FR')} k`;
  }
  return n.toLocaleString('fr-FR');
}

/**
 * Génère un anneau de progression radial SVG animé (style Apple Fitness)
 */
export function createRadialRingSvg({
  pct = 0,
  size = 96,
  stroke = 8,
  color = 'var(--accent)',
  centerValue = '',
  centerSub = '',
  valueSize = '18px'
}) {
  const clampedPct = Math.min(100, Math.max(0, Number(pct) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (clampedPct / 100) * circumference;
  const center = size / 2;

  return `
    <div class="radial-ring-wrap" style="width:${size}px;height:${size}px;">
      <svg class="radial-ring-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle
          class="radial-ring-track"
          cx="${center}"
          cy="${center}"
          r="${radius}"
          stroke-width="${stroke}"
        ></circle>
        <circle
          class="radial-ring-progress"
          cx="${center}"
          cy="${center}"
          r="${radius}"
          stroke-width="${stroke}"
          stroke="${color}"
          stroke-dasharray="${circumference.toFixed(2)}"
          stroke-dashoffset="${circumference.toFixed(2)}"
          data-target-offset="${targetOffset.toFixed(2)}"
        ></circle>
      </svg>
      <div class="radial-ring-center">
        <span class="radial-ring-value" style="font-size:${valueSize};">${centerValue}</span>
        ${centerSub ? `<span class="radial-ring-sub">${escapeHtml(centerSub)}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Déclenche l'animation des anneaux SVG et des compteurs numériques dans un conteneur
 */
export function animateVisualStats(root = document) {
  if (!root) return;
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Anneaux radiaux SVG
  const rings = root.querySelectorAll('.radial-ring-progress[data-target-offset]');
  rings.forEach((circle) => {
    const target = circle.getAttribute('data-target-offset');
    if (reduceMotion) {
      circle.style.strokeDashoffset = target;
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          circle.style.strokeDashoffset = target;
        });
      });
    }
  });

  // 2. Compteurs numériques fluides
  const counters = root.querySelectorAll('[data-count-to]');
  counters.forEach((el) => {
    const endVal = Number(el.getAttribute('data-count-to'));
    const suffix = el.getAttribute('data-count-suffix') || '';
    if (Number.isNaN(endVal)) return;

    if (reduceMotion) {
      el.textContent = `${endVal}${suffix}`;
      return;
    }

    const duration = 420;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * endVal);
      el.textContent = `${current}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = `${endVal}${suffix}`;
      }
    }

    requestAnimationFrame(step);
  });
}

let tickerStarted = false;

/**
 * Démarre le ticker unique 1s pour tous les compte-à-rebours [data-timer-seconds]
 */
export function ensureLiveTicker() {
  if (tickerStarted) return;
  tickerStarted = true;

  setInterval(() => {
    const now = Date.now();
    const timerNodes = document.querySelectorAll('[data-timer-seconds]');
    timerNodes.forEach((node) => {
      const initial = Number(node.getAttribute('data-timer-seconds')) || 0;
      const origin = Number(node.getAttribute('data-timer-origin')) || now;
      const elapsed = Math.floor((now - origin) / 1000);
      const remaining = Math.max(0, initial - elapsed);
      node.textContent = formatDuration(remaining);
    });
  }, 1000);
}

/**
 * Gestionnaire de feuille modale globale réutilisable
 */
export function openModalSheet({ title = '', bodyHtml = '' }) {
  const backdrop = document.getElementById('global-modal-backdrop');
  const titleEl = document.getElementById('global-modal-title');
  const bodyEl = document.getElementById('global-modal-body');
  if (!backdrop || !titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  backdrop.classList.add('is-open');
  backdrop.setAttribute('aria-hidden', 'false');
}

export function closeModalSheet() {
  const backdrop = document.getElementById('global-modal-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('is-open');
  backdrop.setAttribute('aria-hidden', 'true');
}

/**
 * Détermine le thème visuel effectif ('dark' ou 'light') à partir du mode ('auto' | 'dark' | 'light')
 */
export function getEffectiveTheme(theme = 'auto') {
  if (theme === 'dark' || theme === 'light') return theme;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Applique le thème sélectionné, synchronise <meta name="theme-color"> et l'icône du bouton header
 */
export function applyTheme(theme = 'auto') {
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  const effective = getEffectiveTheme(theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', effective === 'light' ? '#f1f3f8' : '#07080d');
  }

  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    const label = effective === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair';
    themeBtn.setAttribute('aria-label', label);
    themeBtn.setAttribute('title', label);
    themeBtn.innerHTML = effective === 'light'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
  }

  return effective;
}
