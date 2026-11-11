/**
 * CoC Freemium Optimizer — Moteur Mathématique d'Analyse (Fonctions Pures)
 * Support dynamique HDV 1 à 18+ via townhall_caps.json et upgrade_costs.json
 * Aucune valeur de jeu codée en dur dans la logique.
 */

import { decodeCraftedDefense } from './coc_data.js';

/**
 * Point d'entrée principal de l'analyse
 * @param {Object} villageState Données brutes du JSON de village
 * @param {Object} capsData Dictionnaire des plafonds (issu de townhall_caps.json)
 * @param {Object} costsData Dictionnaire des coûts (issu de upgrade_costs.json)
 * @returns {Object} Rapport complet d'analyse
 */
export function analyzeVillage(villageState, capsData = null, costsData = null) {
  const warnings = [];
  const errors = [];

  if (!villageState || typeof villageState !== 'object') {
    return {
      success: false,
      error: "Données de village absentes ou non valides.",
      timestamp: Math.floor(Date.now() / 1000)
    };
  }

  const timestamp = Number(villageState.timestamp) || Math.floor(Date.now() / 1000);
  const tag = typeof villageState.tag === 'string' ? villageState.tag : '#VILLAGE_INCONNU';

  // 1. Détection dynamique du niveau d'Hôtel de Ville (HDV)
  const buildingsList = Array.isArray(villageState.buildings) ? villageState.buildings : [];
  if (!Array.isArray(villageState.buildings)) {
    warnings.push("Le champ 'buildings' est absent ou n'est pas un tableau.");
  }

  const thBuilding = buildingsList.find(b => b && b.data === 1000001);
  const thLevel = thBuilding ? (Number(thBuilding.lvl) || 1) : 1;

  // Récupération des plafonds pour l'HDV détecté
  const thCaps = (capsData && capsData.townhalls && capsData.townhalls[String(thLevel)]) 
    ? capsData.townhalls[String(thLevel)]
    : null;

  if (!thCaps && capsData) {
    warnings.push(`Plafonds non documentés pour l'HDV ${thLevel}. Utilisation des plafonds de repli.`);
  }

  // 2. Analyse des Héros & Équipements
  const heroesList = Array.isArray(villageState.heroes) ? villageState.heroes : [];
  const heroesAnalysis = analyzeHeroes(heroesList, thLevel, thCaps, costsData);

  // 3. Analyse des Remparts
  const wallsAnalysis = analyzeWalls(buildingsList, thLevel, thCaps, costsData);

  // 4. Analyse des Ouvriers & Chantiers
  const helpersList = Array.isArray(villageState.helpers) ? villageState.helpers : [];
  const helpersAnalysis = analyzeHelpers(helpersList, costsData);
  const unitsList = Array.isArray(villageState.units) ? villageState.units : [];
  const spellsList = Array.isArray(villageState.spells) ? villageState.spells : [];

  const buildersAnalysis = analyzeBuilders(buildingsList, heroesList, unitsList, spellsList, helpersAnalysis, timestamp);

  // 5. Analyse de la Station d'Artisanat Défensif (v18.600.5)
  const craftedBuilding = buildingsList.find(b => b && b.data === 1000097);
  const craftedDefenseAnalysis = craftedBuilding ? decodeCraftedDefense(craftedBuilding) : null;

  // 6. Analyse des Équipements
  const equipmentList = Array.isArray(villageState.equipment) ? villageState.equipment : [];
  const equipmentAnalysis = analyzeEquipment(equipmentList, thLevel, thCaps);

  // 7. Analyse de l'Armée & Laboratoire
  const armyAnalysis = analyzeArmy(unitsList, spellsList, thLevel, thCaps);

  // 8. Calcul du score global
  const overallScore = calculateOverallScore(heroesAnalysis, wallsAnalysis, equipmentAnalysis);

  return {
    success: true,
    tag,
    timestamp,
    thLevel,
    isMaxTownhall: thLevel >= 17,
    heroes: heroesAnalysis,
    walls: wallsAnalysis,
    builders: buildersAnalysis,
    helpers: helpersAnalysis,
    craftedDefense: craftedDefenseAnalysis,
    equipment: equipmentAnalysis,
    army: armyAnalysis,
    overallScore,
    warnings,
    errors
  };
}

/**
 * Analyse des héros et calcul de l'index de force (Hero Power Index)
 */
