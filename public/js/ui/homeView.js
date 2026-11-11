/**
 * CoC Freemium Optimizer — Vue Accueil / Aujourd'hui
 * Affiche la phrase de synthèse, les 4 KPIs maîtres et les 3 actions prioritaires
 */

export function renderHomeView(analysis, capsData, adviceList = []) {
  if (!analysis || !analysis.success) return;

  const thLevel = analysis.thLevel || 11;

  // 1. Phrase de synthèse
  const summaryTextEl = document.getElementById('home-summary-text');
  if (summaryTextEl) {
    const score = analysis.overallScore || 50;
    summaryTextEl.textContent = `Votre village est à ${score} % du maximum recommandé pour l'Hôtel de Ville ${thLevel}.`;
  }

  // 2. Mise à jour des 4 KPIs
  // KPI HDV
  const kpiThVal = document.getElementById('kpi-th-val');
  const kpiThSub = document.getElementById('kpi-th-sub');
  if (kpiThVal) kpiThVal.textContent = `HDV ${thLevel}`;
  if (kpiThSub) kpiThSub.textContent = analysis.isMaxTownhall ? 'Niveau Max Actuel' : `Plafond actuel`;

  // KPI Ouvriers
  const kpiBuildersVal = document.getElementById('kpi-builders-val');
  const kpiBuildersSub = document.getElementById('kpi-builders-sub');
  if (kpiBuildersVal && analysis.builders) {
    const { totalBuilders, freeBuilders } = analysis.builders;
    kpiBuildersVal.textContent = `${totalBuilders - freeBuilders} / ${totalBuilders}`;
    if (kpiBuildersSub) {
      kpiBuildersSub.textContent = freeBuilders > 0 
        ? `${freeBuilders} ouvrier${freeBuilders > 1 ? 's' : ''} disponible${freeBuilders > 1 ? 's' : ''}` 
        : 'Tous occupés';
      kpiBuildersSub.className = freeBuilders > 0 ? 'text-xs text-success font-medium mt-0.5' : 'text-xs text-muted mt-0.5';
    }
  }

  // KPI Héros
  const kpiHeroesVal = document.getElementById('kpi-heroes-val');
  const kpiHeroesBar = document.getElementById('kpi-heroes-bar');
  if (kpiHeroesVal && analysis.heroes) {
    kpiHeroesVal.textContent = `${analysis.heroes.totalCurrent} / ${analysis.heroes.totalMax}`;
    if (kpiHeroesBar) {
      kpiHeroesBar.style.width = `${analysis.heroes.globalHeroIndex}%`;
    }
  }

  // KPI Remparts
  const kpiWallsVal = document.getElementById('kpi-walls-val');
  const kpiWallsBar = document.getElementById('kpi-walls-bar');
  if (kpiWallsVal && analysis.walls) {
    kpiWallsVal.textContent = `${analysis.walls.maxedWallsCount} / ${analysis.walls.totalWalls}`;
    if (kpiWallsBar) {
      kpiWallsBar.style.width = `${analysis.walls.completionPct}%`;
    }
  }

  // 3. 3 Actions Prioritaires
  const actionsListEl = document.getElementById('home-priority-actions-list');
  if (actionsListEl) {
    actionsListEl.innerHTML = '';
    const top3 = adviceList.slice(0, 3);

    if (top3.length === 0) {
      // Recommandations par défaut déduites de l'analyse
      const defaultActions = [];
      if (analysis.builders?.freeBuilders > 0) {
        defaultActions.push({
          urgency: 'critique',
          title: `Assigner ${analysis.builders.freeBuilders} ouvrier(s) libre(s)`,
          desc: 'Un ouvrier inactif ralentit la progression globale de votre village.',
          category: 'constructeurs'
        });
      }
      if (analysis.heroes?.globalHeroIndex < 65) {
        defaultActions.push({
          urgency: 'important',
          title: 'Accélérer l\'amélioration des Héros',
          desc: `Vos 4 héros totalisent ${analysis.heroes.totalCurrent}/${analysis.heroes.totalMax} niveaux (${analysis.heroes.globalHeroIndex}%).`,
          category: 'heros'
        });
      }
      if (analysis.walls?.remainingToMax > 0) {
        defaultActions.push({
          urgency: 'utile',
          title: `Améliorer les remparts restants (${analysis.walls.remainingToMax} murs)`,
          desc: 'Écoulez votre excédent d\'or et d\'élixir dans les remparts pour éviter de perdre du butin.',
          category: 'remparts'
        });
      }

      defaultActions.slice(0, 3).forEach(act => {
        const item = document.createElement('div');
        item.className = 'p-3 rounded-xl bg-sunken border border-subtle flex items-start justify-between gap-3';
        item.innerHTML = `
          <div>
            <div class="flex items-center gap-2">
              <span class="badge ${act.urgency === 'critique' ? 'badge-danger' : act.urgency === 'important' ? 'badge-warning' : 'badge-accent'}">
                <span class="badge-dot"></span>
                <span>${act.urgency.toUpperCase()}</span>
              </span>
              <h4 class="text-xs font-semibold text-primary">${act.title}</h4>
            </div>
            <p class="text-2xs text-secondary mt-1">${act.desc}</p>
          </div>
          <button class="btn btn-sm btn-secondary flex-shrink-0" data-route="advice">Voir</button>
        `;
        actionsListEl.appendChild(item);
      });
    } else {
      top3.forEach(advice => {
        const item = document.createElement('div');
        item.className = 'p-3 rounded-xl bg-sunken border border-subtle flex items-start justify-between gap-3';
        item.innerHTML = `
          <div>
            <div class="flex items-center gap-2">
              <span class="badge ${advice.urgence === 'critique' ? 'badge-danger' : advice.urgence === 'important' ? 'badge-warning' : 'badge-accent'}">
                <span class="badge-dot"></span>
                <span>${(advice.urgence || 'utile').toUpperCase()}</span>
              </span>
              <h4 class="text-xs font-semibold text-primary">${advice.titre}</h4>
            </div>
            <p class="text-2xs text-secondary mt-1">${advice.explication_simple}</p>
          </div>
          <button class="btn btn-sm btn-secondary flex-shrink-0" data-route="advice">Voir</button>
        `;
        actionsListEl.appendChild(item);
      });
    }
  }
}
