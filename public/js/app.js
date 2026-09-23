/**
 * APP.JS - Contrôleur Principal & Interface Interactive du Tableau de Bord CoC
 */

let appState = {
  rawData: null,
  analysis: null,
  timers: [],
  timerInterval: null,
  charts: {},
  apiStatus: "fallback", // 'online' | 'fallback' | 'loading'
  currentStrategy: "farm"
};

if (typeof window !== "undefined") {
  window.appState = appState;
}

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

  // Écouteur de redimensionnement d'écran (orientation mobile & desktop, ignore le scroll toolbar)
  let resizeTimer;
  let lastWindowWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastWindowWidth) return;
    lastWindowWidth = window.innerWidth;
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
        saveVillageState(parsed);
        modalPaste.classList.add("hidden");
        modalPaste.classList.remove("flex");
        showToast("État du village actualisé avec succès !", "success");
      } catch (err) {
        showToast("Erreur : JSON invalide.", "error");
      }
    });
  }

  // Modal de synchronisation inter-appareils (Desktop <-> Mobile)
  const btnSyncModal = document.getElementById("btn-sync-modal");
  const modalSync = document.getElementById("modal-sync");
  const btnCloseSyncModal = document.getElementById("btn-close-sync-modal");
  const btnCopySyncUrl = document.getElementById("btn-copy-sync-url");
  const syncUrlInput = document.getElementById("sync-url-input");
  const syncQrCodeImg = document.getElementById("sync-qrcode-img");
  const btnDownloadJson = document.getElementById("btn-download-json");

  if (btnSyncModal && modalSync) {
    btnSyncModal.addEventListener("click", async () => {
      const currentData = appState.rawData || window.EMBEDDED_VILLAGE_DATA;
      if (!currentData) return;

      modalSync.classList.remove("hidden");
      modalSync.classList.add("flex");

      if (syncUrlInput) {
        syncUrlInput.value = "Génération du lien sécurisé...";
      }

      const encoded = await encodeVillageForUrl(currentData);
      const syncUrl = `${window.location.origin}${window.location.pathname}#sync=${encoded}`;

      if (syncUrlInput) {
        syncUrlInput.value = syncUrl;
      }
      if (syncQrCodeImg) {
        syncQrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(syncUrl)}`;
      }
    });

    if (btnCloseSyncModal) {
      btnCloseSyncModal.addEventListener("click", () => {
        modalSync.classList.add("hidden");
        modalSync.classList.remove("flex");
      });
    }

    if (btnCopySyncUrl && syncUrlInput) {
      btnCopySyncUrl.addEventListener("click", () => {
        navigator.clipboard.writeText(syncUrlInput.value).then(() => {
          const textEl = document.getElementById("copy-sync-text");
          if (textEl) textEl.textContent = "Copié !";
          showToast("Lien de synchronisation copié dans le presse-papier !", "success");
          setTimeout(() => {
            if (textEl) textEl.textContent = "Copier";
          }, 2500);
        });
      });
    }

    if (btnDownloadJson) {
      btnDownloadJson.addEventListener("click", () => {
        const currentData = appState.rawData || window.EMBEDDED_VILLAGE_DATA;
        const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `village_state_${currentData?.tag?.replace("#", "") || "GUQLRP8LV"}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Fichier village_state.json téléchargé !", "success");
      });
    }
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

  // Sélecteur d'onglets du Hub Multi-Stratégies
  const strategyTabBtns = document.querySelectorAll(".strategy-tab-btn");
  strategyTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      strategyTabBtns.forEach(b => {
        b.classList.remove("active", "bg-white/10", "text-white", "shadow-sm");
        b.classList.add("text-zinc-400");
      });
      btn.classList.add("active", "bg-white/10", "text-white", "shadow-sm");
      btn.classList.remove("text-zinc-400");
      appState.currentStrategy = btn.dataset.tab;
      renderActiveStrategy(appState.currentStrategy);
    });
  });

  // Copier la composition de la stratégie active
  const btnCopyArmy = document.getElementById("btn-copy-army");
  if (btnCopyArmy) {
    btnCopyArmy.addEventListener("click", () => {
      const currentKey = appState.currentStrategy || "farm";
      const strat = appState.analysis?.strategies?.[currentKey] || appState.analysis?.farmStrategy;
      const text = strat?.copyText || "Composition non trouvée";
      navigator.clipboard.writeText(text).then(() => {
        showToast(`Compo « ${strat?.title || 'Stratégie'} » copiée !`, "success");
      });
    });
  }

  // Accordéon / Toggle Laboratoire & Armée (Fermable / Ouvrable)
  const btnToggleArmyLab = document.getElementById("btn-toggle-army-lab");
  const headerArmyLab = document.getElementById("army-lab-header");
  const contentArmyLab = document.getElementById("army-lab-content");
  const textToggleArmyLab = document.getElementById("army-lab-toggle-text");
  const iconToggleArmyLab = document.getElementById("army-lab-toggle-icon");

  let isArmyLabOpen = true;

  const toggleArmyLab = () => {
    isArmyLabOpen = !isArmyLabOpen;
    if (isArmyLabOpen) {
      contentArmyLab.classList.remove("hidden");
      if (textToggleArmyLab) textToggleArmyLab.textContent = "Masquer";
      if (iconToggleArmyLab) {
        iconToggleArmyLab.setAttribute("data-lucide", "chevron-up");
        iconToggleArmyLab.style.transform = "rotate(0deg)";
      }
    } else {
      contentArmyLab.classList.add("hidden");
      if (textToggleArmyLab) textToggleArmyLab.textContent = "Afficher";
      if (iconToggleArmyLab) {
        iconToggleArmyLab.setAttribute("data-lucide", "chevron-down");
        iconToggleArmyLab.style.transform = "rotate(180deg)";
      }
    }
    initLucide();
  };

  if (btnToggleArmyLab) {
    btnToggleArmyLab.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleArmyLab();
    });
  }
  if (headerArmyLab) {
    headerArmyLab.addEventListener("click", toggleArmyLab);
  }

  // Feedback tactile élastique Anime.js v4 (Spring juicy physics)
  document.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".btn-minimal, .filter-pill, .strategy-tab-btn, #btn-sync-api, #btn-copy-army, #btn-paste-modal, #btn-toggle-army-lab");
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
      saveVillageState(json);
      showToast(`Fichier ${file.name} importé & synchronisé partout !`, "success");
    } catch (err) {
      showToast("Fichier JSON corrompu ou illisible", "error");
    }
  };
  reader.readAsText(file);
}

