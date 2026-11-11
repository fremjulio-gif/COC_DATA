/**
 * CoC Freemium Optimizer — Vue Accueil / Aujourd'hui
 * Tableau de bord visuel : anneau radial, 4 KPIs cliquables, chantiers temps réel & Top 3 actions
 */

import { decodeBuilding, decodeHero, decodeUnit, decodeSpell } from '../coc_data.js';
import {
  escapeHtml,
  formatDuration,
  createRadialRingSvg,
  animateVisualStats,
  ensureLiveTicker
} from '../utils.js';
import { getUiIcon, getCategoryIconBox } from './icons.js';
import { store } from '../store.js';

export function renderHomeView(analysis, capsData, adviceList = []) {
  const container = document.getElementById('home-container');
  if (!container) return;

  if (!analysis || !analysis.success) {
    container.innerHTML = `
      <div class="card card-hero p-6 text-center space-y-3">
        <div class="entity-icon-box mx-auto">${getUiIcon('townhall', 22)}</div>
        <h3>Aucun village chargé</h3>
        <p class="text-xs text-secondary max-w-md mx-auto">
          Importez votre export JSON Clash of Clans ou scannez un QR Code de synchronisation pour lancer l'analyse complète.
        </p>
        <button class="btn btn-primary" data-route="settings">Importer mon village</button>
      </div>
    `;
    return;
  }

  const nowOrigin = Date.now();
  const thLevel = analysis.thLevel || 11;
  const score = analysis.overallScore ?? 50;
  const scoreColor = score >= 80 ? 'var(--color-success)' : score >= 55 ? 'var(--accent)' : 'var(--color-warning)';
  const accountsCount = Object.keys(store.getState().accounts || {}).length;

  const { totalBuilders = 5, busyBuilders = 0, freeBuilders = 0, hasBob = false, activeUpgrades = [], labUpgrades = [] } = analysis.builders || {};
  const heroes = analysis.heroes || {};
  const walls = analysis.walls || {};
  const helpers = analysis.helpers || {};

  // 1. Bannière Hero avec Anneau Radial
  const ringSvg = createRadialRingSvg({
    pct: score,
    size: 104,
    stroke: 9,
    color: scoreColor,
    centerValue: `<span data-count-to="${score}" data-count-suffix="%">0%</span>`,
    centerSub: 'Score',
    valueSize: '21px'
  });

  const criticalCount = adviceList.filter(a => !a.isCompleted && a.urgence === 'critique').length;
  const activeCount = adviceList.filter(a => !a.isCompleted).length;

  // 2. Micro-barres pour chaque héros débloqué
  const heroColorMap = [
    { key: 'king', label: 'Roi', color: 'var(--hero-king)' },
    { key: 'queen', label: 'Reine', color: 'var(--hero-queen)' },
    { key: 'warden', label: 'Gard.', color: 'var(--hero-warden)' },
    { key: 'minion_prince', label: 'Prince', color: 'var(--hero-prince)' },
    { key: 'champion', label: 'Champ.', color: 'var(--hero-champion)' }
  ];

  let heroMicroBarsHtml = '';
  heroColorMap.forEach(({ key, label, color }) => {
    const item = heroes.items?.[key];
    if (item) {
      heroMicroBarsHtml += `
        <div class="hero-micro-bar-track" title="${escapeHtml(item.name)} : ${item.level}/${item.maxLevel} (${item.progressPct}%)">
          <div class="hero-micro-bar-fill" style="height: ${Math.max(8, item.progressPct)}%; background-color: ${color};"></div>
        </div>
      `;
    }
  });

  // 3. Points visuels des ouvriers (Occupé vs Libre)
  let builderPipsHtml = '';
  for (let i = 0; i < totalBuilders; i++) {
    const isBusy = i < busyBuilders;
    builderPipsHtml += isBusy
      ? `<span class="builder-pip is-busy" title="Ouvrier ${i + 1} en chantier"></span>`
      : `<span class="builder-pip is-free text-success" title="Ouvrier ${i + 1} disponible"><span class="pulse-dot" style="width:6px;height:6px;"></span></span>`;
  }

  // 4. Chantiers Actifs & Ouvriers Libres
  let chantiersHtml = '';
  activeUpgrades.forEach(upg => {
    const meta = upg.type === 'hero' ? decodeHero(upg.id) : decodeBuilding(upg.id);
    const cat = upg.type === 'hero' ? 'army' : (meta.category || 'defense');
    chantiersHtml += `
      <div class="chantier-card">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            ${getCategoryIconBox(cat)}
            <div class="min-w-0">
              <div class="text-xs font-semibold text-primary truncate">${escapeHtml(meta.name)}</div>
              <div class="text-2xs text-muted flex items-center gap-1.5">
                <span class="tabular-nums">Vers Niv. ${upg.targetLevel + 1}</span>
                ${upg.hasHelper ? '<span class="badge badge-success">Apprenti actif</span>' : ''}
              </div>
            </div>
          </div>
          <span class="timer-pill">
            ${getUiIcon('clock', 12)}
            <span data-timer-seconds="${upg.remainingSeconds}" data-timer-origin="${nowOrigin}">${formatDuration(upg.remainingSeconds)}</span>
          </span>
        </div>
      </div>
    `;
  });

  for (let i = 0; i < freeBuilders; i++) {
    chantiersHtml += `
      <div class="chantier-card chantier-card-free" data-route="advice" role="button" tabindex="0">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="entity-icon-box entity-icon-builder">${getUiIcon('builder', 18)}</div>
            <div>
              <div class="text-xs font-semibold text-success flex items-center gap-1.5">
                <span class="pulse-dot text-success"></span>
                <span>Ouvrier #${busyBuilders + i + 1} inactif</span>
              </div>
              <div class="text-2xs text-secondary">Cliquer pour lancer une priorité</div>
            </div>
          </div>
          <span class="text-success">${getUiIcon('arrowRight', 15)}</span>
        </div>
      </div>
    `;
  }

  // 5. Laboratoire & Assistants
  let labSectionHtml = '';
  if (labUpgrades.length > 0) {
    const lab = labUpgrades[0];
    const meta = decodeUnit(lab.id) || decodeSpell(lab.id);
    labSectionHtml = `
      <div class="chantier-card">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            ${getCategoryIconBox('lab')}
            <div class="min-w-0">
              <div class="text-xs font-semibold text-primary truncate">${escapeHtml(meta.name)}</div>
              <div class="text-2xs text-muted flex items-center gap-1.5">
                <span class="tabular-nums">Recherche Niv. ${lab.targetLevel + 1}</span>
                ${lab.hasHelper ? '<span class="badge badge-purple">Assistant actif</span>' : ''}
              </div>
            </div>
          </div>
          <span class="timer-pill">
            ${getUiIcon('clock', 12)}
            <span data-timer-seconds="${lab.remainingSeconds}" data-timer-origin="${nowOrigin}">${formatDuration(lab.remainingSeconds)}</span>
          </span>
        </div>
      </div>
    `;
  } else {
    labSectionHtml = `
      <div class="chantier-card chantier-card-free" data-route="army" role="button" tabindex="0">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            ${getCategoryIconBox('lab')}
            <div>
              <div class="text-xs font-semibold text-warning">Laboratoire inactif</div>
              <div class="text-2xs text-secondary">Lancez une troupe ou un sort</div>
            </div>
          </div>
          <span class="text-warning">${getUiIcon('arrowRight', 15)}</span>
        </div>
      </div>
    `;
  }

  let helpersHtml = '';
  (helpers.items || []).forEach(helper => {
    const hasCd = Number(helper.cooldown) > 0;
    helpersHtml += `
      <div class="chantier-card">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="entity-icon-box ${helper.id === 93000000 ? 'entity-icon-builder' : 'entity-icon-army'}">
              ${getUiIcon(helper.id === 93000000 ? 'builder' : 'lab', 18)}
            </div>
            <div class="min-w-0">
              <div class="text-xs font-semibold text-primary truncate">${escapeHtml(helper.name)} • Niv. ${helper.level}</div>
              <div class="text-2xs text-success font-medium">+${helper.dailyHoursSaved}h économisées / jour</div>
            </div>
          </div>
          ${hasCd
            ? `<span class="badge badge-neutral font-mono tabular-nums" data-timer-seconds="${helper.cooldown}" data-timer-origin="${nowOrigin}">${formatDuration(helper.cooldown)}</span>`
            : `<span class="badge badge-success">Prêt</span>`
          }
        </div>
      </div>
    `;
  });

  // 6. Top 3 Actions Prioritaires
  const activeAdvice = adviceList.filter(a => !a.isCompleted);
  const top3 = activeAdvice.slice(0, 3);
  let top3Html = '';

  if (top3.length === 0) {
    top3Html = `
      <div class="p-4 rounded-xl bg-sunken border border-subtle text-center">
        <p class="text-xs text-success font-semibold">Toutes vos actions prioritaires actuelles sont complétées !</p>
      </div>
    `;
  } else {
    top3.forEach((adv, idx) => {
      const cardAccent = adv.urgence === 'critique' ? 'card-danger' : adv.urgence === 'important' ? 'card-warning' : 'card-accent';
      const badgeCls = adv.urgence === 'critique' ? 'badge-danger' : adv.urgence === 'important' ? 'badge-warning' : 'badge-accent';
      top3Html += `
        <div class="card ${cardAccent} p-3.5 space-y-2">
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="badge ${badgeCls}">
                  ${adv.urgence === 'critique' ? '<span class="pulse-dot" style="width:6px;height:6px;"></span>' : '<span class="badge-dot"></span>'}
                  <span>${escapeHtml((adv.urgence || 'utile').toUpperCase())}</span>
                </span>
                <span class="text-2xs text-muted uppercase tracking-wider font-semibold">${escapeHtml(adv.categorie)}</span>
              </div>
              <h4 class="text-sm font-semibold text-primary">${escapeHtml(adv.titre)}</h4>
              <p class="text-xs text-secondary leading-relaxed">${escapeHtml(adv.explication_simple)}</p>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-start">
              <button class="btn btn-sm btn-ghost home-why-btn" data-home-why="home-why-${idx}" aria-expanded="false">
                <span>Détails</span>
                ${getUiIcon('chevron')}
              </button>
              <button class="btn btn-sm btn-secondary" data-route="advice">Conseils</button>
            </div>
          </div>
          <div id="home-why-${idx}" class="accordion-panel">
            <div class="accordion-inner">
              <div class="pt-2.5 mt-1 border-t border-subtle text-xs space-y-1.5">
                <p class="text-2xs text-secondary"><strong class="text-primary">Action :</strong> ${escapeHtml(adv.action)}</p>
                <p class="text-2xs text-muted"><strong class="text-primary">Pourquoi :</strong> ${escapeHtml(adv.pourquoi)}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <!-- 1. Bannière Hero Visuelle -->
    <section class="card card-hero p-5">
      <div class="home-hero-layout">
        <div class="home-hero-left">
          ${ringSvg}
          <div class="min-w-0 space-y-1.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="badge badge-accent">HDV ${thLevel}</span>
              <span class="badge badge-neutral font-mono tabular-nums">${escapeHtml(analysis.tag)}</span>
              ${accountsCount > 1 ? `<button class="badge badge-purple cursor-pointer" data-route="settings">${accountsCount} comptes</button>` : ''}
            </div>
            <h2 class="text-lg sm:text-xl font-bold text-primary">Tableau de bord Freemium</h2>
            <p class="text-xs sm:text-sm text-secondary">
              Votre village atteint <strong class="text-primary tabular-nums">${score} %</strong> du maximum recommandé pour l'Hôtel de Ville ${thLevel}.
            </p>
            <div class="flex flex-wrap items-center gap-2 pt-0.5">
              ${freeBuilders > 0
                ? `<span class="badge badge-danger"><span class="pulse-dot" style="width:6px;height:6px;"></span><span>${freeBuilders} ouvrier${freeBuilders > 1 ? 's' : ''} libre${freeBuilders > 1 ? 's' : ''}</span></span>`
                : `<span class="badge badge-success"><span class="badge-dot"></span><span>Ouvriers 100% actifs</span></span>`}
              ${criticalCount > 0 ? `<span class="badge badge-warning">${criticalCount} alerte${criticalCount > 1 ? 's' : ''} critique${criticalCount > 1 ? 's' : ''}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="home-hero-actions">
          <button class="btn btn-primary flex-1 sm:flex-initial" data-route="advice">
            ${getUiIcon('sparkles', 16)}
            <span>Plan d'action (${activeCount})</span>
          </button>
          <button class="btn btn-secondary" data-route="settings">
            ${getUiIcon('qr', 15)}
            <span>Sync / Import</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 2. Grille des 4 KPIs Interactifs -->
    <section class="grid-kpi" aria-label="Indicateurs clés">
      <div class="card card-interactive" data-route="progress" role="button" tabindex="0">
        <div class="flex items-center justify-between">
          <span class="text-2xs text-muted font-semibold uppercase tracking-wider">Hôtel de Ville</span>
          <span class="text-accent">${getUiIcon('townhall', 17)}</span>
        </div>
        <div class="text-2xl font-bold tabular-nums mt-1">HDV ${thLevel}</div>
        <div class="text-2xs text-secondary mt-1">
          ${heroes.isHealthyForNextTh
            ? `<span class="text-success font-semibold">Prêt pour HDV ${thLevel + 1}</span>`
            : `Objectif sain : ${heroes.totalCurrent || 0}/${heroes.healthyThreshold || 0} niv.`}
        </div>
        <div class="progress-track mt-2.5">
          <div class="progress-fill ${heroes.isHealthyForNextTh ? 'progress-fill-success' : ''}" style="width: ${Math.min(100, Math.round(((heroes.totalCurrent || 0) / Math.max(1, heroes.healthyThreshold || 1)) * 100))}%"></div>
        </div>
      </div>

      <div class="card card-interactive" data-route="village" role="button" tabindex="0">
        <div class="flex items-center justify-between">
          <span class="text-2xs text-muted font-semibold uppercase tracking-wider">Ouvriers</span>
          <span class="${freeBuilders > 0 ? 'text-success' : 'text-accent'}">${getUiIcon('builder', 17)}</span>
        </div>
        <div class="flex items-baseline gap-1.5 mt-1">
          <span class="text-2xl font-bold tabular-nums">${busyBuilders} / ${totalBuilders}</span>
          ${hasBob ? '<span class="badge badge-success">6e B.O.B</span>' : ''}
        </div>
        <div class="builder-slot-dots mt-2" aria-label="Occupation des ouvriers">
          ${builderPipsHtml}
        </div>
        <p class="text-2xs mt-1.5 ${freeBuilders > 0 ? 'text-success font-semibold' : 'text-muted'}">
          ${freeBuilders > 0 ? `${freeBuilders} disponible${freeBuilders > 1 ? 's' : ''} maintenant` : 'Tous en chantier'}
        </p>
      </div>

      <div class="card card-interactive" data-route="heroes" role="button" tabindex="0">
        <div class="flex items-center justify-between">
          <span class="text-2xs text-muted font-semibold uppercase tracking-wider">Force Héros</span>
          <span class="badge ${heroes.globalHeroIndex >= 85 ? 'badge-success' : heroes.globalHeroIndex < 65 ? 'badge-danger' : 'badge-accent'} tabular-nums">${heroes.globalHeroIndex ?? 0}%</span>
        </div>
        <div class="text-2xl font-bold tabular-nums mt-1">${heroes.totalCurrent ?? 0} <span class="text-sm font-medium text-muted">/ ${heroes.totalMax ?? 0}</span></div>
        <div class="hero-micro-bars" aria-hidden="true">
          ${heroMicroBarsHtml}
        </div>
      </div>

      <div class="card card-interactive" data-route="village" role="button" tabindex="0">
        <div class="flex items-center justify-between">
          <span class="text-2xs text-muted font-semibold uppercase tracking-wider">Remparts</span>
          <span class="badge ${walls.completionPct >= 90 ? 'badge-success' : 'badge-accent'} tabular-nums">${walls.completionPct ?? 0}%</span>
        </div>
        <div class="text-2xl font-bold tabular-nums mt-1">${walls.maxedWallsCount ?? 0} <span class="text-sm font-medium text-muted">/ ${walls.totalWalls ?? 0}</span></div>
        <div class="progress-track mt-2.5">
          <div class="progress-fill progress-fill-success" style="width: ${walls.completionPct ?? 0}%"></div>
        </div>
        <p class="text-2xs text-muted mt-1.5 tabular-nums">${walls.remainingToMax ?? 0} murs vers Niv. ${walls.maxWallLevel ?? thLevel + 1}</p>
      </div>
    </section>

    <!-- 3. Chantiers en Direct & Assistants Quotidiens -->
    <section class="grid-2col">
      <div class="card space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-subtle">
          <div class="flex items-center gap-2">
            <span class="text-accent">${getUiIcon('builder', 18)}</span>
            <h3 class="text-sm font-semibold">Chantiers en Direct</h3>
          </div>
          <span class="badge badge-neutral tabular-nums">${busyBuilders} actifs / ${freeBuilders} libres</span>
        </div>
        <div class="space-y-2">
          ${chantiersHtml}
        </div>
      </div>

      <div class="card space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-subtle">
          <div class="flex items-center gap-2">
            <span class="text-purple">${getUiIcon('lab', 18)}</span>
            <h3 class="text-sm font-semibold">Laboratoire & Assistants</h3>
          </div>
          <button class="btn btn-sm btn-ghost" data-route="army">Armée ${getUiIcon('arrowRight', 13)}</button>
        </div>
        <div class="space-y-2">
          ${labSectionHtml}
          ${helpersHtml}
        </div>
      </div>
    </section>

    <!-- 4. Découvrir les Modules Complémentaires (Accès Direct Mobile & Desktop) -->
    <section class="card space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-subtle">
        <h3 class="text-sm font-semibold">Outils & Analyses Rapides</h3>
        <span class="text-2xs text-muted">Navigation instantanée</span>
      </div>
      <div class="quick-explore-grid">
        <button class="quick-explore-card" data-route="army">
          <span class="text-accent">${getUiIcon('lab', 20)}</span>
          <span class="text-xs font-semibold text-primary">Armée & Labo</span>
          <span class="text-2xs text-muted tabular-nums">${analysis.army?.completionPct || 0}% maxé</span>
        </button>
        <button class="quick-explore-card" data-route="progress">
          <span class="text-success">${getUiIcon('chart', 20)}</span>
          <span class="text-xs font-semibold text-primary">Projection</span>
          <span class="text-2xs text-muted">Simulateur HDV ${thLevel + 1}</span>
        </button>
        <button class="quick-explore-card" data-route="strategy">
          <span class="text-warning">${getUiIcon('army', 20)}</span>
          <span class="text-xs font-semibold text-primary">Stratégies</span>
          <span class="text-2xs text-muted">Farm / GDC / Rush</span>
        </button>
      </div>
    </section>

    <!-- 5. Top 3 Prochaines Actions Recommandées -->
    <section class="card space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-subtle">
        <div>
          <h3 class="text-sm font-semibold">Prochaines Actions Prioritaires</h3>
          <p class="text-2xs text-muted mt-0.5">Calculées dynamiquement à partir de votre village</p>
        </div>
        <button class="btn btn-sm btn-secondary" data-route="advice">Tous les conseils (${activeCount})</button>
      </div>
      <div class="space-y-2.5">
        ${top3Html}
      </div>
    </section>
  `;

  // Écouteurs d'accordéon local sur Top 3
  container.querySelectorAll('.home-why-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.getAttribute('data-home-why');
      const panel = container.querySelector(`#${targetId}`);
      if (!panel) return;
      const isOpen = panel.classList.toggle('is-open');
      btn.classList.toggle('is-expanded', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });

  // Lancement des animations fluides (anneaux SVG, compteurs, ticker 1s)
  animateVisualStats(container);
  ensureLiveTicker();
}