export function analyzeHeroes(heroesList, thLevel, thCaps, costsData) {
  const heroMap = {};
  heroesList.forEach(h => {
    if (h && typeof h.data === 'number') {
      heroMap[h.data] = Number(h.lvl) || 0;
    }
  });

  const capsHeroes = (thCaps && thCaps.heroes) ? thCaps.heroes : {};

  // Définition des héros applicables selon le dictionnaire de caps
  const heroesMeta = [
    { id: 28000000, key: 'king', name: 'Roi des Barbares', resource: 'dark_elixir' },
    { id: 28000001, key: 'queen', name: 'Reine des Archères', resource: 'dark_elixir' },
    { id: 28000002, key: 'warden', name: 'Grand Gardien', resource: 'elixir' },
    { id: 28000006, key: 'minion_prince', name: 'Prince Gargouille', resource: 'dark_elixir' },
    { id: 28000004, key: 'champion', name: 'Championne Royale', resource: 'dark_elixir' }
  ];

  let totalCurrent = 0;
  let totalMax = 0;
  const detailedHeroes = {};

  heroesMeta.forEach(meta => {
    const maxForTh = capsHeroes[meta.id] || 0;
    if (maxForTh > 0) {
      const currentLevel = heroMap[meta.id] || 0;
      const deficit = Math.max(0, maxForTh - currentLevel);
      const progressPct = maxForTh > 0 ? Math.round((currentLevel / maxForTh) * 100) : 0;

      totalCurrent += currentLevel;
      totalMax += maxForTh;

      // Calcul des coûts et durées depuis upgrade_costs.json
      const costMeta = (costsData && costsData.heroes && costsData.heroes[meta.id]) || null;
      const avgCost = costMeta ? costMeta.avgCostPerLevel : 100000;
      const avgDays = costMeta ? costMeta.avgDaysPerLevel : 4.0;
      const isVerified = costMeta ? costMeta.verified : false;

      detailedHeroes[meta.key] = {
        id: meta.id,
        name: meta.name,
        level: currentLevel,
        maxLevel: maxForTh,
        deficit,
        progressPct,
        resourceNeeded: deficit * avgCost,
        resourceType: meta.resource,
        daysNeeded: Math.round(deficit * avgDays),
        verified: isVerified,
        status: deficit === 0 ? 'maxed' : (progressPct >= 85 ? 'ontrack' : 'delayed')
      };
    }
  });

  const globalHeroIndex = totalMax > 0 ? Math.round((totalCurrent / totalMax) * 100) : 100;
  const healthyThreshold = (thCaps && thCaps.healthyThreshold && thCaps.healthyThreshold.total)
    ? thCaps.healthyThreshold.total
    : Math.round(totalMax * 0.9);

  return {
    items: detailedHeroes,
    totalCurrent,
    totalMax,
    globalHeroIndex,
    isHealthyForNextTh: totalCurrent >= healthyThreshold,
    healthyThreshold,
    isCriticalLag: globalHeroIndex < 65
  };
}

/**
 * Analyse des remparts
 */
export function analyzeWalls(buildingsList, thLevel, thCaps, costsData) {
  let wallCountsByLevel = {};
  let totalWallsCount = 0;

  buildingsList.forEach(b => {
    if (b && b.data === 1000010) {
      const lvl = Number(b.lvl) || 1;
      const count = Number(b.cnt) || 1;
      wallCountsByLevel[lvl] = (wallCountsByLevel[lvl] || 0) + count;
      totalWallsCount += count;
    }
  });

  const maxWallLevel = thCaps ? (thCaps.maxWallLevel || thLevel + 1) : (thLevel + 1);
  const maxWallsCount = thCaps ? (thCaps.maxWalls || 300) : 300;

  const maxedWallsCount = wallCountsByLevel[maxWallLevel] || 0;
  const completionPct = totalWallsCount > 0 
    ? Math.round((maxedWallsCount / totalWallsCount) * 1000) / 10 
    : 0;

  const remainingToMax = Math.max(0, totalWallsCount - maxedWallsCount);

  const wallCostMeta = (costsData && costsData.walls && costsData.walls[String(maxWallLevel)]) || null;
  const costPerWall = wallCostMeta ? wallCostMeta.cost : 2000000;
  const totalCostRemaining = remainingToMax * costPerWall;
  const isVerified = wallCostMeta ? wallCostMeta.verified : false;

  return {
    totalWalls: totalWallsCount || maxWallsCount,
    maxWallLevel,
    countsByLevel: wallCountsByLevel,
    maxedWallsCount,
    remainingToMax,
    completionPct,
    costPerWall,
    totalCostRemaining,
    verified: isVerified,
    status: completionPct >= 90 ? 'maxed' : (completionPct >= 60 ? 'ontrack' : 'delayed')
  };
}

/**
 * Analyse des ouvriers et de leurs chantiers actifs
 */
