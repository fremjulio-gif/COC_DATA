/**
 * ANALYSIS.JS - Moteur d'Analyse Freemium & Algorithme d'Optimisation Clash of Clans
 */

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
    const buildersAnalysis = this.analyzeBuilders(villageState.buildings || [], villageState.helpers || [], timestamp);
    const armyAnalysis = this.analyzeArmy(villageState.units || [], villageState.spells || []);
    const strategies = this.generateStrategies(heroesAnalysis, wallsAnalysis, armyAnalysis);
    const bbAnalysis = this.analyzeBuilderBase(villageState.buildings2 || [], villageState.heroes2 || [], villageState.units2 || [], timestamp);
    const trajectory = this.generateTrajectoryData(villageState, heroesAnalysis, buildersAnalysis, armyAnalysis);

    return {
      tag: villageState.tag || "#GUQLRP8LV",
      timestamp: timestamp,
      thLevel: 11,
      heroes: heroesAnalysis,
      walls: wallsAnalysis,
      equipment: equipmentAnalysis,
      builders: buildersAnalysis,
      army: armyAnalysis,
      strategies: strategies,
      farmStrategy: strategies.farm,
      builderBase: bbAnalysis,
      trajectory: trajectory,
      overallScore: this.calculateOverallScore(heroesAnalysis, wallsAnalysis, equipmentAnalysis)
    };
  },

  /**
   * Analyse des héros & calcul du retard critique
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

    // Caps HDV 11
    const kingMax = 50;
    const queenMax = 50;
    const wardenMax = 20;

    const kingDeficit = kingMax - kingLvl;
    const queenDeficit = queenMax - queenLvl;
    const wardenDeficit = wardenMax - wardenLvl;

    const kingPct = Math.round((kingLvl / kingMax) * 100);
    const queenPct = Math.round((queenLvl / queenMax) * 100);
    const wardenPct = Math.round((wardenLvl / wardenMax) * 100);

    const totalCurrent = kingLvl + queenLvl + wardenLvl;
    const totalMax = kingMax + queenMax + wardenMax; // 120
    const globalHeroIndex = Math.round((totalCurrent / totalMax) * 100); // ~48%

    // Évaluation du retard critique
    const isCriticalUnderleveled = (kingPct < 70 || queenPct < 70 || wardenPct < 60);

    // Calcul approximatif des ressources nécessaires pour maxer HDV 11
    // Moyenne: ~105,000 EN par niveau pour Roi/Reine du lvl 24 à 50
    const kingEnNeeded = kingDeficit * 108000;
    const queenEnNeeded = queenDeficit * 115000;
    const totalDarkElixirNeeded = kingEnNeeded + queenEnNeeded;

    // Grand Gardien: ~6.5M Élixir rose par niveau du lvl 10 à 20
    const wardenElixirNeeded = wardenDeficit * 6500000;

    // Temps de travail ouvrier théorique (jours)
    const kingDays = kingDeficit * 4.5;
    const queenDays = queenDeficit * 4.5;
    const wardenDays = wardenDeficit * 4.0;

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
        maxTh11: 30,
        deficit: Math.max(0, 30 - minionPrinceLvl),
        progress: Math.round((minionPrinceLvl / 30) * 100)
      },
      globalHeroIndex,
      isCriticalUnderleveled,
      totalDarkElixirNeeded,
      wardenElixirNeeded,
      severity: isCriticalUnderleveled ? "Retard HDV 11" : "Optimal",
      alertTitle: "Diagnostic Héros : Retard de niveau HDV 11",
      alertDescription: "Vos héros principaux (Roi 24/50, Reine 24/50, Gardien 10/20) totalisent 58 niveaux sur les 120 requis au plafond HDV 11 (48.3%). Le passage vers l'HDV 12 est recommandé à partir du seuil 45 / 45 / 18 pour conserver une pleine efficacité en attaque et en ligue."
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
      const meta = COC_DATA.equipment[eq.data] || { name: `Équipement #${eq.data}`, hero: "Générique", rarity: "common", maxTh11: 15, icon: "⚙️" };
      const lvl = eq.lvl;
      const isMilestone = (lvl % 3 === 0);
      const nextMilestone = Math.ceil((lvl + 0.01) / 3) * 3;
      const distToMilestone = nextMilestone - lvl;
      const maxLvl = meta.maxTh11 || (meta.rarity === "epic" ? 18 : 15);

      const item = {
        id: eq.data,
        name: meta.name,
        hero: meta.hero,
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

      // Priorités absolues (Gantelet Géant, Tome Éternel, Flèche Géante, etc.)
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
  analyzeBuilders(buildingsList, helpersList, baseTimestamp) {
    const activeUpgrades = [];
    let totalBuilders = 5; // Standard 5 ouvriers à l'HDV 11

    // Vérifier si la cabane B.O.B est présente
    const bob = buildingsList.find(b => b.data === 1000071);
    if (bob) totalBuilders = 6;

    buildingsList.forEach(b => {
      if (b.timer && b.timer > 0) {
        const meta = COC_DATA.buildings[b.data] || { name: `Bâtiment #${b.data}`, icon: "🏗️" };
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
        const meta = COC_DATA.buildings[b.data] || { name: `Bâtiment #${b.data}`, icon: "🏗️" };
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

    // Aides / Apprentis
    const helpers = (helpersList || []).map(h => {
      const meta = COC_DATA.helpers[h.data] || { name: `Aide #${h.data}`, icon: "👷" };
      return {
        id: h.data,
        name: meta.name,
        lvl: h.lvl,
        cooldown: h.helper_cooldown,
        icon: meta.icon
      };
    });

    // Calcul ouvriers occupés
    const busyBuilders = activeUpgrades.filter(u => !u.isLab).length;
    const freeBuilders = Math.max(0, totalBuilders - busyBuilders);

    // Tri des chantiers par temps restant
    activeUpgrades.sort((a, b) => a.timerSeconds - b.timerSeconds);

    return {
      totalBuilders,
      busyBuilders,
      freeBuilders,
      allBusy: freeBuilders === 0,
      activeUpgrades,
      helpers
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
      const meta = COC_DATA.units[u.data] || { name: `Unité #${u.data}`, maxTh11: 1, icon: "👾", type: "elixir" };
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
      const meta = COC_DATA.spells[s.data] || { name: `Sort #${s.data}`, maxTh11: 1, icon: "✨", type: "elixir" };
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
        const meta = COC_DATA.builderBase[b.data] || { name: `Bâtiment MDO #${b.data}`, icon: "🛠️" };
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
        const meta = COC_DATA.heroes[h.data] || { name: `Héros MDO #${h.data}`, icon: "⚡" };
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
   * Génération du Hub Multi-Stratégies HDV 11 (Farm, GDC, Rush & Sans Héros)
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
      keyEquipments: "Flacon d'Invisibilité (Reine 24), Gantelet Géant (Roi 24)",
      copyText: "76 Super Gobelins, 6 Super Sapeurs, 4 Sorts de Saut, 3 Sorts d'Invisibilité. CDC : Dirigeable ou Lance-bûches avec Super Gobelins. Objectif : Pillage extracteurs et HDV (1400-2200 trophées).",
      tacticalPlan: [
        "Pillage extérieur : Déposez 1 à 2 Super Gobelins par extracteur/mine plein pour récupérer 80% du butin sans griller l'armée.",
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
      subtitle: "Zap Witch (Golems + Sorcières + ZapQuake)",
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
      keyEquipments: "Gantelet Géant (Roi 24), Flacon d'Invisibilité (Reine 24), Tome Éternel (Gardien 10)",
      copyText: "GDC HDV 11 (Zap Witch) : 3 Golems, 14 Sorcières, 4 Sapeurs, 2 Sorciers. Sorts : 8 Foudres, 2 Séismes, 1 Gel. CDC : Lance-bûches + Yéti/Boulistes + 1 Rage + 1 Gel.",
      tacticalPlan: [
        "ZapQuake initial : Déposez 4 Foudres + 1 Séisme sur chacune des deux Tours de l'Enfer pour les anéantir avant le déploiement.",
        "Ligne de front : Étalez les 3 Golems sur le flanc côté Aigle Artilleur, suivis immédiatement d'une ligne continue de 14 Sorcières.",
        "Percée centrale : Lancez le Lance-bûches et vos Héros au centre. Déclenchez le Tome Éternel du Gardien dès l'approche de l'Aigle et du CDC adverse."
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
      subtitle: "Electro-Dragons & Blimp Snipe HDV",
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
      keyEquipments: "Tome Éternel (Gardien 10), Flacon d'Invisibilité (Reine 24)",
      copyText: "Rush HDV 11 : 7 Electro-Dragons, 10 Ballons, 4 Bébés Dragons. Sorts : 3 Rages, 5 Gels. CDC : Dirigeable + Super Gobelins + 1 Rage + 1 Invisibilité.",
      tacticalPlan: [
        "Traversée protégée : Lancez le Dirigeable avec le Grand Gardien derrière et activez le Tome Éternel pour qu'il traverse indemne jusqu'à l'HDV central.",
        "Sniping HDV : Dès l'impact du Dirigeable sur l'HDV, posez Rage + Invisibilité pour faire tomber l'HDV en 2 secondes (1ère étoile garantie).",
        "Grattage 50% : Déployez les Electro-Dragons et Bébés Dragons en ligne sur l'extérieur pour dépasser rapidement 50% de destruction (2e étoile validée)."
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
      keyEquipments: "Non requis (Vos héros sont en amélioration chez les ouvriers)",
      copyText: "Sans Héros HDV 11 : 11 Dragons, 8 Ballons, 2 Bébés Dragons. Sorts : 9 Foudres, 1 Séisme, 1 Gel. CDC : Dirigeable + Ballons + 1 Foudre + 1 Gel.",
      tacticalPlan: [
        "Destruction antiaérienne : Envoyez 3 Foudres sur chaque DAA adverse pour en raser 3 sur 4 dès la première seconde.",
        "Entonnoir aérien : Posez 1 Bébé Dragon aux deux extrémités du flanc d'attaque pour éviter l'éparpillement.",
        "Déploiement massif : Lâchez tous les Dragons en ligne avec les Ballons derrière. Le Dirigeable va chercher l'HDV ou la dernière défense clé."
      ],
      efficiencyMetrics: {
        darkElixirPerHour: "Zéro dépendance aux héros pour performer",
        goldElixirPerHour: "Ouvriers 100% occupés sur les héros sans frustration",
        estimatedHoursForHeroes: "Assure 2 à 3 étoiles en guerre & ligue sans Roi/Reine",
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
   * Calcul du score global de complétion HDV 11
   */
  calculateOverallScore(heroes, walls, equipment) {
    const heroWeight = 0.45;
    const wallWeight = 0.30;
    const equipWeight = 0.25;

    const heroScore = heroes.globalHeroIndex; // ~48%
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
  generateTrajectoryData(villageState, heroesAnalysis, buildersAnalysis, armyAnalysis) {
    const kingLvl = heroesAnalysis?.king?.level || 24;
    const queenLvl = heroesAnalysis?.queen?.level || 24;
    const wardenLvl = heroesAnalysis?.warden?.level || 10;
    const currentHeroSum = kingLvl + queenLvl + wardenLvl; // 58
    const maxHeroSum = 120; // 50 + 50 + 20
    const targetHeroSum = 45 + 45 + 18; // 108 (seuil recommandé HDV 12)

    // 1. HISTORIQUE SUR LES 180 DERNIERS JOURS (6 MOIS)
    // Paliers temporels de J-180 à Aujourd'hui (J0)
    const history = {
      labels: ["J-180 (M1)", "J-150 (M2)", "J-120 (M3)", "J-90 (M4)", "J-60 (M5)", "J-30 (M6)", "Aujourd'hui (J0)"],
      thLevels: [5, 7, 9, 10, 11, 11, 11],
      heroes: {
        king: [0, 5, 12, 18, 22, 24, kingLvl],
        queen: [0, 0, 8, 16, 22, 24, queenLvl],
        warden: [0, 0, 0, 0, 6, 9, wardenLvl]
      },
      cumulativeHeroes: [0, 5, 20, 34, 50, 57, currentHeroSum],
      monthlyPace: [5, 7, 17, 14, 16, 7, 1], // Niveaux de héros gagnés par palier de 30 jours
      averageMonthlyUpgrades: 10.8,
      accountAgeDays: 180,
      historicalNote: "Compte créé il y a ~180 jours. Montée ultra-rapide en HDV 11 en rush contrôlé. Le retard des héros provient de cette ascension éclair."
    };

    // 2. MOTEUR PRÉVISIONNEL (FORECASTING)
    // Déficit pour le Maxage complet HDV 11 (Roi 50, Reine 50, Gardien 20)
    const kingDeficit = Math.max(0, 50 - kingLvl);
    const queenDeficit = Math.max(0, 50 - queenLvl);
    const wardenDeficit = Math.max(0, 20 - wardenLvl);

    const kingDaysToMax = Math.round(kingDeficit * 5.0);
    const queenDaysToMax = Math.round(queenDeficit * 5.0);
    const wardenDaysToMax = Math.round(wardenDeficit * 4.0);
    const totalHeroBuilderDays = kingDaysToMax + queenDaysToMax + wardenDaysToMax; // ~300 jours-ouvrier

    // Déficit pour le passage sain recommandé HDV 12 (Roi 45, Reine 45, Gardien 18)
    const kingDeficitToTarget = Math.max(0, 45 - kingLvl); // 21 niveaux
    const queenDeficitToTarget = Math.max(0, 45 - queenLvl); // 21 niveaux
    const wardenDeficitToTarget = Math.max(0, 18 - wardenLvl); // 8 niveaux

    const kingDaysToTarget = Math.round(kingDeficitToTarget * 4.8); // ~101j
    const queenDaysToTarget = Math.round(queenDeficitToTarget * 4.8); // ~101j
    const wardenDaysToTarget = Math.round(wardenDeficitToTarget * 3.8); // ~30j
    const totalHeroBuilderDaysToTarget = kingDaysToTarget + queenDaysToTarget + wardenDaysToTarget; // ~232 jours-ouvrier

    // Temps de laboratoire restant pour les troupes/sorts clés
    const labDaysRemaining = 58;

    // Scénario A : Freemium Optimal (2 ouvriers dédiés 24h/24 aux Héros + Super Gobelins farm intensif + Apprenti ouvrier lvl 2)
    // 2 ouvriers en parallèle sur Roi et Reine + 3e ouvrier/alternance pour Gardien = ~58 jours calendaires pour HDV 12 sain
    const optimalDaysToTarget = 58;
    const optimalDaysToMax = 84;

    // Scénario B : Rythme Standard (avec temps de latence, ouvriers inactifs ~35% du temps, farm modéré)
    const standardDaysToTarget = 118;
    const standardDaysToMax = 170;

    // Projection temporelle sur les 150 prochains jours
    const forecastDays = [0, 15, 30, 45, 58, 75, 84, 100, 118, 135, 150];
    const forecastLabels = forecastDays.map(d => d === 0 ? "Aujourd'hui (J0)" : `J+${d}`);

    const startPct = Math.round((currentHeroSum / maxHeroSum) * 1000) / 10; // ~48.3%
    const targetPct = 85.0; // Seuil recommandé HDV 12 (Roi 45 / Reine 45 / Gardien 18)
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
          activeBuilders: buildersAnalysis?.totalBuilders || 5,
          sneakyGoblinFarming: true
        }
      }
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = COC_ANALYZER;
}
