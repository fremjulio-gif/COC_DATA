import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeVillage } from '../public/js/analysis.js';

const capsPath = path.resolve('public/data/townhall_caps.json');
const costsPath = path.resolve('public/data/upgrade_costs.json');
const capsData = JSON.parse(fs.readFileSync(capsPath, 'utf8'));
const costsData = JSON.parse(fs.readFileSync(costsPath, 'utf8'));

const th11Village = JSON.parse(fs.readFileSync('tests/fixtures/village_th11.json', 'utf8'));
const th7Village = JSON.parse(fs.readFileSync('tests/fixtures/village_th7.json', 'utf8'));
const th17Village = JSON.parse(fs.readFileSync('tests/fixtures/village_th17_max.json', 'utf8'));
const corruptVillage = JSON.parse(fs.readFileSync('tests/fixtures/village_corrupt.json', 'utf8'));

describe('Moteur d\'Analyse Mathématique (analysis.js)', () => {
  it('détecte dynamiquement l\'HDV 11 et calcule la matrice des 4 héros (v18.600.5)', () => {
    const report = analyzeVillage(th11Village, capsData, costsData);

    assert.equal(report.success, true);
    assert.equal(report.thLevel, 11);

    // 4 Héros : Roi 24/50, Reine 24/50, Gardien 10/20, Prince 24/30 = 82/150 (55%)
    assert.equal(report.heroes.totalCurrent, 82);
    assert.equal(report.heroes.totalMax, 150);
    assert.equal(report.heroes.globalHeroIndex, 55);
    assert.equal(report.heroes.isHealthyForNextTh, false); // seuil sain 135
  });

  it('détecte exactement les 6 ouvriers, les chantiers et la recherche labo', () => {
    const report = analyzeVillage(th11Village, capsData, costsData);

    assert.equal(report.builders.totalBuilders, 6);
    assert.equal(report.builders.hasBob, true);
    assert.equal(report.builders.busyBuilders, 4);
    assert.equal(report.builders.freeBuilders, 2);
    assert.equal(report.builders.labUpgrades.length, 1);
    assert.equal(report.builders.totalOngoingTasks, 5); // 4 ouvriers + 1 labo
    assert.equal(report.builders.hasFreeBuilder, true);
  });

  it('calcule fidèlement les remparts de l\'HDV 11', () => {
    const report = analyzeVillage(th11Village, capsData, costsData);

    assert.equal(report.walls.totalWalls, 300);
    assert.equal(report.walls.maxedWallsCount, 194);
    assert.equal(report.walls.remainingToMax, 106);
    assert.equal(report.walls.completionPct, 64.7);
    assert.equal(report.walls.verified, true);
  });

  it('analyse dynamiquement un village HDV 7 sans héros secondaires', () => {
    const report = analyzeVillage(th7Village, capsData, costsData);

    assert.equal(report.thLevel, 7);
    assert.equal(report.heroes.totalMax, 10);
    assert.equal(report.heroes.totalCurrent, 5);
    assert.equal(report.heroes.globalHeroIndex, 50);
    assert.equal(report.heroes.items.queen, undefined);
    assert.equal(report.heroes.items.minion_prince, undefined);
  });

  it('analyse un village maxé HDV 17 avec les 5 héros', () => {
    const report = analyzeVillage(th17Village, capsData, costsData);

    assert.equal(report.thLevel, 17);
    assert.equal(report.isMaxTownhall, true);
    assert.equal(report.heroes.globalHeroIndex, 100);
    assert.equal(report.walls.completionPct, 100);
  });

  it('ne plante jamais sur un fichier JSON corrompu ou incomplet', () => {
    const report = analyzeVillage(corruptVillage, capsData, costsData);

    assert.equal(report.success, true);
    assert.equal(report.thLevel, 1);
    assert.ok(report.warnings.length > 0);
  });
});
