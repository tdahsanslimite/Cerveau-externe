/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addItem, addList, clearDone, DEFAULT_IDEAS, DEFAULT_REMINDER, listTitle, openCount, removeItem, removeList, renameList,
  reminderLabel, reminderTrigger, updateItem, visibleItems, VRAC_ID,
} from './model.ts';
import type { IdeaItem, IdeasData } from './model.ts';

const TODAY = '2026-10-18';

const item = (over: Partial<IdeaItem> = {}): IdeaItem => ({
  id: 'i1', title: 'Idée', listId: VRAC_ID, createdAt: TODAY, done: false, ...over,
});

test('on part avec une seule liste, « En vrac »', () => {
  assert.deepEqual(DEFAULT_IDEAS.lists, [{ id: VRAC_ID, title: 'En vrac' }]);
  assert.equal(DEFAULT_IDEAS.items.length, 0);
  assert.equal(DEFAULT_IDEAS.reminder.mode, 'off');
});

test('ajouter : le plus récent en haut, titre nettoyé, titre vide ignoré', () => {
  let items: IdeaItem[] = [];
  items = addItem(items, '  Vidéo sur la colocation ', VRAC_ID, TODAY);
  items = addItem(items, 'Acheter du lait', VRAC_ID, TODAY);
  assert.deepEqual(items.map((i) => i.title), ['Acheter du lait', 'Vidéo sur la colocation']);
  assert.equal(items[0].createdAt, TODAY);
  assert.equal(items[0].done, false);
  const same = addItem(items, '   ', VRAC_ID, TODAY);
  assert.equal(same, items); // rien d'ajouté, même tableau
  assert.notEqual(items[0].id, items[1].id);
});

test('cocher, déplacer et renommer sans toucher aux autres éléments ni à l’original', () => {
  const items = [item({ id: 'a' }), item({ id: 'b', title: 'Autre' })];
  const done = updateItem(items, 'a', { done: true });
  assert.equal(done[0].done, true);
  assert.equal(done[1], items[1]);
  assert.equal(items[0].done, false);
  const moved = updateItem(items, 'a', { listId: 'videos' });
  assert.equal(moved[0].listId, 'videos');
  const renamed = updateItem(items, 'a', { title: '  Nouveau titre ' });
  assert.equal(renamed[0].title, 'Nouveau titre');
  // Un titre vidé ne supprime pas l'élément : on garde l'ancien.
  assert.equal(updateItem(items, 'a', { title: '   ' })[0].title, 'Idée');
});

test('affichage : à faire d’abord, cochés en bas, filtre par liste', () => {
  const items = [
    item({ id: 'a', done: true }),
    item({ id: 'b', listId: 'courses' }),
    item({ id: 'c' }),
    item({ id: 'd', listId: 'courses', done: true }),
  ];
  assert.deepEqual(visibleItems(items, null).map((i) => i.id), ['b', 'c', 'a', 'd']);
  assert.deepEqual(visibleItems(items, 'courses').map((i) => i.id), ['b', 'd']);
  assert.deepEqual(visibleItems(items, VRAC_ID).map((i) => i.id), ['c', 'a']);
});

test('compteurs : seulement ce qui n’est pas coché', () => {
  const items = [item({ id: 'a' }), item({ id: 'b', done: true }), item({ id: 'c', listId: 'courses' })];
  assert.equal(openCount(items, null), 2);
  assert.equal(openCount(items, VRAC_ID), 1);
  assert.equal(openCount(items, 'courses'), 1);
  assert.equal(openCount(items, 'inconnue'), 0);
});

test('vider les cochés : d’une liste ou de toutes', () => {
  const items = [
    item({ id: 'a', done: true }),
    item({ id: 'b', listId: 'courses', done: true }),
    item({ id: 'c', listId: 'courses' }),
  ];
  assert.deepEqual(clearDone(items, 'courses').map((i) => i.id), ['a', 'c']);
  assert.deepEqual(clearDone(items, null).map((i) => i.id), ['c']);
  assert.deepEqual(removeItem(items, 'b').map((i) => i.id), ['a', 'c']);
});

