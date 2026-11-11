import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  crc32, 
  compressVillageToHash, 
  decompressVillageFromHash 
} from '../public/js/sync.js';

describe('Moteur de Synchronisation Gzip & Intégrité (sync.js)', () => {
  it('calcule fidèlement le CRC32', () => {
    const c1 = crc32('Clash of Clans');
    assert.equal(typeof c1, 'number');
    assert.equal(c1, crc32('Clash of Clans'));
    assert.notEqual(c1, crc32('Clash of Clans 2'));
  });

  it('compresse et décompresse un village avec intégrité totale', async () => {
    const originalVillage = {
      tag: '#TESTSYNC',
      timestamp: 1789857035,
      heroes: [{ data: 28000000, lvl: 45 }],
      buildings: [{ data: 1000001, lvl: 11 }]
    };

    const hash = await compressVillageToHash(originalVillage);
    assert.ok(hash.startsWith('v2.'));

    const restoredVillage = await decompressVillageFromHash(hash);
    assert.deepEqual(restoredVillage, originalVillage);
  });

  it('rejette un hash altéré dont le checksum ne correspond pas', async () => {
    const originalVillage = { tag: '#CORRUPT_TEST', timestamp: 12345 };
    const validHash = await compressVillageToHash(originalVillage);

    // On altère le checksum dans le hash
    const parts = validHash.split('.');
    parts[1] = '00000000'; // faux checksum
    const tamperedHash = parts.join('.');

    await assert.rejects(
      async () => {
        await decompressVillageFromHash(tamperedHash);
      },
      /Échec de vérification du checksum/
    );
  });

  it('rejette une version de protocole inconnue', async () => {
    await assert.rejects(
      async () => {
        await decompressVillageFromHash('v99.12345678.payload');
      },
      /Version de protocole non supportée/
    );
  });
});
