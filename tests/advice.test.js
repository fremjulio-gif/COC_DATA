import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateAdvice, evaluateCondition } from '../public/js/advice.js';
import { analyzeVillage } from '../public/js/analysis.js';

const rulesPath = path.resolve('public/data/advice_rules.json');
const capsPath = path.resolve('public/data/townhall_caps.json');
const costsPath = path.resolve('public/data/upgrade_costs.json');

const rulesData = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
const capsData = JSON.parse(fs.readFileSync(capsPath, 'utf8'));
const costsData = JSON.parse(fs.readFileSync(costsPath, 'utf8'));

const th11Village = JSON.parse(fs.readFileSync('tests/fixtures/village_th11.json', 'utf8'));

describe('Moteur Déclaratif de Conseils (advice.js)', () => {
  it('génère les alertes critiques pour les ouvriers libres et le retard de héros', () => {
    const analysis = analyzeVillage(th11Village, capsData, costsData);
    const adviceList = evaluateAdvice(analysis, rulesData, {});

    assert.ok(adviceList.length > 0);

    const builderAlert = adviceList.find(a => a.id === 'rule_free_builder_alert');
    assert.ok(builderAlert, 'L\'alerte d\'ouvrier libre doit être générée');
    assert.equal(builderAlert.urgence, 'critique');

    const heroesAlert = adviceList.find(a => a.id === 'rule_heroes_lag_critical');
    assert.ok(heroesAlert, 'L\'alerte de retard héros doit être générée car Hero Index 55% < 65%');
    assert.equal(heroesAlert.urgence, 'critique');
  });

  it('détecte les quick wins sur les équipements', () => {
    const analysis = analyzeVillage(th11Village, capsData, costsData);
    const adviceList = evaluateAdvice(analysis, rulesData, {});

    const quickWinAdvice = adviceList.find(a => a.id === 'rule_equip_quick_wins');
    assert.ok(quickWinAdvice, 'Les quick wins d\'équipements doivent être signalés');
  });

  it('exclut les conseils masqués et place les conseils complétés en fin de liste', () => {
    const analysis = analyzeVillage(th11Village, capsData, costsData);
    
    // Test masquage
    const adviceWithHidden = evaluateAdvice(analysis, rulesData, {
      hiddenAdviceIds: ['rule_free_builder_alert']
    });
    assert.ok(adviceWithHidden.every(a => a.id !== 'rule_free_builder_alert'));

    // Test complétion
    const adviceWithCompleted = evaluateAdvice(analysis, rulesData, {
      completedAdviceIds: ['rule_free_builder_alert']
    });
    const completedItem = adviceWithCompleted.find(a => a.id === 'rule_free_builder_alert');
    assert.ok(completedItem.isCompleted);
    // Doit être en fin de liste
    assert.equal(adviceWithCompleted[adviceWithCompleted.length - 1].id, 'rule_free_builder_alert');
  });

  it('évalue correctement les prédicats de condition sans eval()', () => {
    const mockAnalysis = {
      thLevel: 11,
      builders: { freeBuilders: 2 },
      heroes: { globalHeroIndex: 50, isHealthyForNextTh: false },
      equipment: { quickWinsCount: 3 },
      walls: { remainingToMax: 100 },
      craftedDefense: { activeType: { totalLevel: 6 } }
    };

    assert.equal(evaluateCondition('free_builders > 0', mockAnalysis), true);
    assert.equal(evaluateCondition('hero_index < 65', mockAnalysis), true);
    assert.equal(evaluateCondition('quick_wins_count > 0', mockAnalysis), true);
    assert.equal(evaluateCondition('th_level === 11', mockAnalysis), true);
    assert.equal(evaluateCondition('walls_remaining > 50', mockAnalysis), true);
    assert.equal(evaluateCondition('crafted_defense_available && crafted_level < 15', mockAnalysis), true);
  });
});
