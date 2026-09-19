/**
 * APP.JS - Contrôleur Principal & Interface Interactive du Tableau de Bord CoC
 */

let appState = {
  rawData: null,
  analysis: null,
  timers: [],
  timerInterval: null,
  charts: {},
  apiStatus: "fallback" // 'online' | 'fallback' | 'loading'
};

// Initialisation dès le chargement du DOM
document.addEventListener("DOMContentLoaded", () => {
  initLucide();
  setupEventListeners();
  loadInitialData();
});

function initLucide() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Configuration des gestionnaires d'événements
 */
function setupEventListeners() {
  // Drag and drop zone
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    ["dragleave", "dragend"].forEach(type => {
      dropzone.addEventListener(type, () => dropzone.classList.remove("dragover"));
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    // Bouton tactile mobile natif
    const btnTouchUpload = document.getElementById("btn-touch-upload");
    if (btnTouchUpload) {
      btnTouchUpload.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }
  }

  // Écouteur de redimensionnement d'écran (orientation mobile)
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (appState.analysis) {
        renderTrajectorySection(appState.analysis);
        renderCharts(appState.analysis);
      }
    }, 250);
  });

  // Modal collage JSON
  const btnPasteModal = document.getElementById("btn-paste-modal");
  const modalPaste = document.getElementById("modal-paste");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnApplyPaste = document.getElementById("btn-apply-paste");
  const textareaJson = document.getElementById("textarea-json");

  if (btnPasteModal && modalPaste) {
    btnPasteModal.addEventListener("click", () => {
      modalPaste.classList.remove("hidden");
      modalPaste.classList.add("flex");
      if (textareaJson) textareaJson.value = JSON.stringify(appState.rawData, null, 2);
    });

    btnCloseModal.addEventListener("click", () => {
      modalPaste.classList.add("hidden");
      modalPaste.classList.remove("flex");
    });

    btnApplyPaste.addEventListener("click", () => {
      try {
        const parsed = JSON.parse(textareaJson.value);
        loadVillageData(parsed);
        modalPaste.classList.add("hidden");
        modalPaste.classList.remove("flex");
        showToast("État du village actualisé avec succès !", "success");
      } catch (err) {
        showToast("Erreur : JSON invalide.", "error");
      }
    });
  }

  // Bouton de synchronisation API Supercell
  const btnSyncApi = document.getElementById("btn-sync-api");
  if (btnSyncApi) {
    btnSyncApi.addEventListener("click", syncWithSupercellApi);
  }

  // Filtres d'équipements
  const filterBtns = document.querySelectorAll(".equip-filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterBtns.forEach(b => b.classList.remove("active", "bg-sky-500/20", "text-sky-400", "border-sky-500/40"));
      btn.classList.add("active", "bg-sky-500/20", "text-sky-400", "border-sky-500/40");
      renderEquipmentList(btn.dataset.filter);
    });
  });

  // Copier la composition de farm
  const btnCopyArmy = document.getElementById("btn-copy-army");
  if (btnCopyArmy) {
    btnCopyArmy.addEventListener("click", () => {
      const text = "76 Super Gobelins, 6 Super Sapeurs, 4 Sorts de Saut, 3 Sorts d'Invisibilité. Cible : 1400-2200 trophées (Gold/Cristal). Pillage extracteurs et HDV.";
      navigator.clipboard.writeText(text).then(() => {
        showToast("Composition copiée dans le presse-papiers !", "success");
      });
    });
  }
}

/**
 * Traitement du fichier téléversé
 */
function handleFile(file) {
  if (!file.name.endsWith(".json")) {
    showToast("Veuillez sélectionner un fichier .json valide", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      loadVillageData(json);
      showToast(`Fichier ${file.name} chargé avec succès !`, "success");
    } catch (err) {
      showToast("Fichier JSON corrompu ou illisible", "error");
    }
  };
  reader.readAsText(file);
}

/**
 * Chargement initial des données
 */
