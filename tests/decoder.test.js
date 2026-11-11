import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  COC_DATA, 
  decodeEntity, 
  decodeHero, 
  decodeCraftedDefense 
} from '../public/js/coc_data.js';

describe('Décodeur Universel COC_DATA (v18.600.5)', () => {
  it('identifie les 4 héros principaux dont le Prince Gargouille', () => {
    const king = decodeHero(28000000);
    assert.equal(king.name, 'Roi des Barbares');

    const queen = decodeHero(28000001);
    assert.equal(queen.name, 'Reine des Archères');

    const warden = decodeHero(28000002);
    assert.equal(warden.name, 'Grand Gardien');

    const prince = decodeHero(28000006);
    assert.equal(prince.name, 'Prince Gargouille');
    assert.equal(prince.heroKey, 'minion_prince');
  });

  it('décode les équipements du Prince Gargouille', () => {
    const acidSpit = decodeEntity(90000043);
    assert.equal(acidSpit.name, 'Crachat Acide');
    assert.equal(acidSpit.hero, 'Prince');
    assert.equal(acidSpit.topTier, true);

    const darkSwarm = decodeEntity(90000048);
    assert.equal(darkSwarm.name, 'Essaim Obscur');
    assert.equal(darkSwarm.hero, 'Prince');
  });

  it('gère les identifiants inconnus sans lever d\'exception', () => {
    const unknown = decodeEntity(99999999);
    assert.ok(unknown.unknown);
    assert.equal(unknown.category, 'unknown');
    assert.equal(unknown.id, 99999999);
  });

  it('décode fidèlement la Station d\'Artisanat Défensif et ses 9 modules', () => {
    const rawCrafted = {
      data: 1000097,
      types: [
        {
          data: 103000011,
          modules: [
            { data: 102000033, lvl: 3 },
            { data: 102000034, lvl: 2 },
            { data: 102000035, lvl: 1 }
          ]
        }
      ]
    };

    const decoded = decodeCraftedDefense(rawCrafted);
    assert.ok(decoded);
    assert.equal(decoded.id, 1000097);
    assert.equal(decoded.types.length, 1);
    assert.equal(decoded.types[0].totalLevel, 6); // 3 + 2 + 1
    assert.equal(decoded.types[0].completionPct, 20); // 6 / 30 = 20%
  });
});
