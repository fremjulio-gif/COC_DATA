/**
 * CoC Freemium Optimizer — Moteur Déclaratif de Conseils
 * Évalue les règles de advice_rules.json en fonction du rapport d'analyse
 * Zéro conseil écrit en dur dans le code.
 */

export const URGENCY_WEIGHTS = {
  critique: 100,
  important: 50,
  utile: 20,
  optionnel: 5
};

/**
 * Génère la liste des conseils personnalisés triés par urgence et score
 * @param {Object} analysis Rapport d'analyse produit par analysis.js
 * @param {Object} rulesData Contenu de advice_rules.json
 * @param {Object} storeState État actuel du store (hiddenAdviceIds, completedAdviceIds, beginnerMode)
 * @returns {Array} Liste des conseils évalués et triés
 */
export function evaluateAdvice(analysis, rulesData, storeState = {}) {
  if (!analysis || !rulesData || !Array.isArray(rulesData.rules)) {
    return [];
  }

  const thLevel = analysis.thLevel || 1;
  const hiddenIds = new Set(storeState.hiddenAdviceIds || []);
  const completedIds = new Set(storeState.completedAdviceIds || []);

  const results = [];

  for (const rule of rulesData.rules) {
    // 1. Filtrage par niveau d'Hôtel de Ville
    if (Array.isArray(rule.thLevels) && !rule.thLevels.includes(thLevel)) {
      continue;
    }

    // 2. Exclusion des conseils masqués par l'utilisateur
    if (hiddenIds.has(rule.id)) {
      continue;
    }

    // 3. Évaluation de la condition déclarative
    const isApplicable = evaluateCondition(rule.condition, analysis);
    if (!isApplicable) {
      continue;
    }

    const urgencyWeight = URGENCY_WEIGHTS[rule.urgence] || 10;
    const priority = Number(rule.priorite) || 1;
    const score = priority * urgencyWeight;

    const isCompleted = completedIds.has(rule.id);

    results.push({
      ...rule,
      score,
      isHidden: false,
      isCompleted
    });
  }

  // Tri par : non-complétés d'abord, puis score décroissant
  results.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    return b.score - a.score;
  });

  return results;
}

/**
 * Évalue une condition déclarative de manière sécurisée (sans eval)
 */
export function evaluateCondition(conditionStr, analysis) {
  if (!conditionStr || conditionStr === 'true') return true;

  const freeBuilders = analysis.builders?.freeBuilders || 0;
  const heroIndex = analysis.heroes?.globalHeroIndex ?? 100;
  const heroHealthy = Boolean(analysis.heroes?.isHealthyForNextTh);
  const quickWinsCount = analysis.equipment?.quickWinsCount || 0;
  const thLevel = analysis.thLevel || 1;
  const wallsRemaining = analysis.walls?.remainingToMax || 0;
  const craftedAvailable = Boolean(analysis.craftedDefense);
  const craftedLevel = analysis.craftedDefense?.activeType?.totalLevel || 0;

  switch (conditionStr.trim()) {
    case 'free_builders > 0':
      return freeBuilders > 0;
    case 'hero_index < 65':
      return heroIndex < 65;
    case 'hero_healthy === false':
      return heroHealthy === false;
    case 'quick_wins_count > 0':
      return quickWinsCount > 0;
    case 'th_level === 11':
      return thLevel === 11;
    case 'th_level >= 11':
      return thLevel >= 11;
    case 'walls_remaining > 50':
      return wallsRemaining > 50;
    case 'crafted_defense_available && crafted_level < 15':
      return craftedAvailable && craftedLevel < 15;
    default:
      return false;
  }
}
