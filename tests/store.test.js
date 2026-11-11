import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppStore, STORAGE_KEY, LEGACY_STORAGE_KEY } from '../public/js/store.js';

// Mock simple de localStorage en mémoire
class MemoryStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

describe('AppStore & Persistance Versionnée', () => {
  it('initialise avec l\'état par défaut', () => {
    const store = new AppStore();
    const state = store.getState();
    assert.equal(state.version, 2);
    assert.equal(state.theme, 'auto');
    assert.equal(state.activeTag, null);
    assert.deepEqual(state.accounts, {});
  });

  it('importe un village et le définit comme compte actif', () => {
    const memStorage = new MemoryStorage();
    const store = new AppStore();

    const village = { tag: '#TEST1234', timestamp: 123456789, buildings: [] };
    const importedTag = store.importVillage(village, memStorage);

    assert.equal(importedTag, '#TEST1234');
    assert.equal(store.getState().activeTag, '#TEST1234');
    assert.deepEqual(store.getActiveVillageData(), village);

    // Vérifie que le localStorage contient les données
    const saved = JSON.parse(memStorage.getItem(STORAGE_KEY));
    assert.equal(saved.version, 2);
    assert.ok(saved.accounts['#TEST1234']);
  });

  it('migre un ancien schéma v1 vers le schéma multi-comptes v2', () => {
    const memStorage = new MemoryStorage();
    const legacyVillage = { tag: '#LEGACY99', timestamp: 999999 };
    memStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyVillage));

    const store = new AppStore();
    store.loadFromStorage(memStorage);

    assert.equal(store.getState().activeTag, '#LEGACY99');
    assert.ok(store.getState().accounts['#LEGACY99']);
    assert.deepEqual(store.getActiveVillageData(), legacyVillage);

    // Le schéma v2 a été sauvegardé
    const v2Saved = JSON.parse(memStorage.getItem(STORAGE_KEY));
    assert.equal(v2Saved.version, 2);
    assert.ok(v2Saved.accounts['#LEGACY99']);
  });

  it('gère le masquage et le marquage des conseils', () => {
    const memStorage = new MemoryStorage();
    const store = new AppStore();

    store.toggleAdviceHidden('rule_hero_upgrade', memStorage);
    assert.ok(store.getState().hiddenAdviceIds.includes('rule_hero_upgrade'));

    store.toggleAdviceHidden('rule_hero_upgrade', memStorage);
    assert.ok(!store.getState().hiddenAdviceIds.includes('rule_hero_upgrade'));

    store.toggleAdviceCompleted('rule_lab_rush', memStorage);
    assert.ok(store.getState().completedAdviceIds.includes('rule_lab_rush'));
  });

  it('supprime un compte et réaffecte le compte actif', () => {
    const memStorage = new MemoryStorage();
    const store = new AppStore();

    store.importVillage({ tag: '#VILLAGE_A' }, memStorage);
    store.importVillage({ tag: '#VILLAGE_B' }, memStorage);

    assert.equal(store.getState().activeTag, '#VILLAGE_B');

    store.deleteAccount('#VILLAGE_B', memStorage);
    assert.equal(store.getState().activeTag, '#VILLAGE_A');
    assert.equal(store.getState().accounts['#VILLAGE_B'], undefined);
  });
});