export function analyzeBuilders(buildingsList, heroesList = [], unitsList = [], spellsList = [], helpersAnalysis = null, currentTimestamp = Math.floor(Date.now() / 1000)) {
  let regularHuts = 0;
  let hasBob = false;
  const activeUpgrades = [];
  const labUpgrades = [];

  // 1. Chantiers sur les bâtiments
  buildingsList.forEach(b => {
    if (!b) return;

    if (b.data === 1000014 || b.data === 1000015) {
      regularHuts += (b.cnt || 1);
    } else if (b.data === 1000071 || b.data === 1000078) {
      hasBob = true;
    }

    if (b.timer && typeof b.timer === 'number' && b.timer > 0) {
      activeUpgrades.push({
        id: b.data,
        type: 'building',
        targetLevel: b.lvl,
        remainingSeconds: b.timer,
        finishTimestamp: currentTimestamp + b.timer,
        hasHelper: Boolean(b.helper_recurrent)
      });
    }
  });

  // 2. Chantiers sur les héros (occupent également un ouvrier)
  heroesList.forEach(h => {
    if (h && h.timer && typeof h.timer === 'number' && h.timer > 0) {
      activeUpgrades.push({
        id: h.data,
        type: 'hero',
        targetLevel: h.lvl,
        remainingSeconds: h.timer,
        finishTimestamp: currentTimestamp + h.timer,
        hasHelper: Boolean(h.helper_recurrent)
      });
    }
  });

  // 3. Recherches actives au laboratoire (n'occupent PAS d'ouvrier)
  [...unitsList, ...spellsList].forEach(item => {
    if (item && item.timer && typeof item.timer === 'number' && item.timer > 0) {
      labUpgrades.push({
        id: item.data,
        type: 'lab',
        targetLevel: item.lvl,
        remainingSeconds: item.timer,
        finishTimestamp: currentTimestamp + item.timer,
        hasHelper: Boolean(item.helper_recurrent)
      });
    }
  });

  const totalBuilders = Math.min(6, (regularHuts || 5) + (hasBob ? 1 : 0));
  const busyBuilders = activeUpgrades.length;
  const freeBuilders = Math.max(0, totalBuilders - busyBuilders);

  return {
    totalBuilders,
    regularHuts,
    hasBob,
    busyBuilders,
    freeBuilders,
    hasFreeBuilder: freeBuilders > 0,
    activeUpgrades,
    labUpgrades,
    totalOngoingTasks: activeUpgrades.length + labUpgrades.length
  };
}

/**
 * Analyse des assistants quotidiens (Apprenti Ouvrier, Assistant Labo)
 */
export function analyzeHelpers(helpersList, costsData) {
  let builderHelperHours = 0;
  let labHelperHours = 0;
  const helpersDetail = [];

  helpersList.forEach(h => {
    if (!h) return;
    const lvl = Number(h.lvl) || 0;
    if (h.data === 93000000) {
      builderHelperHours = lvl;
      helpersDetail.push({ id: h.data, name: 'Apprenti Ouvrier', level: lvl, dailyHoursSaved: lvl, cooldown: h.helper_cooldown });
    } else if (h.data === 93000001) {
      labHelperHours = lvl;
      helpersDetail.push({ id: h.data, name: 'Assistant Labo', level: lvl, dailyHoursSaved: lvl, cooldown: h.helper_cooldown });
    }
  });

  return {
    items: helpersDetail,
    totalDailyHoursSaved: builderHelperHours + labHelperHours,
    builderHelperHours,
    labHelperHours
  };
}

/**
 * Analyse des équipements et détection des paliers multiples de 3
 */
export function analyzeEquipment(equipmentList, thLevel, thCaps) {
  const items = [];
  let quickWinsCount = 0;

  equipmentList.forEach(eq => {
    if (!eq) return;
    const currentLvl = Number(eq.lvl) || 1;
    const remainder = currentLvl % 3;
    const isQuickWin = (remainder === 2);
    const nextKeyLevel = currentLvl + (remainder === 0 ? 3 : (3 - remainder));

    if (isQuickWin) quickWinsCount++;

    items.push({
      id: eq.data,
      level: currentLvl,
      isQuickWin,
      nextKeyLevel,
      isKeyLevel: remainder === 0
    });
  });

  return {
    items,
    quickWinsCount
  };
}

/**
 * Analyse des unités et sorts du laboratoire
 */
export function analyzeArmy(unitsList, spellsList, thLevel, thCaps) {
  let totalUnits = 0;
  let maxedUnits = 0;

  const capsUnits = (thCaps && thCaps.units) ? thCaps.units : {};
  const capsSpells = (thCaps && thCaps.spells) ? thCaps.spells : {};

  unitsList.forEach(u => {
    if (!u) return;
    totalUnits++;
    const cap = capsUnits[u.data] || 0;
    if (cap > 0 && (u.lvl || 0) >= cap) maxedUnits++;
  });

  spellsList.forEach(s => {
    if (!s) return;
    totalUnits++;
    const cap = capsSpells[s.data] || 0;
    if (cap > 0 && (s.lvl || 0) >= cap) maxedUnits++;
  });

  const completionPct = totalUnits > 0 ? Math.round((maxedUnits / totalUnits) * 100) : 0;

  return {
    totalEntities: totalUnits,
    maxedEntities: maxedUnits,
    completionPct
  };
}

/**
 * Score global pondéré du village
 */
export function calculateOverallScore(heroes, walls, equipment) {
  const heroesScore = heroes ? heroes.globalHeroIndex : 50;
  const wallsScore = walls ? walls.completionPct : 50;

  const score = Math.round((heroesScore * 0.5) + (wallsScore * 0.3) + 20);
  return Math.min(100, Math.max(0, score));
}