async function loadInitialData() {
  try {
    // Tentative de récupération depuis le backend
    const res = await fetch("/api/village");
    if (res.ok) {
      const data = await res.json();
      loadVillageData(data);
      return;
    }
  } catch (e) {
    console.warn("Backend non joignable directement, utilisation du fallback interne.");
  }

  // Fallback si standalone sans backend
  if (window.EMBEDDED_VILLAGE_DATA) {
    loadVillageData(window.EMBEDDED_VILLAGE_DATA);
  }
}

/**
 * Synchronisation avec l'API Supercell
 */
async function syncWithSupercellApi() {
  const btn = document.getElementById("btn-sync-api");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block animate-spin mr-2">🔄</span> Connexion API...`;
  }

  try {
    const res = await fetch("/api/player");
    const json = await res.json();

    if (json.source === "supercell_api") {
      appState.apiStatus = "online";
      showToast("Synchronisation API Supercell réussie !", "success");
      updateApiStatusBadge(true, "API Supercell en direct");
      // Si l'API renvoie des données joueurs officielles, on les injecte
      if (json.player) {
        updatePlayerOfficialMeta(json.player);
      }
    } else {
      appState.apiStatus = "fallback";
      showToast("API inaccessible (IP / CORS). Mode fallback local actif.", "info");
      updateApiStatusBadge(false, "Mode Local (Fallback sécurisé)");
    }
  } catch (err) {
    appState.apiStatus = "fallback";
    showToast("Connexion API impossible. Utilisation des données locales.", "info");
    updateApiStatusBadge(false, "Mode Local (Fallback sécurisé)");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4"></i> Synchroniser API`;
      initLucide();
    }
  }
}

function updateApiStatusBadge(isOnline, text) {
  const badge = document.getElementById("api-status-badge");
  const dot = document.getElementById("api-status-dot");
  const label = document.getElementById("api-status-text");

  if (badge && dot && label) {
    label.textContent = text;
    if (isOnline) {
      dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping";
      badge.className = "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400";
    } else {
      dot.className = "w-2.5 h-2.5 rounded-full bg-amber-400";
      badge.className = "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400";
    }
  }
}

/**
 * Chargement et application d'un nouvel état de village
 */
