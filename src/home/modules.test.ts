import test from 'node:test';
import assert from 'node:assert/strict';
import {
  barModulesFor, categoryById, categoryInfo, categoryModules, categoryOf, CATEGORIES, directModule, MODULES, moduleById, tileSpan,
} from './modules.ts';

test('chaque module a un id unique', () => {
  const ids = MODULES.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('la barre du bas montre les modules de la catégorie où l\'on est', () => {
  assert.deepEqual(barModulesFor('calendrier').map((m) => m.id), ['taches', 'calendrier']);
  assert.deepEqual(barModulesFor('taches').map((m) => m.id), ['taches', 'calendrier']);
  assert.deepEqual(barModulesFor('routines').map((m) => m.id), ['journal', 'routines', 'objectifs']);
  assert.deepEqual(barModulesFor('meditation').map((m) => m.id), ['respiration', 'meditation']);
  assert.equal(moduleById('taches').barLabel, 'Trier');
});

test('l\'accueil propose les 8 modules', () => {
  assert.equal(MODULES.length, 8);
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

test('les 4 catégories de l\'accueil et leurs sous-menus', () => {
  assert.deepEqual(CATEGORIES.map((c) => c.id), ['tdah', 'organiser', 'detendre', 'reveil']);
  assert.deepEqual(categoryById('tdah').items, ['journal', 'routines', 'objectifs']);
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

test('le Réveil est une catégorie à part dont la tuile ouvre directement le module', () => {
  assert.equal(directModule('reveil'), 'reveil');
  assert.equal(directModule('organiser'), null);
  assert.deepEqual(barModulesFor('reveil').map((m) => m.id), ['reveil']);
});