/**
 * Sauvegarde locale & synchronisation backend du village
 */
async function saveVillageState(data) {
  if (!data || !data.tag) return;

  // 1. Sauvegarde instantanée dans localStorage (persiste sur cet appareil après refresh)
  try {
    localStorage.setItem("coc_village_state", JSON.stringify(data));
    localStorage.setItem("coc_village_state_saved_at", Date.now().toString());
  } catch (e) {
    console.warn("Échec écriture localStorage :", e);
  }

  // 2. Synchronisation vers le serveur / API
  try {
    const res = await fetch("/api/village", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const resp = await res.json();
      if (resp.savedToGithub) {
        showToast("Village commité sur GitHub (sync multi-appareils active) !", "success");
      }
    }
  } catch (err) {
    // Mode local silencieux si serveur non joignable
  }
}

/**
 * Compression gzip base64url pour lien de synchronisation Desktop <-> Mobile
 */
async function encodeVillageForUrl(data) {
  try {
    const jsonStr = JSON.stringify(data);
    const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream("gzip"));
    const buffer = await (await new Response(stream).blob()).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (err) {
    // Fallback base64 simple
    return btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
}

/**
 * Décompression d'un village depuis le hash d'URL
 */
async function decodeVillageFromUrl(b64url) {
  try {
    let b64Clean = b64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64Clean.length % 4) b64Clean += "=";
    const decodedBinary = atob(b64Clean);
    const decodedBytes = new Uint8Array(decodedBinary.length);
    for (let i = 0; i < decodedBinary.length; i++) decodedBytes[i] = decodedBinary.charCodeAt(i);

    // Tentative de décompression Gzip
    try {
      const decompStream = new Blob([decodedBytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      const decompText = await new Response(decompStream).text();
      return JSON.parse(decompText);
    } catch (gzErr) {
      // Fallback décodage simple
      const rawText = decodeURIComponent(escape(decodedBinary));
      return JSON.parse(rawText);
    }
  } catch (err) {
    console.error("Échec du décodage du village depuis l'URL :", err);
    return null;
  }
}

/**
 * Chargement initial des données avec synchronisation multi-sources
 */
async function loadInitialData() {
  // 1. Vérification d'un lien de synchronisation inter-appareils (#sync=... ou #data=...)
  const hash = window.location.hash;
  if (hash && (hash.startsWith("#sync=") || hash.startsWith("#data="))) {
    const b64 = hash.replace(/^#(sync|data)=/, "");
    if (b64) {
      const sharedVillage = await decodeVillageFromUrl(b64);
      if (sharedVillage && sharedVillage.tag) {
        loadVillageData(sharedVillage);
        saveVillageState(sharedVillage);
        try {
          history.replaceState(null, "", window.location.pathname);
        } catch (e) {}
        showToast("Village synchronisé avec succès depuis l'autre appareil !", "success");
        return;
      }
    }
  }

  // 2. Vérification du stockage local de cet appareil (localStorage)
  try {
    const savedLocal = localStorage.getItem("coc_village_state");
    if (savedLocal) {
      const localData = JSON.parse(savedLocal);
      if (localData && localData.tag) {
        loadVillageData(localData);
        // Tente de vérifier si le serveur a plus récent en arrière-plan
        fetchServerVillageInBackground();
        return;
      }
    }
  } catch (e) {
    console.warn("Erreur lecture localStorage :", e);
  }

  // 3. Rendu instantané des données embarquées par défaut
  if (window.EMBEDDED_VILLAGE_DATA) {
    loadVillageData(window.EMBEDDED_VILLAGE_DATA);
  }

  // 4. Synchronisation en arrière-plan avec /api/village si disponible
  fetchServerVillageInBackground();
}

async function fetchServerVillageInBackground() {
  try {
    const res = await fetch("/api/village");
    const contentType = res.headers.get("content-type");
    if (res.ok && contentType && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && (data.heroes || data.buildings)) {
        if (!appState.rawData || data.timestamp > (appState.rawData.timestamp || 0)) {
          loadVillageData(data);
          try {
            localStorage.setItem("coc_village_state", JSON.stringify(data));
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    // Mode local silencieux
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
    const contentType = res.headers.get("content-type");
    if (!res.ok || !contentType || !contentType.includes("application/json")) {
      throw new Error(`Endpoint indisponible (HTTP ${res.status})`);
    }

    const json = await res.json();

    if (json.source === "supercell_api" && json.player) {
      appState.apiStatus = "online";
      showToast("Synchronisation API Supercell réussie !", "success");
      updateApiStatusBadge(true, "API Supercell en direct");
      updatePlayerOfficialMeta(json.player);
    } else if (json.village) {
      appState.apiStatus = "fallback";
      loadVillageData(json.village);
      showToast("Synchronisation locale réussie (Données à jour) !", "success");
      updateApiStatusBadge(false, "Mode Local (Synchronisé)");
    } else {
      throw new Error("Réponse inattendue de l'API");
    }
  } catch (err) {
    appState.apiStatus = "fallback";
    // Réappliquer le fallback local pour être sûr à 100% que l'UI est toujours fraîche
    if (window.EMBEDDED_VILLAGE_DATA) {
      loadVillageData(window.EMBEDDED_VILLAGE_DATA);
    }
    showToast("Mode autonome : Données du village synchronisées en local.", "info");
    updateApiStatusBadge(false, "Mode Local (Autonome)");
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
  if (!data) return;
  appState.rawData = data;
  const analyzer = (typeof COC_ANALYZER !== 'undefined') 
    ? COC_ANALYZER 
    : (typeof window !== 'undefined' && window.COC_ANALYZER) 
      ? window.COC_ANALYZER 
      : null;
  if (!analyzer) {
    console.error("COC_ANALYZER non disponible au chargement.");
    return;
  }
  appState.analysis = analyzer.analyze(data);

  renderKPIs(appState.analysis);
  renderAntiRushAlert(appState.analysis.heroes);
  renderCraftedDefense(appState.analysis.craftedDefense);
  renderActiveStrategy(appState.currentStrategy || "farm");
  renderTrajectorySection(appState.analysis);
  renderHelpers(appState.analysis.helpers);
  renderTimers(appState.analysis.builders, appState.analysis.army.labActiveResearch, appState.analysis.builderBase, appState.analysis.helpers);
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
  const thEl = document.getElementById("kpi-th-level");
  if (thEl) thEl.textContent = `HDV ${analysis.thLevel}`;
  
  // Ouvriers (v18.600.5 : 6 ouvriers via Cabane B.O.B)
  const b = analysis.builders;
  const bCountEl = document.getElementById("kpi-builders-count");
  if (bCountEl) bCountEl.textContent = `${b.busyBuilders} / ${b.totalBuilders}`;
  const buildersStatusEl = document.getElementById("kpi-builders-status");
  if (buildersStatusEl) {
    buildersStatusEl.textContent = b.hasFreeBuilder 
      ? `${b.freeBuilders} ouvrier libre (mobilisable !)`
      : "Tous les ouvriers sont occupés";
    buildersStatusEl.className = b.hasFreeBuilder 
      ? "text-emerald-400 text-xs mt-1 font-medium" 
      : "text-amber-400 text-xs mt-1";
  }

  // Remparts
  const w = analysis.walls;
  const wProgEl = document.getElementById("kpi-walls-progress");
  if (wProgEl) wProgEl.textContent = `${w.lvl12Count} / ${w.totalWalls}`;
  const wPctEl = document.getElementById("kpi-walls-pct");
  if (wPctEl) wPctEl.textContent = `${w.completionPercentage}%`;
  const wBarEl = document.getElementById("kpi-walls-bar");
  if (wBarEl) wBarEl.style.width = `${w.completionPercentage}%`;
  const wSubEl = document.getElementById("kpi-walls-sub");
  if (wSubEl) wSubEl.textContent = `${w.lvl11Count} remparts restant à passer niv. 12`;

  // Hero Power Index (v18.600.5 : 4 Héros cumulés sur 150 niveaux)
  const h = analysis.heroes;
  const hIdxEl = document.getElementById("kpi-hero-index");
  if (hIdxEl) hIdxEl.textContent = `${h.totalCurrent} / ${h.totalMax}`;
  const hBarEl = document.getElementById("kpi-hero-bar");
  if (hBarEl) hBarEl.style.width = `${h.globalHeroIndex}%`;
  const heroBadge = document.getElementById("kpi-hero-badge");
  if (heroBadge) {
    heroBadge.textContent = `${h.globalHeroIndex}%`;
    heroBadge.className = h.isCriticalUnderleveled 
      ? "px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
      : "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
  }

  const heroSubEl = document.getElementById("kpi-hero-sub");
  if (heroSubEl) {
    heroSubEl.textContent = `Roi ${h.king.level} • Reine ${h.queen.level} • Gardien ${h.warden.level} • Prince ${h.minionPrince.level}`;
  }

  // Badge déficit global sur le graphique héros
  const heroesDeficitBadge = document.getElementById("heroes-deficit-badge");
  if (heroesDeficitBadge) {
    const totalDeficit = h.king.deficit + h.queen.deficit + h.warden.deficit + h.minionPrince.deficit;
    heroesDeficitBadge.textContent = `Déficit : -${totalDeficit} niveaux`;
  }
}

/**
 * Rendu de la bannière d'alerte Anti-Rush (Sober & Factual - 4 Héros v18.600.5)
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
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div class="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <div class="flex items-center justify-between text-xs text-zinc-200">
                  <span class="text-zinc-400">Roi</span>
                  <span class="font-mono font-medium">${heroes.king.level} / ${heroes.king.maxTh11}</span>
                </div>
                <div class="progress-bar-slim mt-2">
                  <div class="progress-fill bg-amber-400" style="width: ${heroes.king.progress}%"></div>
                </div>
                <div class="text-[11px] text-zinc-500 mt-1.5 font-mono">-${heroes.king.deficit} niv. (~${Math.round(heroes.king.enNeeded / 1000)}k EN)</div>
              </div>

              <div class="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <div class="flex items-center justify-between text-xs text-zinc-200">
                  <span class="text-zinc-400">Reine</span>
                  <span class="font-mono font-medium">${heroes.queen.level} / ${heroes.queen.maxTh11}</span>
                </div>
                <div class="progress-bar-slim mt-2">
                  <div class="progress-fill bg-purple-400" style="width: ${heroes.queen.progress}%"></div>
                </div>
                <div class="text-[11px] text-zinc-500 mt-1.5 font-mono">-${heroes.queen.deficit} niv. (~${Math.round(heroes.queen.enNeeded / 1000)}k EN)</div>
              </div>

              <div class="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <div class="flex items-center justify-between text-xs text-zinc-200">
                  <span class="text-zinc-400">Gardien</span>
                  <span class="font-mono font-medium">${heroes.warden.level} / ${heroes.warden.maxTh11}</span>
                </div>
                <div class="progress-bar-slim mt-2">
                  <div class="progress-fill bg-sky-400" style="width: ${heroes.warden.progress}%"></div>
                </div>
                <div class="text-[11px] text-zinc-500 mt-1.5 font-mono">-${heroes.warden.deficit} niv. (~${Math.round(heroes.warden.elixirNeeded / 1000000)}M Rose)</div>
              </div>

              <div class="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <div class="flex items-center justify-between text-xs text-zinc-200">
                  <span class="text-zinc-400">Prince</span>
                  <span class="font-mono font-medium">${heroes.minionPrince.level} / ${heroes.minionPrince.maxTh11}</span>
                </div>
                <div class="progress-bar-slim mt-2">
                  <div class="progress-fill bg-indigo-400" style="width: ${heroes.minionPrince.progress}%"></div>
                </div>
                <div class="text-[11px] text-zinc-500 mt-1.5 font-mono">-${heroes.minionPrince.deficit} niv. (~${Math.round(heroes.minionPrince.enNeeded / 1000)}k EN)</div>
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
            <p class="text-[11px] text-zinc-400">Vos 4 héros respectent les paliers recommandés pour votre niveau d'Hôtel de Ville.</p>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Rendu du Hub Multi-Stratégies HDV 11 (Farm, GDC, Rush, Sans Héros)
 */
function renderActiveStrategy(strategyKey = "farm") {
  const container = document.getElementById("strategy-content-container");
  if (!container || !appState.analysis) return;

  const strategies = appState.analysis.strategies || {};
  const strat = strategies[strategyKey] || appState.analysis.farmStrategy || strategies.farm;
  if (!strat) return;

  // Mise à jour de l'en-tête de la section
  const subtitleEl = document.getElementById("strategy-subtitle");
  if (subtitleEl) subtitleEl.textContent = strat.subtitle;

  const badgeEl = document.getElementById("strategy-badge-difficulty");
  if (badgeEl) {
    badgeEl.textContent = strat.difficulty;
    badgeEl.className = strat.difficulty === "Facile"
      ? "px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
      : strat.difficulty.includes("Facile")
      ? "px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20"
      : "px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20";
  }

  // Construction du contenu dynamique en 3 cartes minimalistes
  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
      
      <!-- Carte 1 : Composition (Troupes, Sorts & CDC) -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Armée & Sorts</h4>
          <span class="text-[11px] font-mono text-zinc-500">260 places</span>
        </div>

        <!-- Troupes -->
        <div class="space-y-2">
          ${strat.recommendedArmy.troops.map(t => `
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-lg flex-shrink-0">${t.icon}</span>
                <div class="min-w-0">
                  <div class="text-xs font-medium text-zinc-200 truncate">${t.name}</div>
                  <div class="text-[10px] text-zinc-500 truncate">${t.role}</div>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded font-mono font-medium text-xs bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex-shrink-0 ml-2">x${t.count}</span>
            </div>
          `).join("")}
        </div>

        <!-- Sorts -->
        <div class="space-y-2 pt-1">
          ${strat.recommendedArmy.spells.map(s => `
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-lg flex-shrink-0">${s.icon}</span>
                <div class="min-w-0">
                  <div class="text-xs font-medium text-zinc-200 truncate">${s.name}</div>
                  <div class="text-[10px] text-zinc-500 truncate">${s.role}</div>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded font-mono font-medium text-xs bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex-shrink-0 ml-2">x${s.count}</span>
            </div>
          `).join("")}
        </div>

        <!-- Château de Clan (CDC) -->
        ${strat.recommendedArmy.clanCastle ? `
          <div class="p-3 rounded-lg bg-indigo-500/[0.06] border border-indigo-500/20 flex items-start gap-2.5 text-xs">
            <span class="text-indigo-400 font-bold">🏰</span>
            <div>
              <span class="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider block">Renforts CDC conseillés</span>
              <span class="text-zinc-300 text-xs mt-0.5 block">${strat.recommendedArmy.clanCastle}</span>
            </div>
          </div>
        ` : ""}
      </div>

      <!-- Carte 2 : Profil Tactique & Rendement -->
      <div class="space-y-3">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Profil & Équipements</h4>
        
        <div class="space-y-2.5">
          <div class="card-minimal p-3.5">
            <div class="text-[11px] text-zinc-400">Résultat attendu :</div>
            <div class="text-sm font-semibold text-zinc-100 mt-1 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>${strat.expectedResult}</span>
            </div>
          </div>

          <div class="card-minimal p-3.5">
            <div class="text-[11px] text-zinc-400">Équipements de héros clés :</div>
            <div class="text-xs font-medium text-zinc-200 mt-1">${strat.keyEquipments}</div>
          </div>

          <div class="card-minimal p-3.5">
            <div class="text-[11px] text-zinc-400">Zone d'efficacité / Ligue :</div>
            <div class="text-xs font-mono text-zinc-300 mt-1">${strat.efficiencyMetrics.trophyRange || strat.efficiencyMetrics.darkElixirPerHour}</div>
          </div>

          <div class="card-minimal p-3.5">
            <div class="text-[11px] text-zinc-400">Rentabilité / Spécificité :</div>
            <div class="text-xs text-zinc-300 mt-1">${strat.efficiencyMetrics.goldElixirPerHour || strat.efficiencyMetrics.estimatedHoursForHeroes}</div>
          </div>
        </div>
      </div>

      <!-- Carte 3 : Plan d'Action en 3 Étapes -->
      <div class="space-y-3">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Plan d'Attaque (3 Étapes)</h4>
        
        <div class="card-minimal p-4 space-y-3">
          ${strat.tacticalPlan.map((step, idx) => `
            <div class="flex items-start gap-3 text-xs">
              <span class="w-5 h-5 rounded-full bg-white/10 text-white font-mono font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/20">
                ${idx + 1}
              </span>
              <p class="text-zinc-300 leading-relaxed">${step}</p>
            </div>
          `).join("")}
        </div>
      </div>

    </div>
  `;

  // Animation Anime.js v4 d'apparition fluide (sans flash d'opacité)
  if (window.innerWidth >= 640 && window.anime && window.anime.animate) {
    const { animate } = window.anime;
    animate("#strategy-content-container", {
      opacity: [0.85, 1],
      translateY: [6, 0],
      duration: 220,
      ease: "outQuad"
    });
  }
}

function renderFarmStrategy(farm) {
  renderActiveStrategy("farm");
}

/**
 * Rendu de la Station d'Artisanat Défensif (v18.600.5)
 */
function renderCraftedDefense(craftedDefense) {
  const container = document.getElementById("crafted-defense-types-container");
  const badgeLabel = document.getElementById("crafted-defense-active-label");
  if (!container) return;

  if (!craftedDefense || !craftedDefense.available || !craftedDefense.types || craftedDefense.types.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-6 text-xs text-zinc-500">
        Station d'Artisanat Défensif non disponible.
      </div>
    `;
    return;
  }

  if (badgeLabel && craftedDefense.activeType) {
    badgeLabel.textContent = `Mode : ${craftedDefense.activeType.shortName}`;
  }

  container.innerHTML = craftedDefense.types.map((type, idx) => {
    const isActive = idx === 0;
    return `
      <div class="card-minimal p-4 flex flex-col justify-between transition-all duration-200 ${
        isActive ? 'border-cyan-500/30 bg-cyan-500/[0.03] ring-1 ring-cyan-500/20' : 'opacity-80 hover:opacity-100'
      }">
        <div>
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">${type.icon}</span>
              <div>
                <h4 class="text-xs font-semibold text-zinc-100">${type.name}</h4>
                <div class="text-[10px] text-zinc-400 mt-0.5">${type.desc}</div>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
              isActive ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
            }">${isActive ? 'Actif' : 'Permutable'}</span>
          </div>

          <div class="mt-4 space-y-2.5">
            <div class="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Niveau du mode</span>
              <span class="font-mono text-zinc-200 font-medium">${type.totalLevel} / ${type.maxLevel}</span>
            </div>

            <!-- Modules -->
            <div class="space-y-2 pt-1 border-t border-white/[0.06]">
              ${type.modules.map(mod => `
                <div class="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-[11px] text-zinc-300 flex items-center gap-1.5">
                      <span>${mod.icon}</span>
                      <span>${mod.name}</span>
                    </span>
                    <span class="font-mono text-[10px] text-zinc-400">Niv. ${mod.level} / ${mod.maxLevel}</span>
                  </div>
                  <div class="progress-bar-slim mt-1.5">
                    <div class="progress-fill ${
                      mod.type === 'hitpoints' ? 'bg-rose-400' :
                      mod.type === 'damage' ? 'bg-amber-400' :
                      'bg-cyan-400'
                    }" style="width: ${mod.progressPct}%"></div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="mt-4 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
          <span class="text-zinc-500">Statut tactique</span>
          <span class="font-mono text-xs ${isActive ? 'text-cyan-300 font-medium' : 'text-zinc-400'}">
            ${isActive ? 'Actif en défense' : 'En réserve'}
          </span>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Rendu des assistants actifs (Apprenti Ouvrier & Assistant Labo)
 */
function renderHelpers(helpers) {
  const container = document.getElementById("helpers-grid");
  const badgeEl = document.getElementById("helpers-summary-badge");

  if (badgeEl && helpers) {
    badgeEl.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
      <span>+${helpers.totalDailyTimeSavedHours}h / jour économisées</span>
    `;
  }

  if (!container || !helpers || !helpers.list) return;

  container.innerHTML = helpers.list.map(h => `
    <div class="card-minimal p-4 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
              ${h.icon}
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h4 class="text-xs font-semibold text-zinc-100">${h.name}</h4>
                <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">Niv. ${h.lvl}</span>
              </div>
              <div class="text-[11px] text-zinc-400 mt-0.5">${h.assignedTarget}</div>
            </div>
          </div>

          <div id="helper-status-${h.id}">
            ${h.isAvailable ? `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Disponible</span>
              </span>
            ` : `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span class="font-mono" id="helper-timer-${h.id}">${formatSecondsToCountdown(h.cooldownSeconds)}</span>
              </span>
            `}
          </div>
        </div>

        <p class="text-xs text-zinc-300 mt-3 leading-relaxed">
          ${h.note}
        </p>
      </div>

      <div class="mt-3.5 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
        <span class="text-zinc-400">Gain de temps :</span>
        <span class="font-mono font-semibold text-emerald-400">${h.dailyImpactStr}</span>
      </div>
    </div>
  `).join("");
}

/**
 * Rendu des chantiers & timers interactifs
 */
function renderTimers(builders, labResearch, builderBase, helpers) {
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

  // Boucle de décrémentation des timers et cooldowns des assistants chaque seconde
  appState.timerInterval = setInterval(() => {
    // 1. Chantiers
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

    // 2. Cooldowns des assistants
    const helpersList = appState.analysis?.helpers?.list;
    if (helpersList && helpersList.length > 0) {
      helpersList.forEach(h => {
        if (h.cooldownSeconds > 0) {
          h.cooldownSeconds--;
          const timerEl = document.getElementById(`helper-timer-${h.id}`);
          if (timerEl) {
            timerEl.textContent = formatSecondsToCountdown(h.cooldownSeconds);
          }
        } else if (!h.isAvailable) {
          h.isAvailable = true;
          const statusContainer = document.getElementById(`helper-status-${h.id}`);
          if (statusContainer) {
            statusContainer.innerHTML = `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Disponible</span>
              </span>
            `;
          }
        }
      });
    }
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
    items = items.filter(i => i.heroKey === "king" || i.hero === "Roi");
  } else if (filter === "queen") {
    items = items.filter(i => i.heroKey === "queen" || i.hero === "Reine");
  } else if (filter === "warden") {
    items = items.filter(i => i.heroKey === "warden" || i.hero === "Gardien");
  } else if (filter === "prince") {
    items = items.filter(i => i.heroKey === "prince" || i.hero === "Prince" || i.hero === "Prince Gargouille");
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

  // Anime.js v4 Staggered Spring pour la grille d'équipements (sur desktop uniquement pour préserver la mémoire VRAM mobile)
  if (window.innerWidth >= 640 && window.anime && window.anime.animate) {
    const { animate, spring, stagger } = window.anime;
    animate('#equipment-grid > *', {
      opacity: [0.85, 1],
      translateY: [6, 0],
      delay: stagger(15, { from: 'start' }),
      ease: spring({ bounce: 0.25, stiffness: 180, damping: 14 })
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
    buildersBadgeEl.textContent = `${analysis.builders.busyBuilders} / ${analysis.builders.totalBuilders} Ouvriers (${analysis.builders.freeBuilders} Libre)`;
  }

  // 2. Initialisation des Graphiques Chart.js
  if (typeof Chart === "undefined") return;

  const isMobile = window.innerWidth < 640;

  // A. Graphique Historique de Progression (Combo Bar + Line - 4 Héros v18.600.5)
  const ctxHistory = document.getElementById("chart-progression-history");
  if (ctxHistory) {
    if (appState.charts.progressionHistory) appState.charts.progressionHistory.destroy();

    const hist = traj.history;
    const historyLabels = isMobile 
      ? ["M1", "M2", "M3", "M4", "M5", "M6", "J0"] 
      : hist.labels;

    appState.charts.progressionHistory = new Chart(ctxHistory, {
      type: "bar",
      data: {
        labels: historyLabels,
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
            pointRadius: isMobile ? 3 : 4,
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
            pointRadius: isMobile ? 2.5 : 3,
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
            barPercentage: 0.65,
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
            barPercentage: 0.65,
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
            barPercentage: 0.65,
            order: 5
          },
          {
            type: "bar",
            label: "Prince Gargouille",
            data: hist.heroes.minionPrince,
            backgroundColor: "rgba(129, 140, 248, 0.85)",
            stack: "heroes",
            yAxisID: "y-heroes",
            borderRadius: 3,
            barPercentage: 0.65,
            order: 6
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
              boxWidth: isMobile ? 6 : 8,
              boxHeight: isMobile ? 6 : 8,
              font: { size: isMobile ? 9 : 10 },
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
              title: (tooltipItems) => {
                const idx = tooltipItems[0].dataIndex;
                return hist.labels[idx] || tooltipItems[0].label;
              },
              afterBody: (tooltipItems) => {
                const idx = tooltipItems[0].dataIndex;
                const totalHeros = hist.cumulativeHeroes[idx];
                return `Total 4 Héros : Niv. ${totalHeros} / 150`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              font: { size: isMobile ? 9 : 10 },
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
            max: 95,
            title: {
              display: !isMobile,
              text: "Niveaux 4 Héros",
              color: "#71717a",
              font: { size: 10 }
            },
            grid: { color: "rgba(255, 255, 255, 0.03)" },
            ticks: { 
              font: { size: isMobile ? 9 : 10 }, 
              color: "#71717a",
              maxTicksLimit: isMobile ? 5 : 8
            }
          },
          "y-th": {
            type: "linear",
            position: "right",
            beginAtZero: false,
            min: 1,
            max: 12,
            title: {
              display: !isMobile,
              text: "Hôtel de Ville",
              color: "#38bdf8",
              font: { size: 10 }
            },
            ticks: {
              stepSize: 2,
              font: { size: isMobile ? 9 : 10 },
              color: "#38bdf8",
              maxTicksLimit: isMobile ? 5 : 6,
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
    const forecastLabels = isMobile
      ? ["J0", "+15", "+30", "+45", "+54", "+70", "+79", "+95", "+110", "+130", "+160"]
      : fc.labels;

    appState.charts.forecasting = new Chart(ctxForecast, {
      type: "line",
      data: {
        labels: forecastLabels,
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
              return val === 54 || val === 79 ? 5 : 2.5;
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
              return val === 110 ? 4 : 2;
            },
            pointHoverRadius: 5,
            order: 2
          },
          {
            label: "Seuil Transition HDV 12 (45/45/18/27)",
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
              boxWidth: isMobile ? 6 : 8,
              boxHeight: isMobile ? 6 : 8,
              font: { size: isMobile ? 9 : 10 },
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
              title: (tooltipItems) => {
                const idx = tooltipItems[0].dataIndex;
                return fc.labels[idx] || tooltipItems[0].label;
              },
              label: (context) => {
                const val = context.parsed.y;
                return `${context.dataset.label}: ${val}%`;
              },
              afterBody: (tooltipItems) => {
                const idx = tooltipItems[0].dataIndex;
                const day = fc.days[idx];
                if (day === 54) {
                  return "🎯 [J+54] Passage HDV 12 sain accéléré par l'Apprenti Ouvrier (+2h/j) !";
                } else if (day === 79) {
                  return "🏆 [J+79] Village HDV 11 100% maxé avec 4 héros et assistants (+5h/j) !";
                } else if (day === 110) {
                  return "⚠️ [J+110] Atterrissage HDV 12 en rythme standard (+ assistants inclus).";
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
              font: { size: isMobile ? 9 : 10 },
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
              font: { size: isMobile ? 9 : 10 },
              color: "#71717a",
              maxTicksLimit: isMobile ? 6 : 8,
              callback: (v) => `${v}%`
            },
            title: {
              display: !isMobile,
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
let hasEntranceAnimated = false;

function playLiquidEntranceAnimations(analysis) {
  if (!window.anime || !window.anime.animate) return;

  const { animate, spring, stagger, waapi } = window.anime;

  // 1. MOTEUR WAAPI (waapi.animate) : Apparition fluide UNIQUEMENT au premier montage
  // Évite impérativement de masquer à opacity: 0 sur mobile où WebKit iOS peut figer les fenêtres hors-champ !
  if (!hasEntranceAnimated) {
    hasEntranceAnimated = true;
    try {
      const isMobile = window.innerWidth < 640;
      const topSections = document.querySelectorAll("main > section, main > div");
      if (topSections.length > 0 && !isMobile) {
        if (waapi && waapi.animate) {
          const anim = waapi.animate(topSections, {
            opacity: [0.85, 1],
            transform: ["translateY(8px)", "translateY(0px)"],
            duration: 380,
            delay: stagger(20, { from: "start" }),
            ease: "cubic-bezier(0.16, 1, 0.3, 1)"
          });
          if (anim && anim.finished) {
            anim.finished.then(() => {
              topSections.forEach(s => {
                s.style.opacity = "";
                s.style.transform = "";
              });
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.debug("Anime.js entrance notice:", err);
    }
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

    // B. Compteur Hero Power Index (v18.600.5 : 82 / 150)
    const heroIndexEl = document.getElementById("kpi-hero-index");
    if (heroIndexEl && analysis.heroes) {
      const targetCurrent = analysis.heroes.totalCurrent;
      const counterHero = { val: 0 };
      animate(counterHero, {
        val: targetCurrent,
        duration: 850,
        ease: "outExpo",
        onUpdate: () => {
          heroIndexEl.textContent = `${Math.round(counterHero.val)} / ${analysis.heroes.totalMax}`;
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
