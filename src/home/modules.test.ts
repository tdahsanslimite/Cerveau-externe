import test from 'node:test';
import assert from 'node:assert/strict';
import { BAR_IDS, barModules, MODULES, moduleById, tileSpan } from './modules.ts';

test('chaque module a un id unique', () => {
  const ids = MODULES.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('la barre du bas ne garde que des modules qui existent, dans l\'ordre voulu', () => {
  assert.deepEqual(BAR_IDS, ['calendrier', 'routines', 'taches']);
  assert.deepEqual(barModules().map((m) => m.id), BAR_IDS);
  for (const id of BAR_IDS) assert.equal(moduleById(id).id, id);
});

test('l\'accueil propose les 7 modules, dont respiration et méditation hors de la barre', () => {
  assert.equal(MODULES.length, 7);
  assert.ok(MODULES.some((m) => m.id === 'respiration'));
  assert.ok(MODULES.some((m) => m.id === 'meditation'));
  assert.ok(!BAR_IDS.includes('respiration'));
  assert.ok(!BAR_IDS.includes('meditation'));
});

test('tileSpan : la dernière tuile d\'un nombre impair prend toute la largeur', () => {
  assert.equal(tileSpan(0, 7), 1);
  assert.equal(tileSpan(5, 7), 1);
  assert.equal(tileSpan(6, 7), 2);
  assert.equal(tileSpan(7, 8), 1);
  assert.equal(tileSpan(9, 10), 1);
});