test('listes : ajout, doublons refusés (même en majuscules), renommage', () => {
  const start = DEFAULT_IDEAS.lists;
  const first = addList(start, ' Vidéos ');
  assert.ok(first.id);
  assert.deepEqual(first.lists.map((l) => l.title), ['En vrac', 'Vidéos']);
  assert.equal(addList(first.lists, 'vidéos').id, null);
  assert.equal(addList(first.lists, '  ').id, null);
  assert.equal(addList(first.lists, 'En vrac').id, null);

  const renamed = renameList(first.lists, first.id!, 'Vidéos YouTube');
  assert.equal(listTitle(renamed, first.id!), 'Vidéos YouTube');
  // Renommer en un nom déjà pris ou vide ne change rien.
  assert.equal(renameList(renamed, first.id!, 'en vrac'), renamed);
  assert.equal(renameList(renamed, first.id!, ' '), renamed);
  // Garder le même nom (autre casse) pour la même liste reste permis.
  assert.equal(listTitle(renameList(renamed, first.id!, 'vidéos youtube'), first.id!), 'vidéos youtube');
});

test('supprimer une liste : ses éléments retournent en vrac, rien n’est perdu', () => {
  const data: IdeasData = {
    ...DEFAULT_IDEAS,
    lists: [...DEFAULT_IDEAS.lists, { id: 'courses', title: 'Courses' }],
    items: [item({ id: 'a', listId: 'courses' }), item({ id: 'b' })],
  };
  const out = removeList(data, 'courses');
  assert.deepEqual(out.lists.map((l) => l.id), [VRAC_ID]);
  assert.deepEqual(out.items.map((i) => [i.id, i.listId]), [['a', VRAC_ID], ['b', VRAC_ID]]);
  assert.equal(data.items[0].listId, 'courses'); // l'original n'est pas modifié
});

test('« En vrac » ne se supprime pas, une liste inconnue non plus', () => {
  assert.equal(removeList(DEFAULT_IDEAS, VRAC_ID), DEFAULT_IDEAS);
  assert.equal(removeList(DEFAULT_IDEAS, 'fantome'), DEFAULT_IDEAS);
  assert.equal(listTitle(DEFAULT_IDEAS.lists, 'fantome'), 'En vrac');
});

test('rappel : rien si désactivé, chaque jour, chaque semaine (1 = dimanche)', () => {
  assert.equal(reminderTrigger(DEFAULT_REMINDER), null);
  assert.deepEqual(reminderTrigger({ mode: 'daily', minutes: 18 * 60 + 30, weekday: 0 }), { kind: 'daily', hour: 18, minute: 30 });
  const weekly = (weekday: number) => reminderTrigger({ mode: 'weekly', minutes: 9 * 60, weekday });
  assert.deepEqual(weekly(0), { kind: 'weekly', weekday: 2, hour: 9, minute: 0 }); // lundi
  assert.deepEqual(weekly(4), { kind: 'weekly', weekday: 6, hour: 9, minute: 0 }); // vendredi
  assert.deepEqual(weekly(5), { kind: 'weekly', weekday: 7, hour: 9, minute: 0 }); // samedi
  assert.deepEqual(weekly(6), { kind: 'weekly', weekday: 1, hour: 9, minute: 0 }); // dimanche
});

test('libellé du rappel', () => {
  assert.equal(reminderLabel(DEFAULT_REMINDER), 'Pas de rappel');
  assert.match(reminderLabel({ mode: 'daily', minutes: 18 * 60, weekday: 0 }), /^Chaque jour à /);
  assert.match(reminderLabel({ mode: 'weekly', minutes: 9 * 60, weekday: 6 }), /^Chaque dimanche à /);
});
