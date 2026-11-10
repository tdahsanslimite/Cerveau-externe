import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BAR_IDS, barModules, categoryById, categoryInfo, categoryModules, categoryOf, CATEGORIES, MODULES, moduleById, tileSpan,
} from './modules.ts';

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

test('chaque module est dans une et une seule catégorie, et toute catégorie ne contient que des modules qui existent', () => {
  const all = CATEGORIES.flatMap((c) => c.items);
  assert.equal(new Set(all).size, all.length);
  assert.deepEqual([...all].sort(), MODULES.map((m) => m.id).sort());
  for (const m of MODULES) assert.ok(categoryOf(m.id));
});

test('les 3 catégories de l\'accueil et leurs sous-menus', () => {
  assert.deepEqual(CATEGORIES.map((c) => c.id), ['tdah', 'organiser', 'detendre']);
  assert.deepEqual(categoryById('tdah').items, ['objectifs', 'routines', 'journal']);
  assert.deepEqual(categoryById('organiser').items, ['taches', 'calendrier']);
  assert.deepEqual(categoryModules('detendre').map((m) => m.id), ['respiration', 'meditation']);
  assert.equal(categoryOf('journal')?.id, 'tdah');
  assert.equal(categoryOf('calendrier')?.id, 'organiser');
});

test('categoryInfo : somme des nombres à classer, point si un module en a un', () => {
  assert.deepEqual(categoryInfo('organiser', { taches: { badge: 4 } }), { badge: 4, dot: undefined });
  assert.deepEqual(categoryInfo('tdah', { routines: { dot: true } }), { badge: undefined, dot: true });
  assert.deepEqual(categoryInfo('detendre', { taches: { badge: 9 } }), { badge: undefined, dot: undefined });
  assert.deepEqual(categoryInfo('tdah', {}), { badge: undefined, dot: undefined });
});