function loadVillageData(data) {
  appState.rawData = data;
  appState.analysis = COC_ANALYZER.analyze(data);

  renderKPIs(appState.analysis);
  renderAntiRushAlert(appState.analysis.heroes);
  renderFarmStrategy(appState.analysis.farmStrategy);
  renderTrajectorySection(appState.analysis);
  renderTimers(appState.analysis.builders, appState.analysis.army.labActiveResearch, appState.analysis.builderBase);
  renderEquipmentList("all");
  renderArmyGrid(appState.analysis.army);
  renderCharts(appState.analysis);

  // Met à jour les horodatages
  const lastUpdateEl = document.getElementById("last-update-time");
  if (lastUpdateEl) {
    const d = new Date(appState.rawData.timestamp * 1000);
    lastUpdateEl.textContent = `Données village : ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }

  initLucide();
}

/**
 * Rendu des cartes KPIs
 */
function renderKPIs(analysis) {
  // HDV
  document.getElementById("kpi-th-level").textContent = `HDV ${analysis.thLevel}`;
  
  // Ouvriers
  const b = analysis.builders;
  document.getElementById("kpi-builders-count").textContent = `${b.busyBuilders} / ${b.totalBuilders}`;
  document.getElementById("kpi-builders-status").textContent = b.allBusy ? "Tous les ouvriers sont occupés !" : `${b.freeBuilders} ouvrier(s) libre(s)`;
  document.getElementById("kpi-builders-status").className = b.allBusy ? "text-amber-400 text-xs mt-1" : "text-emerald-400 text-xs mt-1";

  // Remparts
  const w = analysis.walls;
  document.getElementById("kpi-walls-progress").textContent = `${w.lvl12Count} / ${w.totalWalls}`;
  document.getElementById("kpi-walls-pct").textContent = `${w.completionPercentage}%`;
  document.getElementById("kpi-walls-bar").style.width = `${w.completionPercentage}%`;
  document.getElementById("kpi-walls-sub").textContent = `${w.lvl11Count} remparts restant à passer niv. 12`;

  // Hero Power Index
  const h = analysis.heroes;
  document.getElementById("kpi-hero-index").textContent = `${h.globalHeroIndex}%`;
  document.getElementById("kpi-hero-bar").style.width = `${h.globalHeroIndex}%`;
  const heroBadge = document.getElementById("kpi-hero-badge");
  if (heroBadge) {
    heroBadge.textContent = h.severity;
    heroBadge.className = h.isCriticalUnderleveled 
      ? "px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
      : "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
  }
}

/**
 * Rendu de la bannière d'alerte rouge Anti-Rush
 */
function renderAntiRushAlert(heroes) {
  const container = document.getElementById("anti-rush-alert-container");
  if (!container) return;

  if (heroes.isCriticalUnderleveled) {
    container.innerHTML = `
      <div class="glass-card glass-card-critical p-5 rounded-2xl animate-danger-pulse">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 text-2xl flex-shrink-0">
              🚨
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-rose-200">${heroes.alertTitle}</h3>
                <span class="px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider rounded bg-rose-600 text-white shadow-sm">Bloquant</span>
              </div>
              <p class="text-sm text-rose-300/90 mt-1 max-w-3xl leading-relaxed">
                ${heroes.alertDescription}
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div class="bg-slate-900/60 border border-rose-500/20 rounded-lg p-2.5">
                  <div class="flex items-center justify-between text-xs text-rose-200">
                    <span>👑 Roi des Barbares</span>
                    <span class="font-bold">${heroes.king.level} / ${heroes.king.maxTh11}</span>
                  </div>
                  <div class="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div class="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full" style="width: ${heroes.king.progress}%"></div>
                  </div>
                  <div class="text-[11px] text-rose-400/80 mt-1">Retard : -${heroes.king.deficit} niveaux (~${Math.round(heroes.king.enNeeded / 1000)}k EN)</div>
                </div>

                <div class="bg-slate-900/60 border border-rose-500/20 rounded-lg p-2.5">
                  <div class="flex items-center justify-between text-xs text-rose-200">
                    <span>🏹 Reine des Archères</span>
                    <span class="font-bold">${heroes.queen.level} / ${heroes.queen.maxTh11}</span>
                  </div>
                  <div class="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div class="bg-gradient-to-r from-rose-500 to-fuchsia-500 h-full rounded-full" style="width: ${heroes.queen.progress}%"></div>
                  </div>
                  <div class="text-[11px] text-rose-400/80 mt-1">Retard : -${heroes.queen.deficit} niveaux (~${Math.round(heroes.queen.enNeeded / 1000)}k EN)</div>
                </div>

                <div class="bg-slate-900/60 border border-rose-500/20 rounded-lg p-2.5">
                  <div class="flex items-center justify-between text-xs text-rose-200">
                    <span>📖 Grand Gardien</span>
                    <span class="font-bold">${heroes.warden.level} / ${heroes.warden.maxTh11}</span>
                  </div>
                  <div class="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div class="bg-gradient-to-r from-rose-500 to-sky-500 h-full rounded-full" style="width: ${heroes.warden.progress}%"></div>
                  </div>
                  <div class="text-[11px] text-rose-400/80 mt-1">Retard : -${heroes.warden.deficit} niveaux (~${Math.round(heroes.warden.elixirNeeded / 1000000)}M Rose)</div>
                </div>
              </div>
            </div>
          </div>
          <div class="flex-shrink-0 w-full md:w-auto">
            <a href="#farm-strategy-section" class="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all">
              <span>Voir le Plan de Rapprochement</span>
              <span>↓</span>
            </a>
          </div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="glass-card p-4 rounded-2xl border-emerald-500/30 bg-emerald-500/10">
        <div class="flex items-center gap-3">
          <span class="text-2xl">✅</span>
          <div>
            <h4 class="text-sm font-bold text-emerald-300">Niveaux de héros optimaux</h4>
            <p class="text-xs text-emerald-400/90">Vos héros sont prêts pour envisager sereinement les prochaines étapes d'évolution.</p>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Rendu de la stratégie de farm Super Gobelins
 */
function renderFarmStrategy(farm) {
  const armyTroopsContainer = document.getElementById("farm-army-troops");
  const armySpellsContainer = document.getElementById("farm-army-spells");
  const tacticalList = document.getElementById("farm-tactical-advice");

  if (armyTroopsContainer) {
    armyTroopsContainer.innerHTML = farm.recommendedArmy.troops.map(t => `
      <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">${t.icon}</span>
          <div>
            <div class="text-sm font-semibold text-white">${t.name}</div>
            <div class="text-[11px] text-slate-400">${t.role}</div>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">x${t.count}</span>
      </div>
    `).join("");
  }

  if (armySpellsContainer) {
    armySpellsContainer.innerHTML = farm.recommendedArmy.spells.map(s => `
      <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">${s.icon}</span>
          <div>
            <div class="text-sm font-semibold text-white">${s.name}</div>
            <div class="text-[11px] text-slate-400">${s.role}</div>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-xs">x${s.count}</span>
      </div>
    `).join("");
  }

  if (tacticalList) {
    tacticalList.innerHTML = farm.tacticalAdvice.map(advice => `
      <li class="flex items-start gap-2.5 text-xs text-slate-300">
        <span class="text-amber-400 font-bold mt-0.5">▸</span>
        <span>${advice}</span>
      </li>
    `).join("");
  }

  // Métriques de rentabilité
  document.getElementById("farm-metric-de").textContent = farm.efficiencyMetrics.darkElixirPerHour;
  document.getElementById("farm-metric-gold").textContent = farm.efficiencyMetrics.goldElixirPerHour;
  document.getElementById("farm-metric-hours").textContent = `~${farm.efficiencyMetrics.estimatedHoursForHeroes} h`;
  document.getElementById("farm-metric-league").textContent = farm.efficiencyMetrics.trophyRange;
}

/**
 * Rendu des chantiers & timers interactifs
 */
function renderTimers(builders, labResearch, builderBase) {
  const container = document.getElementById("active-upgrades-container");
  if (!container) return;

  if (appState.timerInterval) {
    clearInterval(appState.timerInterval);
  }

  // Préparation de la liste globale des timers
  const items = [];

  // Ouvriers principaux
  builders.activeUpgrades.forEach(u => {
    items.push({
      id: `upgrade-${u.id}-${Math.random()}`,
      title: u.name,
      level: u.targetLevel,
      icon: u.icon,
      remainingSeconds: u.timerSeconds,
      initialDuration: u.timerSeconds,
      isHelper: u.helperRecurrent,
      isGearUp: u.gearUp,
      tag: "Ouvrier",
      category: "main"
    });
  });

  // Recherche labo
  if (labResearch) {
    items.push({
      id: `lab-${labResearch.id}`,
      title: `Recherche : ${labResearch.name}`,
      level: labResearch.targetLevel,
      icon: labResearch.icon,
      remainingSeconds: labResearch.timerSeconds,
      initialDuration: labResearch.timerSeconds,
      isHelper: labResearch.helperRecurrent,
      tag: "Laboratoire",
      category: "lab"
    });
  }

  // Base des ouvriers
  if (builderBase && builderBase.activeUpgrades) {
    builderBase.activeUpgrades.forEach(bb => {
      items.push({
        id: `bb-${bb.id}`,
        title: `MDO : ${bb.name}`,
        level: bb.targetLevel,
        icon: bb.icon,
        remainingSeconds: bb.timerSeconds,
        initialDuration: bb.timerSeconds,
        tag: "Base Ouvriers",
        category: "bb"
      });
    });
  }

  appState.timers = items;

  // Création du markup initial
  if (items.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8 text-slate-400 text-sm">
        Aucun chantier actif détecté.
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => `
    <div id="${item.id}" class="glass-card p-4 rounded-xl border border-slate-700/50 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${item.icon}</span>
            <div>
              <h4 class="text-sm font-semibold text-white truncate">${item.title}</h4>
              <div class="text-[11px] text-slate-400">Vers Niveau ${item.level}</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            item.category === 'lab' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
            item.category === 'bb' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
            'bg-sky-500/20 text-sky-300 border border-sky-500/30'
          }">${item.tag}</span>
        </div>

        ${item.isHelper ? `
          <div class="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-medium">
            <span>👷</span> Boost Apprenti Actif
          </div>
        ` : ''}

        ${item.isGearUp ? `
          <div class="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium">
            <span>⚙️</span> Gear-Up en cours
          </div>
        ` : ''}
      </div>

      <div class="mt-4">
        <div class="flex items-center justify-between text-xs mb-1.5">
          <span class="text-slate-400">Temps restant :</span>
          <span class="timer-countdown font-mono font-bold text-white text-sm" data-timer-id="${item.id}">
            ${formatSecondsToCountdown(item.remainingSeconds)}
          </span>
        </div>
        <div class="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
          <div class="timer-progress-bar h-full rounded-full bg-gradient-to-r ${
            item.category === 'lab' ? 'from-purple-500 to-fuchsia-500' :
            item.category === 'bb' ? 'from-emerald-500 to-teal-400' :
            'from-sky-500 to-indigo-500'
          }" style="width: 100%;"></div>
        </div>
      </div>
    </div>
  `).join("");

  // Boucle de décrémentation des timers chaque seconde
  appState.timerInterval = setInterval(() => {
    appState.timers.forEach(item => {
      if (item.remainingSeconds > 0) {
        item.remainingSeconds--;
        const el = document.querySelector(`[data-timer-id="${item.id}"]`);
        if (el) {
          el.textContent = formatSecondsToCountdown(item.remainingSeconds);
        }
      } else {
        const el = document.querySelector(`[data-timer-id="${item.id}"]`);
        if (el) {
          el.textContent = "Terminé ! 🎉";
          el.classList.add("text-emerald-400");
        }
      }
    });
  }, 1000);
}

function formatSecondsToCountdown(seconds) {
  if (seconds <= 0) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * Rendu de la liste des équipements et analyse des multiples de 3
 */
function renderEquipmentList(filter) {
  const container = document.getElementById("equipment-grid");
  if (!container || !appState.analysis) return;

  const eqData = appState.analysis.equipment;
  let items = eqData.items;

  if (filter === "quick-wins") {
    items = eqData.quickWins;
  } else if (filter === "top-tier") {
    items = eqData.topPriorities;
  } else if (filter === "king") {
    items = items.filter(i => i.hero === "Roi");
  } else if (filter === "queen") {
    items = items.filter(i => i.hero === "Reine");
  } else if (filter === "warden") {
    items = items.filter(i => i.hero === "Gardien");
  }

  if (items.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 text-xs">Aucun équipement correspondant à ce filtre.</div>`;
    return;
  }

  container.innerHTML = items.map(eq => {
    const isClose = eq.distToMilestone === 1;
    return `
      <div class="glass-card p-3.5 rounded-xl border ${
        eq.topTier ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800'
      } flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-2xl">${eq.icon}</span>
              <div>
                <h5 class="text-xs font-bold text-white truncate max-w-[130px]">${eq.name}</h5>
                <span class="text-[10px] text-slate-400">${eq.hero}</span>
              </div>
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
              eq.isEpic ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-700/50 text-slate-300'
            }">${eq.isEpic ? 'Épique' : 'Commun'}</span>
          </div>

          <div class="mt-3 flex items-center justify-between text-xs">
            <span class="text-slate-400">Niveau :</span>
            <span class="font-mono font-bold text-white">${eq.currentLevel} / ${eq.maxTh11}</span>
          </div>

          <div class="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
            <div class="h-full rounded-full ${
              eq.isMilestone ? 'bg-emerald-400' : isClose ? 'bg-amber-400' : 'bg-sky-400'
            }" style="width: ${(eq.currentLevel / eq.maxTh11) * 100}%"></div>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span class="text-slate-400">Palier clé :</span>
          <span class="font-semibold ${
            eq.isMilestone ? 'text-emerald-400' : isClose ? 'text-amber-300 font-bold animate-pulse' : 'text-slate-300'
          }">
            ${eq.isMilestone ? 'Atteint (x3) ✓' : `Prochain : Niv. ${eq.nextMilestone} (-${eq.distToMilestone})`}
          </span>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Rendu de la grille des troupes et sorts
 */
function renderArmyGrid(army) {
  const unitsContainer = document.getElementById("army-units-grid");
  const spellsContainer = document.getElementById("army-spells-grid");

  if (unitsContainer) {
    unitsContainer.innerHTML = army.units.map(u => `
      <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xl">${u.icon}</span>
          <div>
            <div class="text-xs font-semibold text-white">${u.name}</div>
            <div class="text-[10px] text-slate-400">Max HDV 11 : ${u.maxTh11}</div>
          </div>
        </div>
        <div class="flex flex-col items-end">
          <span class="px-2 py-0.5 rounded text-xs font-mono font-bold ${
            u.isMax ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'
          }">Niv. ${u.level}</span>
          ${u.canSuper ? `<span class="text-[9px] text-amber-400 font-semibold mt-0.5">Super Débloqué ★</span>` : ''}
        </div>
      </div>
    `).join("");
  }

  if (spellsContainer) {
    spellsContainer.innerHTML = army.spells.map(s => `
      <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xl">${s.icon}</span>
          <div>
            <div class="text-xs font-semibold text-white">${s.name}</div>
            <div class="text-[10px] text-slate-400">Max HDV 11 : ${s.maxTh11}</div>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-xs font-mono font-bold ${
          s.isMax ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'
        }">Niv. ${s.level}</span>
      </div>
    `).join("");
  }
}

/**
 * Rendu de la section Trajectoire & Prévisions (KPI Box & 2 Graphiques)
 */
function renderTrajectorySection(analysis) {
  if (!analysis || !analysis.trajectory) return;

  const traj = analysis.trajectory;
  const metrics = traj.forecasting.metrics;

  // 1. Mise à jour de la KPI Box Compte à Rebours
  const countdownEl = document.getElementById("forecast-kpi-countdown");
  if (countdownEl) countdownEl.textContent = `${metrics.optimalDaysToTarget} jours`;

  const targetDateEl = document.getElementById("forecast-target-date-str");
  if (targetDateEl) targetDateEl.textContent = metrics.targetDateAStr;

  const builderDaysEl = document.getElementById("forecast-metric-builder-days");
  if (builderDaysEl) builderDaysEl.textContent = `${metrics.totalHeroBuilderDaysToTarget} j`;

  const labDaysEl = document.getElementById("forecast-metric-lab-days");
  if (labDaysEl) labDaysEl.textContent = `~${metrics.labDaysRemaining} j`;

  const standardDaysEl = document.getElementById("forecast-metric-standard-days");
  if (standardDaysEl) standardDaysEl.textContent = `${metrics.standardDaysToTarget} j`;

  const buildersBadgeEl = document.getElementById("trajectory-builders-badge");
  if (buildersBadgeEl && analysis.builders) {
    buildersBadgeEl.textContent = `${analysis.builders.busyBuilders} / ${analysis.builders.totalBuilders} Actifs`;
  }

  // 2. Initialisation des Graphiques Chart.js
  if (typeof Chart === "undefined") return;

  // A. Graphique Historique de Progression (Combo Bar + Line)
  const ctxHistory = document.getElementById("chart-progression-history");
  if (ctxHistory) {
    if (appState.charts.progressionHistory) appState.charts.progressionHistory.destroy();

    const hist = traj.history;

    appState.charts.progressionHistory = new Chart(ctxHistory, {
      type: "bar",
      data: {
        labels: hist.labels,
        datasets: [
          {
            type: "line",
            label: "Niveau HDV",
            data: hist.thLevels,
            borderColor: "#38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.15)",
            pointBackgroundColor: "#38bdf8",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 3,
            tension: 0.25,
            yAxisID: "y-th",
            order: 1
          },
          {
            type: "line",
            label: "Rythme Mensuel (Améliorations)",
            data: hist.monthlyPace,
            borderColor: "#10b981",
            borderDash: [4, 4],
            pointBackgroundColor: "#10b981",
            pointRadius: 4,
            borderWidth: 2,
            tension: 0.3,
            yAxisID: "y-heroes",
            order: 2
          },
          {
            type: "bar",
            label: "Roi des Barbares",
            data: hist.heroes.king,
            backgroundColor: "rgba(245, 158, 11, 0.85)",
            stack: "heroes",
            yAxisID: "y-heroes",
            borderRadius: 4,
            order: 3
          },
          {
            type: "bar",
            label: "Reine des Archères",
            data: hist.heroes.queen,
            backgroundColor: "rgba(192, 132, 252, 0.85)",
            stack: "heroes",
            yAxisID: "y-heroes",
            borderRadius: 4,
            order: 4
          },
          {
            type: "bar",
            label: "Grand Gardien",
            data: hist.heroes.warden,
            backgroundColor: "rgba(56, 189, 248, 0.85)",
            stack: "heroes",
            yAxisID: "y-heroes",
            borderRadius: 4,
            order: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 10,
              font: { size: 10 },
              color: "#94a3b8"
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#38bdf8",
            bodyColor: "#f8fafc",
            borderColor: "rgba(56, 189, 248, 0.3)",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              afterBody: (tooltipItems) => {
                const idx = tooltipItems[0].dataIndex;
                const totalHeros = hist.cumulativeHeroes[idx];
                return `Total Héros : Niv. ${totalHeros} / 120`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              font: { size: window.innerWidth < 640 ? 8.5 : 10 },
              color: "#94a3b8",
              maxRotation: 0,
              autoSkip: true
            }
          },
          "y-heroes": {
            type: "linear",
            position: "left",
            stacked: true,
            beginAtZero: true,
            max: 65,
            title: {
              display: window.innerWidth >= 640,
              text: "Niveaux Héros",
              color: "#94a3b8",
              font: { size: 10 }
            },
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { font: { size: window.innerWidth < 640 ? 8.5 : 10 }, color: "#94a3b8" }
          },
          "y-th": {
            type: "linear",
            position: "right",
            beginAtZero: false,
            min: 1,
            max: 12,
            title: {
              display: window.innerWidth >= 640,
              text: "Hôtel de Ville",
              color: "#38bdf8",
              font: { size: 10 }
            },
            ticks: {
              stepSize: 2,
              font: { size: window.innerWidth < 640 ? 8.5 : 10 },
              color: "#38bdf8",
              callback: (v) => `HDV ${v}`
            },
            grid: { display: false }
          }
        }
      }
    });
  }

  // B. Graphique Prévisionnel de Maxage (Line Chart)
  const ctxForecast = document.getElementById("chart-forecasting");
  if (ctxForecast) {
    if (appState.charts.forecasting) appState.charts.forecasting.destroy();

    const fc = traj.forecasting;
    const count = fc.labels.length;

    appState.charts.forecasting = new Chart(ctxForecast, {
      type: "line",
      data: {
        labels: fc.labels,
        datasets: [
          {
            label: "Scénario A (Freemium Optimal)",
            data: fc.scenarioA,
            borderColor: "#38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.15)",
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointBackgroundColor: "#38bdf8",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 1.5,
            pointRadius: (ctx) => {
              const val = fc.days[ctx.dataIndex];
              return val === 58 || val === 84 ? 6 : 3;
            },
            pointHoverRadius: 7,
            order: 1
          },
          {
            label: "Scénario B (Rythme Standard)",
            data: fc.scenarioB,
            borderColor: "#a855f7",
            backgroundColor: "rgba(168, 85, 247, 0.05)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            borderDash: [5, 4],
            pointBackgroundColor: "#a855f7",
            pointRadius: (ctx) => {
              const val = fc.days[ctx.dataIndex];
              return val === 118 ? 5 : 3;
            },
            pointHoverRadius: 6,
            order: 2
          },
          {
            label: "Seuil Transition HDV 12 (Héros 45/45/18)",
            data: Array(count).fill(fc.targetThreshold),
            borderColor: "#10b981",
            borderDash: [3, 3],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            order: 3
          },
          {
            label: "Cap Max HDV 11 (100%)",
            data: Array(count).fill(fc.maxThreshold),
            borderColor: "rgba(255, 255, 255, 0.25)",
            borderDash: [2, 2],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            order: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 10,
              font: { size: window.innerWidth < 640 ? 9 : 10 },
              color: "#94a3b8"
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#38bdf8",
            bodyColor: "#f8fafc",
            borderColor: "rgba(168, 85, 247, 0.3)",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const val = context.parsed.y;
                return `${context.dataset.label}: ${val}%`;
              },
              afterBody: (tooltipItems) => {
                const idx = tooltipItems[0].dataIndex;
                const day = fc.days[idx];
                if (day === 58) {
                  return "🎯 [J+58] Date recommandée pour passage HDV 12 sain !";
                } else if (day === 84) {
                  return "🏆 [J+84] Village HDV 11 100% maxé (Héros 50/50/20) !";
                } else if (day === 118) {
                  return "⚠️ [J+118] Atterrissage HDV 12 en rythme standard (+60j de délai).";
                }
                return "";
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              font: { size: window.innerWidth < 640 ? 8.5 : 10 },
              color: "#94a3b8",
              maxRotation: 0,
              autoSkip: true
            }
          },
          y: {
            beginAtZero: false,
            min: 40,
            max: 105,
            ticks: {
              font: { size: window.innerWidth < 640 ? 8.5 : 10 },
              color: "#94a3b8",
              callback: (v) => `${v}%`
            },
            title: {
              display: window.innerWidth >= 640,
              text: "% Complétion HDV 11",
              color: "#94a3b8",
              font: { size: 10 }
            },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          }
        }
      }
    });
  }
}

/**
 * Initialisation des graphiques Chart.js
 */
function renderCharts(analysis) {
  if (typeof Chart === "undefined") return;

  // Configuration par défaut Dark Theme
  Chart.defaults.color = "#94a3b8";
  Chart.defaults.font.family = "system-ui, sans-serif";

  // 1. Graphique Héros (Radar / Bar)
  const ctxHeroes = document.getElementById("chart-heroes");
  if (ctxHeroes) {
    if (appState.charts.heroes) appState.charts.heroes.destroy();

    const h = analysis.heroes;
    appState.charts.heroes = new Chart(ctxHeroes, {
      type: "bar",
      data: {
        labels: ["Roi des Barbares", "Reine des Archères", "Grand Gardien", "Prince Gargouille"],
        datasets: [
          {
            label: "Niveau Actuel",
            data: [h.king.level, h.queen.level, h.warden.level, h.minionPrince.level],
            backgroundColor: ["#f59e0b", "#c084fc", "#38bdf8", "#8b5cf6"],
            borderRadius: 6
          },
          {
            label: "Cap Max HDV 11",
            data: [h.king.maxTh11, h.queen.maxTh11, h.warden.maxTh11, h.minionPrince.maxTh11],
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 10,
              font: { size: window.innerWidth < 640 ? 9 : 11 },
              color: "#94a3b8"
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 55,
            ticks: {
              font: { size: window.innerWidth < 640 ? 8.5 : 11 },
              color: "#94a3b8"
            },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              font: { size: window.innerWidth < 640 ? 8.5 : 11 },
              color: "#94a3b8",
              callback: function(val, index) {
                if (window.innerWidth < 640) {
                  const shortNames = ["Roi", "Reine", "Gardien", "Prince"];
                  return shortNames[index] || this.getLabelForValue(val);
                }
                return this.getLabelForValue(val);
              }
            },
            grid: { display: false }
          }
        }
      }
    });
  }

  // 2. Graphique Remparts (Doughnut)
  const ctxWalls = document.getElementById("chart-walls");
  if (ctxWalls) {
    if (appState.charts.walls) appState.charts.walls.destroy();

    const w = analysis.walls;
    appState.charts.walls = new Chart(ctxWalls, {
      type: "doughnut",
      data: {
        labels: ["Remparts Niv. 12 (Max HDV 11)", "Remparts Niv. 11 (À améliorer)"],
        datasets: [{
          data: [w.lvl12Count, w.lvl11Count],
          backgroundColor: ["#38bdf8", "#334155"],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 10,
              font: { size: window.innerWidth < 640 ? 9.5 : 11 },
              color: "#94a3b8"
            }
          }
        }
      }
    });
  }
}

/**
 * Toast notifications
 */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `p-3.5 rounded-xl shadow-xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ${
    type === "success" ? "bg-emerald-500/90 text-white border border-emerald-400/40 shadow-emerald-900/30" :
    type === "error" ? "bg-rose-500/90 text-white border border-rose-400/40 shadow-rose-900/30" :
    "bg-sky-500/90 text-white border border-sky-400/40 shadow-sky-900/30"
  }`;

  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  });

  setTimeout(() => {
    toast.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
