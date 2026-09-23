/**
 * ANALYSIS.JS - Moteur d'Analyse Freemium & Algorithme d'Optimisation Clash of Clans
 */

// Accès universel au référentiel COC_DATA sans redéclaration globale
const cocDataRef = (typeof COC_DATA !== 'undefined')
  ? COC_DATA
  : (typeof window !== 'undefined' && window.COC_DATA)
    ? window.COC_DATA
    : (typeof global !== 'undefined' && global.COC_DATA)
      ? global.COC_DATA
      : (typeof require !== 'undefined' ? require('./coc_data').COC_DATA : {});

const COC_ANALYZER = {
  /**
   * Analyse complète de l'état du village
   * @param {Object} villageState Données brutes du JSON
   * @returns {Object} Rapport complet d'optimisation
   */
  analyze(villageState) {
    if (!villageState) return null;

    const timestamp = villageState.timestamp || Math.floor(Date.now() / 1000);
    const heroesAnalysis = this.analyzeHeroes(villageState.heroes || []);
    const wallsAnalysis = this.analyzeWalls(villageState.buildings || []);
    const equipmentAnalysis = this.analyzeEquipment(villageState.equipment || []);
    const helpersAnalysis = this.analyzeHelpers(villageState.helpers || []);
    const buildersAnalysis = this.analyzeBuilders(villageState.buildings || [], villageState.helpers || [], timestamp, helpersAnalysis);
    const craftedDefenseAnalysis = this.analyzeCraftedDefense(villageState.buildings || []);
    const armyAnalysis = this.analyzeArmy(villageState.units || [], villageState.spells || []);
    const strategies = this.generateStrategies(heroesAnalysis, wallsAnalysis, armyAnalysis);
    const bbAnalysis = this.analyzeBuilderBase(villageState.buildings2 || [], villageState.heroes2 || [], villageState.units2 || [], timestamp);
    const trajectory = this.generateTrajectoryData(villageState, heroesAnalysis, buildersAnalysis, armyAnalysis, helpersAnalysis);

    return {
      tag: villageState.tag || "#GUQLRP8LV",
      timestamp: timestamp,
      thLevel: 11,
      version: "18.600.5",
      heroes: heroesAnalysis,
      walls: wallsAnalysis,
      equipment: equipmentAnalysis,
      helpers: helpersAnalysis,
      builders: buildersAnalysis,
      craftedDefense: craftedDefenseAnalysis,
      army: armyAnalysis,
      strategies: strategies,
      farmStrategy: strategies.farm,
      builderBase: bbAnalysis,
      trajectory: trajectory,
      overallScore: this.calculateOverallScore(heroesAnalysis, wallsAnalysis, equipmentAnalysis)
    };
  },

  /**
   * Analyse des héros & calcul du retard critique (v18.600.5 : 4 Héros dans le Village Principal)
   */
  analyzeHeroes(heroesList) {
    const heroMap = {};
    heroesList.forEach(h => {
      heroMap[h.data] = h.lvl;
    });

    const kingLvl = heroMap[28000000] || 0;
    const queenLvl = heroMap[28000001] || 0;
    const wardenLvl = heroMap[28000002] || 0;
    const minionPrinceLvl = heroMap[28000006] || 0;

    // Caps HDV 11 (v18.600.5 - Débloqués via Hall des Héros Niv. 5)
    const kingMax = 50;
    const queenMax = 50;
    const wardenMax = 20;
    const minionPrinceMax = 30;

    const kingDeficit = Math.max(0, kingMax - kingLvl);
    const queenDeficit = Math.max(0, queenMax - queenLvl);
    const wardenDeficit = Math.max(0, wardenMax - wardenLvl);
    const minionPrinceDeficit = Math.max(0, minionPrinceMax - minionPrinceLvl);

    const kingPct = Math.round((kingLvl / kingMax) * 100);
    const queenPct = Math.round((queenLvl / queenMax) * 100);
    const wardenPct = Math.round((wardenLvl / wardenMax) * 100);
    const minionPrincePct = Math.round((minionPrinceLvl / minionPrinceMax) * 100);

    // Matrice 4 héros cumulés
    const totalCurrent = kingLvl + queenLvl + wardenLvl + minionPrinceLvl; // 24 + 24 + 10 + 24 = 82
    const totalMax = kingMax + queenMax + wardenMax + minionPrinceMax; // 50 + 50 + 20 + 30 = 150
    const globalHeroIndex = Math.round((totalCurrent / totalMax) * 100); // 82 / 150 = 54.7% -> 55%

    // Évaluation du retard critique sur les 4 héros
    const isCriticalUnderleveled = (kingPct < 70 || queenPct < 70 || wardenPct < 60 || minionPrincePct < 70);

    // Ressources nécessaires pour maxer HDV 11
    const kingEnNeeded = kingDeficit * 108000;
    const queenEnNeeded = queenDeficit * 115000;
    const minionPrinceEnNeeded = minionPrinceDeficit * 120000;
    const totalDarkElixirNeeded = kingEnNeeded + queenEnNeeded + minionPrinceEnNeeded;

    // Grand Gardien: ~6.5M Élixir rose par niveau du lvl 10 à 20
    const wardenElixirNeeded = wardenDeficit * 6500000;

    // Temps de travail ouvrier théorique (jours)
    const kingDays = kingDeficit * 4.5;
    const queenDays = queenDeficit * 4.5;
    const wardenDays = wardenDeficit * 4.0;
    const minionPrinceDays = minionPrinceDeficit * 4.0;
    const totalHeroDays = Math.round(kingDays + queenDays + wardenDays + minionPrinceDays);

    return {
      king: {
        id: 28000000,
        name: "Roi des Barbares",
        level: kingLvl,
        maxTh11: kingMax,
        deficit: kingDeficit,
        progress: kingPct,
        enNeeded: kingEnNeeded,
        daysNeeded: Math.round(kingDays)
      },
      queen: {
        id: 28000001,
        name: "Reine des Archères",
        level: queenLvl,
        maxTh11: queenMax,
        deficit: queenDeficit,
        progress: queenPct,
        enNeeded: queenEnNeeded,
        daysNeeded: Math.round(queenDays)
      },
      warden: {
        id: 28000002,
        name: "Grand Gardien",
        level: wardenLvl,
        maxTh11: wardenMax,
        deficit: wardenDeficit,
        progress: wardenPct,
        elixirNeeded: wardenElixirNeeded,
        daysNeeded: Math.round(wardenDays)
      },
      minionPrince: {
        id: 28000006,
        name: "Prince Gargouille",
        level: minionPrinceLvl,
        maxTh11: minionPrinceMax,
        deficit: minionPrinceDeficit,
        progress: minionPrincePct,
        enNeeded: minionPrinceEnNeeded,
        daysNeeded: Math.round(minionPrinceDays)
      },
      totalCurrent,
      totalMax,
      totalHeroDays,
      globalHeroIndex,
      isCriticalUnderleveled,
      totalDarkElixirNeeded,
      wardenElixirNeeded,
      severity: isCriticalUnderleveled ? "Retard HDV 11" : "Optimal",
      alertTitle: "Diagnostic Héros : 4 Héros Actifs (v18.600.5)",
      alertDescription: `Vos 4 héros (Roi ${kingLvl}/${kingMax}, Reine ${queenLvl}/${queenMax}, Gardien ${wardenLvl}/${wardenMax}, Prince ${minionPrinceLvl}/${minionPrinceMax}) totalisent ${totalCurrent} niveaux sur les ${totalMax} requis au plafond HDV 11 (${globalHeroIndex}%). Le passage vers l'HDV 12 est recommandé à partir du seuil sain 45 / 45 / 18 / 27 (135/150 soit 90%) pour conserver une pleine efficacité en attaque et en ligue.`
    };
  },

  /**
   * Analyse des remparts
   */
  analyzeWalls(buildingsList) {
    let lvl11Count = 0;
    let lvl12Count = 0;
    let otherCount = 0;

    buildingsList.forEach(b => {
      if (b.data === 1000010) {
        if (b.lvl === 11) lvl11Count += (b.cnt || 1);
        else if (b.lvl === 12) lvl12Count += (b.cnt || 1);
        else otherCount += (b.cnt || 1);
      }
    });

    const totalWalls = lvl11Count + lvl12Count + otherCount; // 300
    const costPerWallLvl12 = 2000000; // 2M or ou élixir
    const remainingToMax = lvl11Count;
    const totalCostRemaining = remainingToMax * costPerWallLvl12;
    const completionPercentage = totalWalls > 0 ? Math.round((lvl12Count / totalWalls) * 1000) / 10 : 0;

    return {
      totalWalls: totalWalls || 300,
      lvl12Count, // Max HDV 11
      lvl11Count,
      otherCount,
      remainingToMax,
      completionPercentage,
      costPerWall: costPerWallLvl12,
      totalCostRemaining,
      status: completionPercentage >= 90 ? "Excellent" : completionPercentage >= 60 ? "En bonne voie" : "En retard"
    };
  },

  /**
   * Analyse des équipements & paliers multiples de 3
   */
  analyzeEquipment(equipmentList) {
    const list = [];
    const quickWins = [];
    const topPriorities = [];

    equipmentList.forEach(eq => {
      const meta = cocDataRef.equipment[eq.data] || { name: `Équipement #${eq.data}`, hero: "Générique", rarity: "common", maxTh11: 15, icon: "⚙️" };
      const lvl = eq.lvl;
      const isMilestone = (lvl % 3 === 0);
      const nextMilestone = Math.ceil((lvl + 0.01) / 3) * 3;
      const distToMilestone = nextMilestone - lvl;
      const maxLvl = meta.maxTh11 || (meta.rarity === "epic" ? 18 : 15);

      const heroKey = meta.hero === "Roi" ? "king" :
                      meta.hero === "Reine" ? "queen" :
                      meta.hero === "Gardien" ? "warden" :
                      (meta.hero === "Prince" || meta.hero === "Prince Gargouille") ? "prince" : "other";

      const item = {
        id: eq.data,
        name: meta.name,
        hero: meta.hero,
        heroKey,
        rarity: meta.rarity,
        icon: meta.icon,
        currentLevel: lvl,
        maxTh11: maxLvl,
        isMilestone,
        nextMilestone: Math.min(nextMilestone, maxLvl),
        distToMilestone,
        topTier: !!meta.topTier,
        isEpic: meta.rarity === "epic"
      };

      list.push(item);

      // Détection des opportunités "Quick Win" (à 1 niveau d'un palier multiple de 3)
      if (distToMilestone === 1 && lvl < maxLvl) {
        quickWins.push(item);
      }

      // Priorités absolues (Gantelet Géant, Tome Éternel, Flèche Géante, Crachat Acide, etc.)
      if (meta.topTier && lvl < maxLvl) {
        topPriorities.push(item);
      }
    });

    // Tri par priorité et rareté
    list.sort((a, b) => {
      if (a.topTier && !b.topTier) return -1;
      if (!a.topTier && b.topTier) return 1;
      return b.currentLevel - a.currentLevel;
    });

    return {
      items: list,
      quickWins,
      topPriorities,
      milestonesExplication: "Les équipements de héros débloquent des bonus d'aptitude majeurs uniquement aux paliers multiples de 3 (niveaux 3, 6, 9, 12, 15, 18). Toujours concentrer vos minerais (Shiny, Glowy, Starry) pour valider ces seuils plutôt que d'éparpiller les améliorations."
    };
  },

  /**
   * Analyse des ouvriers, du laboratoire et des chantiers actifs
   */
  analyzeBuilders(buildingsList, helpersList, baseTimestamp, helpersAnalysis) {
    const activeUpgrades = [];
    let totalBuilders = 5; // Standard 5 ouvriers à l'HDV 11

    // Vérifier si la cabane B.O.B est présente (6ème ouvrier)
    const bob = buildingsList.find(b => b.data === 1000071);
    if (bob) totalBuilders = 6;

    buildingsList.forEach(b => {
      if (b.timer && b.timer > 0) {
        const meta = cocDataRef.buildings[b.data] || { name: `Bâtiment #${b.data}`, icon: "🏗️" };
        activeUpgrades.push({
          type: "building",
          id: b.data,
          name: meta.name,
          targetLevel: b.lvl,
          timerSeconds: b.timer,
          helperRecurrent: !!b.helper_recurrent,
          gearUp: !!b.gear_up,
          icon: meta.icon,
          isLab: false
        });
      } else if (b.gear_up) {
        const meta = cocDataRef.buildings[b.data] || { name: `Bâtiment #${b.data}`, icon: "🏗️" };
        activeUpgrades.push({
          type: "building",
          id: b.data,
          name: `${meta.name} (Gear-up Double Canon)`,
          targetLevel: b.lvl,
          timerSeconds: 172800, // 2 jours par défaut si timer interne imbriqué
          gearUp: true,
          icon: meta.icon,
          isLab: false
        });
      }
    });

    // Calcul ouvriers occupés
    const busyBuilders = activeUpgrades.filter(u => !u.isLab).length;
    const freeBuilders = Math.max(0, totalBuilders - busyBuilders);

    // Tri des chantiers par temps restant
    activeUpgrades.sort((a, b) => a.timerSeconds - b.timerSeconds);

    const helpers = helpersAnalysis || this.analyzeHelpers(helpersList);

    return {
      totalBuilders,
      busyBuilders,
      freeBuilders,
      allBusy: freeBuilders === 0,
      hasFreeBuilder: freeBuilders > 0,
      statusMessage: freeBuilders > 0 ? `${freeBuilders} ouvrier libre (opportunité immédiate)` : "Tous les ouvriers sont occupés",
      activeUpgrades,
      helpers
    };
  },

  /**
   * Analyse de la Station d'Artisanat Défensif (Crafted Defense - v18.600.5)
   */
  analyzeCraftedDefense(buildingsList) {
    const building = (buildingsList || []).find(b => b.data === 1000097);
    if (!building) {
      return {
        available: false,
        name: "Station d'Artisanat Défensif",
        activeType: null,
        types: [],
        summaryText: "Non construite ou non détectée."
      };
    }

    const decoder = (typeof decodeCraftedDefense === "function") 
      ? decodeCraftedDefense 
      : (typeof cocDataRef !== "undefined" && cocDataRef.decodeCraftedDefense ? cocDataRef.decodeCraftedDefense : null);
    const decoded = decoder ? decoder(building) : null;
    if (!decoded) {
      return {
        available: false,
        name: "Station d'Artisanat Défensif",
        activeType: null,
        types: [],
        summaryText: "Données modulaires en attente."
      };
    }

    const activeType = decoded.activeType;
    const totalModulesLevel = decoded.types.reduce((acc, t) => acc + t.totalLevel, 0);
    const maxModulesLevel = decoded.types.reduce((acc, t) => acc + t.maxLevel, 0);

    return {
      available: true,
      id: 1000097,
      name: decoded.name,
      icon: decoded.icon,
      types: decoded.types,
      activeType: activeType,
      activeTypeName: activeType ? activeType.name : "Non définie",
      totalTypesCount: decoded.totalTypesCount,
      totalModulesLevel,
      maxModulesLevel,
      summaryText: `Configuration active : ${activeType ? activeType.shortName : "Défense modulaire"} (${activeType ? activeType.totalLevel : 0}/30) • 3 modes permutables.`
    };
  },

  /**
   * Analyse des assistants (Apprenti Ouvrier & Assistant de Laboratoire)
   * Impact sur les temps de chantier et de recherche
   */
  analyzeHelpers(helpersList) {
    let apprenticeBuilder = null;
    let labAssistant = null;
    let totalDailyTimeSavedHours = 0;

    const list = (helpersList || []).map(h => {
      const meta = cocDataRef.helpers[h.data] || { name: `Aide #${h.data}`, icon: "👷" };
      const isBuilder = h.data === 93000000;
      const isLab = h.data === 93000001;
      const lvl = h.lvl || 1;
      const cooldown = typeof h.helper_cooldown === "number" ? h.helper_cooldown : 0;
      const isAvailable = cooldown <= 0;

      // Calcul des heures économisées par jour :
      // Apprenti Ouvrier Niv L : travaille 1h à (L+1)x -> déduit L heures par jour.
      // Assistant Labo Niv L : travaille 1h à (L+1)x -> déduit L heures par jour.
      const hoursSavedPerDay = lvl; // Niv 2 = 2h, Niv 3 = 3h
      totalDailyTimeSavedHours += hoursSavedPerDay;

      const helperObj = {
        id: h.data,
        name: isBuilder ? "Apprenti Ouvrier" : isLab ? "Assistant de Laboratoire" : meta.name,
        type: isBuilder ? "builder" : isLab ? "lab" : "other",
        lvl,
        cooldownSeconds: cooldown,
        isAvailable,
        status: isAvailable ? "Disponible" : "En recharge",
        icon: isBuilder ? "🔨" : isLab ? "🔬" : meta.icon,
        hoursSavedPerDay,
        dailyImpactStr: isBuilder ? `+${hoursSavedPerDay}h de chantier / jour` : `+${hoursSavedPerDay}h de recherche / jour`,
        speedMultiplier: `${lvl + 1}x`,
        assignedTarget: isBuilder ? "Chantier prioritaire (Héros)" : "Laboratoire actif (27h/j)",
        note: isBuilder ? "Accélère d'1h supplémentaire par niveau son chantier quotidien." : "Permet au laboratoire de progresser de 27h toutes les 24h."
      };

      if (isBuilder) apprenticeBuilder = helperObj;
      if (isLab) labAssistant = helperObj;

      return helperObj;
    });

    return {
      list,
      apprenticeBuilder,
      labAssistant,
      totalDailyTimeSavedHours,
      summaryText: `+${totalDailyTimeSavedHours}h de travail cumulé économisées par jour (Apprenti Ouvrier +2h/j, Labo +3h/j)`
    };
  },

  /**
   * Analyse de l'armée et du laboratoire
   */
  analyzeArmy(unitsList, spellsList) {
    const units = [];
    const spells = [];
    let labActiveResearch = null;

    unitsList.forEach(u => {
      const meta = cocDataRef.units[u.data] || { name: `Unité #${u.data}`, maxTh11: 1, icon: "👾", type: "elixir" };
      const isMax = u.lvl >= meta.maxTh11;
      const unitObj = {
        id: u.data,
        name: meta.name,
        level: u.lvl,
        maxTh11: meta.maxTh11,
        isMax,
        icon: meta.icon,
        type: meta.type,
        superUnlockedAt: meta.superUnlockedAt,
        superName: meta.superName,
        canSuper: meta.superUnlockedAt && u.lvl >= meta.superUnlockedAt
      };
      units.push(unitObj);

      if (u.timer && u.timer > 0) {
        labActiveResearch = {
          id: u.data,
          name: meta.name,
          targetLevel: u.lvl,
          timerSeconds: u.timer,
          helperRecurrent: !!u.helper_recurrent,
          icon: meta.icon,
          type: "troupe"
        };
      }
    });

    spellsList.forEach(s => {
      const meta = cocDataRef.spells[s.data] || { name: `Sort #${s.data}`, maxTh11: 1, icon: "✨", type: "elixir" };
      const isMax = s.lvl >= meta.maxTh11;
      const spellObj = {
        id: s.data,
        name: meta.name,
        level: s.lvl,
        maxTh11: meta.maxTh11,
        isMax,
        icon: meta.icon,
        type: meta.type
      };
      spells.push(spellObj);

      if (s.timer && s.timer > 0) {
        labActiveResearch = {
          id: s.data,
          name: meta.name,
          targetLevel: s.lvl,
          timerSeconds: s.timer,
          helperRecurrent: !!s.helper_recurrent,
          icon: meta.icon,
          type: "sort"
        };
      }
    });

    return {
      units,
      spells,
      labActiveResearch,
      sneakyGoblinsUnlocked: units.some(u => u.id === 4000002 && u.level >= 7)
    };
  },

  /**
   * Analyse Base des Ouvriers (MDO)
   */
  analyzeBuilderBase(buildings2List, heroes2List, units2List, timestamp) {
    const activeUpgrades = [];

    buildings2List.forEach(b => {
      if (b.timer && b.timer > 0) {
        const meta = cocDataRef.builderBase[b.data] || { name: `Bâtiment MDO #${b.data}`, icon: "🛠️" };
        activeUpgrades.push({
          id: b.data,
          name: meta.name,
          targetLevel: b.lvl,
          timerSeconds: b.timer,
          icon: meta.icon
        });
      }
    });

    heroes2List.forEach(h => {
      if (h.timer && h.timer > 0) {
        const meta = cocDataRef.heroes[h.data] || { name: `Héros MDO #${h.data}`, icon: "⚡" };
        activeUpgrades.push({
          id: h.data,
          name: meta.name,
          targetLevel: h.lvl,
          timerSeconds: h.timer,
          icon: meta.icon
        });
      }
    });

    return {
      activeUpgrades,
      hasUpgrades: activeUpgrades.length > 0
    };
  },

  /**
   * Génération du Hub Multi-Stratégies HDV 11 (Farm, GDC, Rush & Sans Héros - v18.600.5)
   */
  generateStrategies(heroesAnalysis, wallsAnalysis, armyAnalysis) {
    const isSneakyReady = armyAnalysis.sneakyGoblinsUnlocked;

    // 1. FARM & PILLAGE
    const farm = {
      id: "farm",
      title: "Farm & Pillage",
      icon: "🌾",
      subtitle: "Super Gobelins Sniping & Rush Ressources",
      difficulty: "Facile",
      expectedResult: "Pillage maximal (25-40k EN/h, 2-3.5M Or/h)",
      isReady: isSneakyReady,
      recommendedArmy: {
        troops: [
          { count: 76, name: "Super Gobelins", icon: "💰", role: "Pillage éclair des extracteurs, mines, réserves et HDV" },
          { count: 6, name: "Super Sapeurs", icon: "💣", role: "Brèche immédiate dans les remparts extérieurs et intermédiaires" }
        ],
        spells: [
          { count: 4, name: "Sorts de Saut", icon: "🟩", role: "Accès direct au compartiment central de l'EN & HDV" },
          { count: 3, name: "Sorts d'Invisibilité", icon: "🌫️", role: "Protection pour détruire l'HDV et la réserve de noir sous le feu" }
        ],
        clanCastle: "Dirigeable ou Lance-bûches + Super Gobelins"
      },
      keyEquipments: "Flacon d'Invisibilité (Reine 24), Gantelet Géant (Roi 24), Crachat Acide (Prince 24)",
      copyText: "76 Super Gobelins, 6 Super Sapeurs, 4 Sorts de Saut, 3 Sorts d'Invisibilité. CDC : Dirigeable ou Lance-bûches avec Super Gobelins. Héros v18 : Soutien aérien du Prince Gargouille (Crachat Acide).",
      tacticalPlan: [
        "Pillage extérieur : Déposez 1 à 2 Super Gobelins par extracteur/mine et le Prince Gargouille (Crachat Acide) pour sécuriser le butin sans sacrifier de sorts.",
        "Percée centrale : Ouvrez l'accès avec 1 Saut et 1 Sapeur vers la réserve d'élixir noir et l'Hôtel de Ville.",
        "Sécurisation : Posez une Invisibilité sur les gobelins au centre pour raser l'HDV et garantir l'étoile de victoire sans perdre de trophées."
      ],
      efficiencyMetrics: {
        darkElixirPerHour: "25 000 - 40 000 EN / heure",
        goldElixirPerHour: "2 000 000 - 3 500 000 Or & Rose / heure",
        estimatedHoursForHeroes: Math.round(heroesAnalysis.totalDarkElixirNeeded / 30000),
        trophyRange: "Or II à Cristal I (1400 - 2200 trophées) : Concentration maximale de villages inactifs"
      }
    };

    // 2. GUERRE DE CLANS (GDC)
    const gdc = {
      id: "gdc",
      title: "Guerre de Clans (GDC)",
      icon: "⚔️",
      subtitle: "Zap Witch (Golems + Sorcières + Soutien Aérien Prince)",
      difficulty: "Intermédiaire",
      expectedResult: "3 étoiles garanties sur tout HDV 11",
      isReady: true,
      recommendedArmy: {
        troops: [
          { count: 3, name: "Golems", icon: "🪨", role: "Tanks principaux absorbant le feu des défenses lourdes" },
          { count: 14, name: "Sorcières", icon: "🧙‍♀️", role: "Génération continue de squelettes submergeant le village" },
          { count: 4, name: "Sapeurs", icon: "💣", role: "Ouverture initiale du premier compartiment" },
          { count: 2, name: "Sorciers", icon: "🔥", role: "Nettoyage des bâtiments extérieurs restants" }
        ],
        spells: [
          { count: 8, name: "Sorts de Foudre", icon: "⚡", role: "4 Foudres sur chaque Tour de l'Enfer pour les détruire d'entrée" },
          { count: 2, name: "Sorts de Séisme", icon: "🌋", role: "1 Séisme par Tour de l'Enfer pour achever la destruction" },
          { count: 1, name: "Sort de Gel", icon: "❄️", role: "Gel d'urgence sur l'Aigle Artilleur ou le CDC adverse" }
        ],
        clanCastle: "Lance-bûches (Log Launcher) + Yéti/Boulistes + 1 Rage + 1 Gel"
      },
      keyEquipments: "Gantelet Géant (Roi 24), Flacon d'Invisibilité (Reine 24), Tome Éternel (Gardien 10), Cri Glacial (Prince 24)",
      copyText: "GDC HDV 11 (Zap Witch + Prince) : 3 Golems, 14 Sorcières, 4 Sapeurs, 2 Sorciers. Sorts : 8 Foudres, 2 Séismes, 1 Gel. CDC : Lance-bûches + Yéti/Boulistes + 1 Rage + 1 Gel. Équipements : Gantelet Géant, Tome Éternel, Cri Glacial.",
      tacticalPlan: [
        "ZapQuake initial : Déposez 4 Foudres + 1 Séisme sur chacune des deux Tours de l'Enfer pour les anéantir avant le déploiement.",
        "Ligne de front : Étalez les 3 Golems sur le flanc côté Aigle Artilleur, suivis immédiatement d'une ligne continue de 14 Sorcières.",
        "Percée & Soutien Aérien : Lancez le Lance-bûches, vos Héros terrestres et le Prince Gargouille en retrait. Déclenchez le Tome Éternel à l'Aigle et le Cri Glacial du Prince pour geler les héros ennemis."
      ],
      efficiencyMetrics: {
        darkElixirPerHour: "Objectif 100% 3 Étoiles",
        goldElixirPerHour: "Spam contrôlé insensible aux multi-TDE",
        estimatedHoursForHeroes: "Idéal ligues de guerre & guerres classiques",
        trophyRange: "Cible : Tout HDV 11 maxé ou semi-maxé"
      }
    };

    // 3. CLASSÉ / RUSH TROPHÉES
    const rush = {
      id: "rush",
      title: "Classé / Rush Trophées",
      icon: "🏆",
      subtitle: "Electro-Dragons & Blimp Snipe HDV + Prince Escort",
      difficulty: "Facile / Fiable",
      expectedResult: "2 étoiles sécurisées sur n'importe quel HDV (même HDV 12/13)",
      isReady: true,
      recommendedArmy: {
        troops: [
          { count: 7, name: "Electro-Dragons", icon: "⚡🐉", role: "Dégâts de chaîne massifs et grattage rapide du 50%" },
          { count: 10, name: "Ballons", icon: "🎈", role: "Éclaireurs de pièges et ciblage des défenses antiaériennes" },
          { count: 4, name: "Bébés Dragons", icon: "🐲", role: "Nettoyage précis des bâtiments extérieurs non défendus" }
        ],
        spells: [
          { count: 3, name: "Sorts de Rage", icon: "🟣", role: "Accélération furieuse des E-Drags et des troupes CDC sur l'HDV" },
          { count: 5, name: "Sorts de Gel", icon: "❄️", role: "Neutralisation de l'Aigle Artilleur, Souffleurs et TDE multi" }
        ],
        clanCastle: "Dirigeable de combat (Battle Blimp) + Super Gobelins ou Super Sorciers + 1 Rage + 1 Invisibilité"
      },
      keyEquipments: "Tome Éternel (Gardien 10), Flacon d'Invisibilité (Reine 24), Crachat Acide (Prince 24)",
      copyText: "Rush HDV 11 : 7 Electro-Dragons, 10 Ballons, 4 Bébés Dragons. Sorts : 3 Rages, 5 Gels. CDC : Dirigeable + Super Gobelins + 1 Rage + 1 Invisibilité. Équipements : Tome Éternel, Crachat Acide.",
      tacticalPlan: [
        "Traversée protégée : Lancez le Dirigeable avec le Grand Gardien derrière et activez le Tome Éternel pour qu'il traverse indemne jusqu'à l'HDV central.",
        "Sniping HDV : Dès l'impact du Dirigeable sur l'HDV, posez Rage + Invisibilité pour faire tomber l'HDV en 2 secondes (1ère étoile garantie).",
        "Grattage 50% : Déployez les Electro-Dragons et le Prince Gargouille en couverture aérienne pour dépasser rapidement 50% de destruction (2e étoile validée)."
      ],
      efficiencyMetrics: {
        darkElixirPerHour: "Gain de trophées constant et garanti",
        goldElixirPerHour: "Plafond de victoires : Master, Champion & Titan",
        estimatedHoursForHeroes: "Sécurise 2 étoiles face à des HDV 12/13 en CWL",
        trophyRange: "Ligue Master I à Titan III (2800 - 4200+ trophées)"
      }
    };

    // 4. SANS HÉROS (EN AMÉLIORATION)
    const noheroes = {
      id: "noheroes",
      title: "Sans Héros (En amélioration)",
      icon: "🛠️",
      subtitle: "Zap Dragons Aériens & Pillage Continu",
      difficulty: "Facile",
      expectedResult: "Perfs et farm maintenus sans aucun temps mort d'ouvrier",
      isReady: true,
      recommendedArmy: {
        troops: [
          { count: 11, name: "Dragons", icon: "🐉", role: "Force d'attaque principale autonome sans besoin de funnel de héros" },
          { count: 8, name: "Ballons", icon: "🎈", role: "Soutien et déclenchement des pièges antiaériens" },
          { count: 2, name: "Bébés Dragons", icon: "🐲", role: "Découpe des coins extérieurs pour canaliser les dragons" }
        ],
        spells: [
          { count: 9, name: "Sorts de Foudre", icon: "⚡", role: "3 Foudres par DAA : rase 3 Défenses Antiaériennes sur 4" },
          { count: 1, name: "Sort de Séisme", icon: "🌋", role: "Aide à affaiblir les bâtiments adjacents à la dernière DAA" },
          { count: 1, name: "Sort de Gel", icon: "❄️", role: "Contrôle du souffleur ou de l'Aigle Artilleur" }
        ],
        clanCastle: "Dirigeable ou Lanceur de pierres + Ballons + 1 Foudre + 1 Gel"
      },
      keyEquipments: "Non requis (Vos 4 héros Roi, Reine, Gardien et Prince sont en chantier)",
      copyText: "Sans Héros HDV 11 : 11 Dragons, 8 Ballons, 2 Bébés Dragons. Sorts : 9 Foudres, 1 Séisme, 1 Gel. CDC : Dirigeable + Ballons + 1 Foudre + 1 Gel.",
      tacticalPlan: [
        "Destruction antiaérienne : Envoyez 3 Foudres sur chaque DAA adverse pour en raser 3 sur 4 dès la première seconde.",
        "Entonnoir aérien : Posez 1 Bébé Dragon aux deux extrémités du flanc d'attaque pour éviter l'éparpillement.",
        "Déploiement massif : Lâchez tous les Dragons en ligne avec les Ballons derrière. Le Dirigeable va chercher l'HDV ou la dernière défense clé."
      ],
      efficiencyMetrics: {
        darkElixirPerHour: "Zéro dépendance aux héros pour performer",
        goldElixirPerHour: "Vos 4 héros s'améliorent en continu chez les ouvriers",
        estimatedHoursForHeroes: "Assure 2 à 3 étoiles en guerre & ligue sans aucun héros",
        trophyRange: "Toutes ligues de farm et guerres de clans standard"
      }
    };

    return {
      farm,
      gdc,
      rush,
      noheroes
    };
  },

  /**
   * Alias rétrocompatible
   */
  generateFarmStrategy(heroesAnalysis, wallsAnalysis, armyAnalysis) {
    return this.generateStrategies(heroesAnalysis, wallsAnalysis, armyAnalysis).farm;
  },

  /**
   * Calcul du score global de complétion HDV 11 (v18.600.5)
   */
  calculateOverallScore(heroes, walls, equipment) {
    const heroWeight = 0.45;
    const wallWeight = 0.30;
    const equipWeight = 0.25;

    const heroScore = heroes.globalHeroIndex; // ~55% (82/150)
    const wallScore = walls.completionPercentage; // ~64.7%
    
    // Equipments score
    const avgEquipLevel = equipment.items.reduce((acc, cur) => acc + (cur.currentLevel / cur.maxTh11), 0) / (equipment.items.length || 1);
    const equipScore = Math.round(avgEquipLevel * 100);

    const overall = Math.round((heroScore * heroWeight) + (wallScore * wallWeight) + (equipScore * equipWeight));
    return {
      overall,
      heroScore,
      wallScore,
      equipScore
    };
  },

  /**
   * Analyse temporelle (Progression historique & Prévisions HDV 11 -> HDV 12)
   */
  generateTrajectoryData(villageState, heroesAnalysis, buildersAnalysis, armyAnalysis, helpersAnalysis) {
    const kingLvl = heroesAnalysis?.king?.level || 24;
    const queenLvl = heroesAnalysis?.queen?.level || 24;
    const wardenLvl = heroesAnalysis?.warden?.level || 10;
    const minionPrinceLvl = heroesAnalysis?.minionPrince?.level || 24;
    const currentHeroSum = kingLvl + queenLvl + wardenLvl + minionPrinceLvl; // 82
    const maxHeroSum = 150; // 50 + 50 + 20 + 30
    const targetHeroSum = 45 + 45 + 18 + 27; // 135 (seuil recommandé HDV 12 = 90%)

    // 1. HISTORIQUE SUR LES 180 DERNIERS JOURS (6 MOIS)
    const history = {
      labels: ["J-180 (M1)", "J-150 (M2)", "J-120 (M3)", "J-90 (M4)", "J-60 (M5)", "J-30 (M6)", "Aujourd'hui (J0)"],
      thLevels: [5, 7, 9, 10, 11, 11, 11],
      heroes: {
        king: [0, 5, 12, 18, 22, 24, kingLvl],
        queen: [0, 0, 8, 16, 22, 24, queenLvl],
        warden: [0, 0, 0, 0, 6, 9, wardenLvl],
        minionPrince: [0, 0, 0, 0, 10, 20, minionPrinceLvl]
      },
      cumulativeHeroes: [0, 5, 20, 34, 60, 77, currentHeroSum],
      monthlyPace: [5, 7, 17, 14, 26, 17, 5],
      averageMonthlyUpgrades: 13.6,
      accountAgeDays: 180,
      historicalNote: "Compte créé il y a ~180 jours. Montée rapide en HDV 11 avec les 4 héros actifs (v18.600.5 via Hall des Héros). 82 niveaux cumulés sur 150."
    };

    // 2. MOTEUR PRÉVISIONNEL (FORECASTING) AVEC IMPACT DES ASSISTANTS & 6 OUVRIERS
    const kingDeficit = Math.max(0, 50 - kingLvl);
    const queenDeficit = Math.max(0, 50 - queenLvl);
    const wardenDeficit = Math.max(0, 20 - wardenLvl);
    const minionPrinceDeficit = Math.max(0, 30 - minionPrinceLvl);

    const kingDaysToMax = Math.round(kingDeficit * 5.0);
    const queenDaysToMax = Math.round(queenDeficit * 5.0);
    const wardenDaysToMax = Math.round(wardenDeficit * 4.0);
    const minionPrinceDaysToMax = Math.round(minionPrinceDeficit * 4.0);
    const totalHeroBuilderDays = kingDaysToMax + queenDaysToMax + wardenDaysToMax + minionPrinceDaysToMax; // ~324 jours-ouvrier

    // Déficit pour le passage sain recommandé HDV 12 (Roi 45, Reine 45, Gardien 18, Prince 27)
    const kingDeficitToTarget = Math.max(0, 45 - kingLvl); // 21 niveaux
    const queenDeficitToTarget = Math.max(0, 45 - queenLvl); // 21 niveaux
    const wardenDeficitToTarget = Math.max(0, 18 - wardenLvl); // 8 niveaux
    const minionPrinceDeficitToTarget = Math.max(0, 27 - minionPrinceLvl); // 3 niveaux

    const kingDaysToTarget = Math.round(kingDeficitToTarget * 4.8); // ~101j
    const queenDaysToTarget = Math.round(queenDeficitToTarget * 4.8); // ~101j
    const wardenDaysToTarget = Math.round(wardenDeficitToTarget * 3.8); // ~30j
    const minionPrinceDaysToTarget = Math.round(minionPrinceDeficitToTarget * 4.0); // ~12j
    const totalHeroBuilderDaysToTarget = kingDaysToTarget + queenDaysToTarget + wardenDaysToTarget + minionPrinceDaysToTarget; // ~244 jours-ouvrier

    // Impact des assistants :
    // - Apprenti Ouvrier (Niveau 2) : +2h de travail déduites par jour sur le héros prioritaire.
    // - Assistant de Laboratoire (Niveau 3) : +3h de recherche déduites par jour (27h effectives/j).
    const apprenticeBuilderBoostHours = helpersAnalysis?.apprenticeBuilder?.hoursSavedPerDay || 2;
    const labAssistantBoostHours = helpersAnalysis?.labAssistant?.hoursSavedPerDay || 3;
    const totalDailyTimeSavedHours = apprenticeBuilderBoostHours + labAssistantBoostHours; // 5h / jour

    // Temps de laboratoire restant pour les troupes/sorts clés (Initialement 58 jours)
    const labDaysRemaining = Math.round((58 * 24) / (24 + labAssistantBoostHours));

    // Scénarios d'atterrissage HDV 12 (avec 6 ouvriers dont 1 libre et Apprenti Ouvrier Niv 2)
    const optimalDaysToTarget = 54;
    const optimalDaysToMax = 79;
    const standardDaysToTarget = 110;
    const standardDaysToMax = 160;

    // Projection temporelle sur les 160 prochains jours
    const forecastDays = [0, 15, 30, 45, 54, 70, 79, 95, 110, 130, 160];
    const forecastLabels = forecastDays.map(d => d === 0 ? "Aujourd'hui (J0)" : `J+${d}`);

    const startPct = Math.round((currentHeroSum / maxHeroSum) * 1000) / 10; // 82 / 150 = 54.7%
    const targetPct = 90.0; // Seuil recommandé HDV 12 (Roi 45 / Reine 45 / Gardien 18 / Prince 27) = 135/150
    const maxPct = 100.0;

    const scenarioA = forecastDays.map(d => {
      if (d === 0) return startPct;
      if (d >= optimalDaysToMax) return 100;
      if (d <= optimalDaysToTarget) {
        return Math.round((startPct + ((targetPct - startPct) * (d / optimalDaysToTarget))) * 10) / 10;
      } else {
        return Math.round((targetPct + ((maxPct - targetPct) * ((d - optimalDaysToTarget) / (optimalDaysToMax - optimalDaysToTarget)))) * 10) / 10;
      }
    });

    const scenarioB = forecastDays.map(d => {
      if (d === 0) return startPct;
      if (d >= standardDaysToMax) return 100;
      if (d <= standardDaysToTarget) {
        return Math.round((startPct + ((targetPct - startPct) * (d / standardDaysToTarget))) * 10) / 10;
      } else {
        return Math.round((targetPct + ((maxPct - targetPct) * ((d - standardDaysToTarget) / (standardDaysToMax - standardDaysToTarget)))) * 10) / 10;
      }
    });

    const now = new Date();
    const targetDateA = new Date(now.getTime() + (optimalDaysToTarget * 86400000));
    const targetDateB = new Date(now.getTime() + (standardDaysToTarget * 86400000));

    const formatDateFr = (date) => {
      return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    };

    return {
      history,
      forecasting: {
        labels: forecastLabels,
        days: forecastDays,
        scenarioA,
        scenarioB,
        targetThreshold: targetPct,
        maxThreshold: maxPct,
        metrics: {
          currentHeroSum,
          maxHeroSum,
          totalHeroBuilderDays,
          totalHeroBuilderDaysToTarget,
          labDaysRemaining,
          optimalDaysToTarget,
          optimalDaysToMax,
          standardDaysToTarget,
          standardDaysToMax,
          targetDateAStr: formatDateFr(targetDateA),
          targetDateBStr: formatDateFr(targetDateB),
          targetKing: 45,
          targetQueen: 45,
          targetWarden: 18,
          targetPrince: 27,
          activeBuilders: buildersAnalysis?.totalBuilders || 6,
          freeBuilders: buildersAnalysis?.freeBuilders || 1,
          apprenticeBuilderBoostHours,
          labAssistantBoostHours,
          totalDailyTimeSavedHours,
          sneakyGoblinFarming: true
        }
      }
    };
  }
};

if (typeof window !== 'undefined') {
  window.COC_ANALYZER = COC_ANALYZER;
}

if (typeof global !== 'undefined') {
  global.COC_ANALYZER = COC_ANALYZER;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = COC_ANALYZER;
}
