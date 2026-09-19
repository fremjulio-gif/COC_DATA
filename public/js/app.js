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

  // Feedback tactile élastique Anime.js v4 (Spring juicy physics)
  document.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".btn-minimal, .filter-pill, #btn-sync-api, #btn-copy-army, #btn-paste-modal");
    if (target && window.anime && window.anime.animate) {
      const { animate, spring } = window.anime;
      animate(target, {
        scale: [1, 0.94, 1],
        duration: 320,
        ease: spring({ bounce: 0.55, stiffness: 320, damping: 12 })
      });
    }
  });
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

  // Animation élastique d'apparition Anime.js v4
  playLiquidEntranceAnimations(appState.analysis);
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
/**
 * Rendu de la bannière d'alerte Anti-Rush (Sober & Factual)
 */
function renderAntiRushAlert(heroes) {
  const container = document.getElementById("anti-rush-alert-container");
  if (!container) return;

  if (heroes.isCriticalUnderleveled) {
    container.innerHTML = `
      <div class="card-minimal p-5 sm:p-6 border-amber-500/20 bg-amber-500/[0.03]">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div class="space-y-3.5 flex-1">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              <h3 class="text-sm font-semibold text-zinc-100 tracking-tight">${heroes.alertTitle}</h3>
              <span class="px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">Priorité HDV 11</span>
            </div>
            <p class="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              ${heroes.alertDescription}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div class="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <div class="flex items-center justify-between text-xs text-zinc-200">
                  <span class="text-zinc-400">Roi des Barbares</span>
                  <span class="font-mono font-medium">${heroes.king.level} / ${heroes.king.maxTh11}</span>
                </div>
                <div class="progress-bar-slim mt-2">
                  <div class="progress-fill bg-amber-400" style="width: ${heroes.king.progress}%"></div>
                </div>
                <div class="text-[11px] text-zinc-500 mt-1.5 font-mono">-${heroes.king.deficit} niv. (~${Math.round(heroes.king.enNeeded / 1000)}k EN)</div>
              </div>

              <div class="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <div class="flex items-center justify-between text-xs text-zinc-200">
                  <span class="text-zinc-400">Reine des Archères</span>
                  <span class="font-mono font-medium">${heroes.queen.level} / ${heroes.queen.maxTh11}</span>
                </div>
                <div class="progress-bar-slim mt-2">
                  <div class="progress-fill bg-purple-400" style="width: ${heroes.queen.progress}%"></div>
                </div>
                <div class="text-[11px] text-zinc-500 mt-1.5 font-mono">-${heroes.queen.deficit} niv. (~${Math.round(heroes.queen.enNeeded / 1000)}k EN)</div>
              </div>

              <div class="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <div class="flex items-center justify-between text-xs text-zinc-200">
                  <span class="text-zinc-400">Grand Gardien</span>
                  <span class="font-mono font-medium">${heroes.warden.level} / ${heroes.warden.maxTh11}</span>
                </div>
                <div class="progress-bar-slim mt-2">
                  <div class="progress-fill bg-sky-400" style="width: ${heroes.warden.progress}%"></div>
                </div>
                <div class="text-[11px] text-zinc-500 mt-1.5 font-mono">-${heroes.warden.deficit} niv. (~${Math.round(heroes.warden.elixirNeeded / 1000000)}M Rose)</div>
              </div>
            </div>
          </div>
          <div class="flex-shrink-0 w-full md:w-auto">
            <a href="#farm-strategy-section" class="btn-minimal w-full md:w-auto justify-center">
              <span>Plan de Rapprochement</span>
              <span class="text-zinc-400 text-xs">↓</span>
            </a>
          </div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="card-minimal p-4 border-emerald-500/20 bg-emerald-500/[0.03]">
        <div class="flex items-center gap-3">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <div>
            <h4 class="text-xs font-semibold text-zinc-200">Niveaux de héros optimaux</h4>
            <p class="text-[11px] text-zinc-400">Vos héros respectent les paliers recommandés pour votre niveau d'Hôtel de Ville.</p>
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
      <div class="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
        <div class="flex items-center gap-3">
          <span class="text-xl">${t.icon}</span>
          <div>
            <div class="text-xs font-medium text-zinc-200">${t.name}</div>
            <div class="text-[11px] text-zinc-400">${t.role}</div>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded font-mono font-medium text-xs bg-zinc-800 text-zinc-300 border border-zinc-700/60">x${t.count}</span>
      </div>
    `).join("");
  }

  if (armySpellsContainer) {
    armySpellsContainer.innerHTML = farm.recommendedArmy.spells.map(s => `
      <div class="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
        <div class="flex items-center gap-3">
          <span class="text-xl">${s.icon}</span>
          <div>
            <div class="text-xs font-medium text-zinc-200">${s.name}</div>
            <div class="text-[11px] text-zinc-400">${s.role}</div>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded font-mono font-medium text-xs bg-zinc-800 text-zinc-300 border border-zinc-700/60">x${s.count}</span>
      </div>
    `).join("");
  }

  if (tacticalList) {
    tacticalList.innerHTML = farm.tacticalAdvice.map(advice => `
      <li class="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
        <span class="text-zinc-500 font-mono mt-0.5">―</span>
        <span>${advice}</span>
      </li>
    `).join("");
  }

  // Métriques de rentabilité
  const deEl = document.getElementById("farm-metric-de");
  if (deEl) deEl.textContent = farm.efficiencyMetrics.darkElixirPerHour;

  const goldEl = document.getElementById("farm-metric-gold");
  if (goldEl) goldEl.textContent = farm.efficiencyMetrics.goldElixirPerHour;

  const hoursEl = document.getElementById("farm-metric-hours");
  if (hoursEl) hoursEl.textContent = `~${farm.efficiencyMetrics.estimatedHoursForHeroes} h`;

  const leagueEl = document.getElementById("farm-metric-league");
  if (leagueEl) leagueEl.textContent = farm.efficiencyMetrics.trophyRange;
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
      id: `upgrade-${u.id}-${Math.random().toString(36).substr(2, 9)}`,
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
      <div class="col-span-full text-center py-10 text-zinc-500 text-xs">
        Aucun chantier actif détecté.
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => `
    <div id="${item.id}" class="card-minimal p-4 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">${item.icon}</span>
            <div>
              <h4 class="text-xs font-semibold text-zinc-100 truncate">${item.title}</h4>
              <div class="text-[11px] text-zinc-400">Vers Niveau ${item.level}</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
            item.category === 'lab' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' :
            item.category === 'bb' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
            'bg-sky-500/10 text-sky-300 border border-sky-500/20'
          }">${item.tag}</span>
        </div>

        ${item.isHelper ? `
          <div class="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50">
            <span>👷</span> Boost Apprenti Actif
          </div>
        ` : ''}

        ${item.isGearUp ? `
          <div class="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <span>⚙️</span> Gear-Up en cours
          </div>
        ` : ''}
      </div>

      <div class="mt-4">
        <div class="flex items-center justify-between text-xs mb-1.5">
          <span class="text-zinc-500 text-[11px]">Temps restant</span>
          <span class="timer-countdown font-mono font-medium text-zinc-200 text-xs" data-timer-id="${item.id}">
            ${formatSecondsToCountdown(item.remainingSeconds)}
          </span>
        </div>
        <div class="progress-bar-slim">
          <div class="progress-fill ${
            item.category === 'lab' ? 'bg-purple-400' :
            item.category === 'bb' ? 'bg-emerald-400' :
            'bg-sky-400'
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
          el.textContent = "Terminé ✓";
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
    container.innerHTML = `<div class="col-span-full text-center py-8 text-zinc-500 text-xs">Aucun équipement correspondant à ce filtre.</div>`;
    return;
  }

  container.innerHTML = items.map(eq => {
    const isClose = eq.distToMilestone === 1;
    return `
      <div class="card-minimal p-3.5 flex flex-col justify-between ${
        eq.topTier ? 'border-amber-500/20' : ''
      }">
        <div>
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xl">${eq.icon}</span>
              <div>
                <h5 class="text-xs font-medium text-zinc-200 truncate max-w-[130px]">${eq.name}</h5>
                <span class="text-[10px] text-zinc-400">${eq.hero}</span>
              </div>
            </div>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
              eq.isEpic ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700/40'
            }">${eq.isEpic ? 'Épique' : 'Commun'}</span>
          </div>

          <div class="mt-3 flex items-center justify-between text-xs">
            <span class="text-zinc-400 text-[11px]">Niveau</span>
            <span class="font-mono font-medium text-zinc-200 text-xs">${eq.currentLevel} / ${eq.maxTh11}</span>
          </div>

          <div class="progress-bar-slim mt-1.5">
            <div class="progress-fill ${
              eq.isMilestone ? 'bg-emerald-400' : isClose ? 'bg-amber-400' : 'bg-sky-400'
            }" style="width: ${(eq.currentLevel / eq.maxTh11) * 100}%"></div>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
          <span class="text-zinc-500">Palier clé</span>
          <span class="font-mono ${
            eq.isMilestone ? 'text-emerald-400' : isClose ? 'text-amber-300 font-medium' : 'text-zinc-400'
          }">
            ${eq.isMilestone ? 'Atteint (x3) ✓' : `Prochain : Niv. ${eq.nextMilestone} (-${eq.distToMilestone})`}
          </span>
        </div>
      </div>
    `;
  }).join("");

  // Anime.js v4 Staggered Spring pour la grille d'équipements
  if (window.anime && window.anime.animate) {
    const { animate, spring, stagger } = window.anime;
    animate('#equipment-grid > *', {
      opacity: [0, 1],
      translateY: [10, 0],
      scale: [0.97, 1],
      delay: stagger(20, { from: 'start' }),
      ease: spring({ bounce: 0.35, stiffness: 160, damping: 14 })
    });
  }
}

/**
 * Rendu de la grille des troupes et sorts
 */
function renderArmyGrid(army) {
  const unitsContainer = document.getElementById("army-units-grid");
  const spellsContainer = document.getElementById("army-spells-grid");

  if (unitsContainer) {
    unitsContainer.innerHTML = army.units.map(u => `
      <div class="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">${u.icon}</span>
          <div>
            <div class="text-xs font-medium text-zinc-200">${u.name}</div>
            <div class="text-[10px] text-zinc-400">Max HDV 11 : ${u.maxTh11}</div>
          </div>
        </div>
        <div class="flex flex-col items-end">
          <span class="px-2 py-0.5 rounded text-xs font-mono font-medium ${
            u.isMax ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
          }">Niv. ${u.level}</span>
          ${u.canSuper ? `<span class="text-[9px] text-amber-400/90 font-mono mt-0.5">Super Débloqué ★</span>` : ''}
        </div>
      </div>
    `).join("");
  }

  if (spellsContainer) {
    spellsContainer.innerHTML = army.spells.map(s => `
      <div class="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">${s.icon}</span>
          <div>
            <div class="text-xs font-medium text-zinc-200">${s.name}</div>
            <div class="text-[10px] text-zinc-400">Max HDV 11 : ${s.maxTh11}</div>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-xs font-mono font-medium ${
          s.isMax ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
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
            backgroundColor: "rgba(56, 189, 248, 0.08)",
            pointBackgroundColor: "#38bdf8",
            pointBorderColor: "#09090b",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: 0.2,
            yAxisID: "y-th",
            order: 1
          },
          {
            type: "line",
            label: "Rythme Mensuel",
            data: hist.monthlyPace,
            borderColor: "#10b981",
            borderDash: [3, 3],
            pointBackgroundColor: "#10b981",
            pointRadius: 3,
            borderWidth: 1.5,
            tension: 0.2,
            yAxisID: "y-heroes",
            order: 2
          },
          {
            type: "bar",
            label: "Roi des Barbares",
            data: hist.heroes.king,
            backgroundColor: "rgba(245, 158, 11, 0.8)",
            stack: "heroes",
            yAxisID: "y-heroes",
            borderRadius: 3,
            barPercentage: 0.6,
            order: 3
          },
          {
            type: "bar",
            label: "Reine des Archères",
            data: hist.heroes.queen,
            backgroundColor: "rgba(192, 132, 252, 0.8)",
            stack: "heroes",
            yAxisID: "y-heroes",
            borderRadius: 3,
            barPercentage: 0.6,
            order: 4
          },
          {
            type: "bar",
            label: "Grand Gardien",
            data: hist.heroes.warden,
            backgroundColor: "rgba(56, 189, 248, 0.8)",
            stack: "heroes",
            yAxisID: "y-heroes",
            borderRadius: 3,
            barPercentage: 0.6,
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
              boxWidth: 8,
              boxHeight: 8,
              font: { size: 10 },
              color: "#71717a"
            }
          },
          tooltip: {
            backgroundColor: "rgba(9, 9, 11, 0.95)",
            titleColor: "#fafafa",
            bodyColor: "#a1a1aa",
            borderColor: "rgba(255, 255, 255, 0.08)",
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
            grid: { display: false },
            ticks: {
              font: { size: window.innerWidth < 640 ? 8.5 : 10 },
              color: "#71717a",
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
              color: "#71717a",
              font: { size: 10 }
            },
            grid: { color: "rgba(255, 255, 255, 0.03)" },
            ticks: { font: { size: window.innerWidth < 640 ? 8.5 : 10 }, color: "#71717a" }
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
            backgroundColor: "rgba(56, 189, 248, 0.06)",
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointBackgroundColor: "#38bdf8",
            pointBorderColor: "#09090b",
            pointBorderWidth: 1.5,
            pointRadius: (ctx) => {
              const val = fc.days[ctx.dataIndex];
              return val === 58 || val === 84 ? 5 : 2.5;
            },
            pointHoverRadius: 6,
            order: 1
          },
          {
            label: "Scénario B (Rythme Standard)",
            data: fc.scenarioB,
            borderColor: "#71717a",
            backgroundColor: "transparent",
            fill: false,
            tension: 0.3,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointBackgroundColor: "#71717a",
            pointRadius: (ctx) => {
              const val = fc.days[ctx.dataIndex];
              return val === 118 ? 4 : 2;
            },
            pointHoverRadius: 5,
            order: 2
          },
          {
            label: "Seuil Transition HDV 12 (45/45/18)",
            data: Array(count).fill(fc.targetThreshold),
            borderColor: "#10b981",
            borderDash: [3, 3],
            borderWidth: 1.2,
            pointRadius: 0,
            fill: false,
            order: 3
          },
          {
            label: "Cap Max HDV 11 (100%)",
            data: Array(count).fill(fc.maxThreshold),
            borderColor: "rgba(255, 255, 255, 0.15)",
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
              boxWidth: 8,
              boxHeight: 8,
              font: { size: window.innerWidth < 640 ? 9 : 10 },
              color: "#71717a"
            }
          },
          tooltip: {
            backgroundColor: "rgba(9, 9, 11, 0.95)",
            titleColor: "#fafafa",
            bodyColor: "#a1a1aa",
            borderColor: "rgba(255, 255, 255, 0.08)",
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
                  return "⚠️ [J+118] Atterrissage HDV 12 en rythme standard.";
                }
                return "";
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: window.innerWidth < 640 ? 8.5 : 10 },
              color: "#71717a",
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
              color: "#71717a",
              callback: (v) => `${v}%`
            },
            title: {
              display: window.innerWidth >= 640,
              text: "% Complétion HDV 11",
              color: "#71717a",
              font: { size: 10 }
            },
            grid: { color: "rgba(255, 255, 255, 0.03)" }
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

  // Configuration par défaut Dark Theme Minimal
  Chart.defaults.color = "#71717a";
  Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

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
            backgroundColor: ["#f59e0b", "#c084fc", "#38bdf8", "#818cf8"],
            borderRadius: 4,
            barPercentage: 0.6
          },
          {
            label: "Cap Max HDV 11",
            data: [h.king.maxTh11, h.queen.maxTh11, h.warden.maxTh11, h.minionPrince.maxTh11],
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            borderRadius: 4,
            barPercentage: 0.6
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
              boxWidth: 8,
              boxHeight: 8,
              font: { size: window.innerWidth < 640 ? 9 : 10 },
              color: "#71717a"
            }
          },
          tooltip: {
            backgroundColor: "rgba(9, 9, 11, 0.95)",
            titleColor: "#fafafa",
            bodyColor: "#a1a1aa",
            borderColor: "rgba(255, 255, 255, 0.08)",
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 55,
            ticks: {
              font: { size: window.innerWidth < 640 ? 8.5 : 10 },
              color: "#71717a"
            },
            grid: { color: "rgba(255, 255, 255, 0.03)" }
          },
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              font: { size: window.innerWidth < 640 ? 8.5 : 10 },
              color: "#71717a",
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
          backgroundColor: ["#38bdf8", "#27272a"],
          borderWidth: 0,
          hoverOffset: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "78%",
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              font: { size: window.innerWidth < 640 ? 9 : 10 },
              color: "#71717a"
            }
          },
          tooltip: {
            backgroundColor: "rgba(9, 9, 11, 0.95)",
            titleColor: "#fafafa",
            bodyColor: "#a1a1aa",
            borderColor: "rgba(255, 255, 255, 0.08)",
            borderWidth: 1,
            padding: 10
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

/**
 * Animations Liquid Glass & Entrée Élastique (Anime.js v4 Creative Motion)
 * Conforme aux règles strictes du SKILL.md (WAAPI + JS Engine + Spring Physics)
 */
function playLiquidEntranceAnimations(analysis) {
  if (!window.anime || !window.anime.animate) return;

  const { animate, spring, stagger, waapi } = window.anime;

  // 1. MOTEUR WAAPI (waapi.animate) : Apparition élastique & organique des cartes
  // Compositor thread 60/120 FPS (zéro saccade, performance maximale)
  try {
    const cards = document.querySelectorAll(".card-minimal, .panel-minimal");
    if (cards.length > 0) {
      if (waapi && waapi.animate) {
        waapi.animate(cards, {
          opacity: [0, 1],
          transform: ["translateY(16px) scale(0.98)", "translateY(0px) scale(1)"],
          duration: 480,
          delay: stagger(30, { from: "start" }),
          ease: "cubic-bezier(0.16, 1, 0.3, 1)"
        });
      } else {
        animate(cards, {
          opacity: [0, 1],
          translateY: [16, 0],
          scale: [0.98, 1],
          delay: stagger(30, { from: "start" }),
          ease: spring({ bounce: 0.35, stiffness: 140, damping: 14 })
        });
      }
    }
  } catch (err) {
    console.debug("Anime.js WAAPI entrance notice:", err);
  }

  // 2. MOTEUR JS (animate) : Compteurs numériques fluides pour les KPIs clés
  try {
    // A. Compteur % Remparts
    const wallsPctEl = document.getElementById("kpi-walls-pct");
    if (wallsPctEl && analysis.walls) {
      const targetWalls = analysis.walls.completionPercentage;
      const counterWalls = { val: 0 };
      animate(counterWalls, {
        val: targetWalls,
        duration: 900,
        ease: "outExpo",
        onUpdate: () => {
          wallsPctEl.textContent = `${counterWalls.val.toFixed(1)}%`;
        }
      });
    }

    // B. Compteur Hero Power Index
    const heroIndexEl = document.getElementById("kpi-hero-index");
    if (heroIndexEl && analysis.heroes) {
      const targetHero = analysis.heroes.globalHeroIndex;
      const counterHero = { val: 0 };
      animate(counterHero, {
        val: targetHero,
        duration: 850,
        ease: "outExpo",
        onUpdate: () => {
          heroIndexEl.textContent = `${Math.round(counterHero.val)}%`;
        }
      });
    }

    // C. Compteur Jours Restants Prévisionnels
    const countdownEl = document.getElementById("forecast-kpi-countdown");
    if (countdownEl && analysis.trajectory?.forecasting?.metrics) {
      const targetDays = analysis.trajectory.forecasting.metrics.optimalDaysToTarget;
      const counterDays = { val: 0 };
      animate(counterDays, {
        val: targetDays,
        duration: 800,
        ease: "outExpo",
        onUpdate: () => {
          countdownEl.textContent = `${Math.round(counterDays.val)} jours`;
        }
      });
    }
  } catch (err) {
    console.debug("Anime.js JS counter animation notice:", err);
  }
}
