/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  byQuadrant, toSortCount, eventFromTask, eventToItem, toSort, canSchedule, nightlyReset, matrixDay, isStuck, itemsOf, newTask, quadrantOf, setDone, slideLabel, returnOverdueToSas, eventTasksToReturn, taskFromMissedEvent,
  sortEvent, sortTask, taskCountOn, taskToItem, tasksOn, whenToDay,
  continueList, moveIdea, pointsOf, priorityOf,
} from './model.ts';
import type { Task, TaskItem } from './model.ts';
import type { CalendarEvent } from '../calendar/model.ts';

const TODAY = '2026-10-15';
const mk = (over: Partial<Task> = {}): Task => ({ ...newTask('Tâche', '2026-10-10'), ...over });

test('les quatre quadrants d’Eisenhower', () => {
  assert.equal(quadrantOf({ important: true, urgent: true }), 'faire');
  assert.equal(quadrantOf({ important: true, urgent: false }), 'planifier');
  assert.equal(quadrantOf({ important: false, urgent: true }), 'alleger');
  assert.equal(quadrantOf({ important: false, urgent: false }), 'lacher');
  assert.equal(quadrantOf({ important: null, urgent: null }), 'vrac'); // « Ne sais pas » : en vrac
  assert.equal(quadrantOf({ important: true, urgent: null }), 'vrac');
});

test('une tâche déposée atterrit dans le sas, sans priorité ni jour', () => {
  const t = newTask('  Appeler la banque  ', TODAY);
  assert.equal(t.title, 'Appeler la banque');
  assert.equal(t.important, null);
  assert.equal(t.day, null);
  assert.equal(quadrantOf(t), 'vrac');
  assert.ok(toSort(t));
});

test('« Ne sais pas » (null) range En vrac, et seules The One Thing / Urgent et important se programment', () => {
  const vierge = mk({ id: 'a' });
  const moitie = mk({ id: 'f', important: true, urgent: null });
  const faire = mk({ id: 'b', important: true, urgent: true });
  assert.deepEqual(byQuadrant([vierge, moitie, faire], 'vrac').map((x) => x.id), ['a', 'f']);
  assert.ok(!canSchedule(vierge) && !canSchedule(moitie));
  assert.ok(canSchedule(faire));
  assert.ok(canSchedule({ important: true, urgent: true, oneThing: true }));
  assert.ok(!canSchedule({ important: true, urgent: false }));
  assert.ok(!canSchedule({ important: false, urgent: true }));
});

test('trier une tâche la range dans la matrice', () => {
  const t = sortTask(mk({ id: 'a' }), true, true, TODAY);
  assert.ok(!toSort(t));
  assert.deepEqual(byQuadrant([t], 'faire').map((x) => x.id), ['a']);
  assert.deepEqual(byQuadrant([t], 'planifier'), []);
  assert.equal(t.day, TODAY);
});

test('la matrice classe par jour prévu, « un jour » en dernier, et ignore les faites et lâchées', () => {
  const tasks = [
    mk({ id: 'sans', important: true, urgent: false, day: null }),
    mk({ id: 'tard', important: true, urgent: false, day: '2026-10-20' }),
    mk({ id: 'tot', important: true, urgent: false, day: '2026-10-16' }),
    mk({ id: 'faite', important: true, urgent: false, status: 'done' }),
    mk({ id: 'lachee', important: true, urgent: false, status: 'dropped' }),
  ];
  assert.deepEqual(byQuadrant(tasks, 'planifier').map((x) => x.id), ['tot', 'tard', 'sans']);
});

test('les tâches du jour : à faire d’abord par priorité, faites ensuite, lâchées jamais', () => {
  const tasks = [
    mk({ id: 'faite', day: TODAY, status: 'done', important: true, urgent: true }),
    mk({ id: 'plan', day: TODAY, important: true, urgent: false }),
    mk({ id: 'brute', day: TODAY }),
    mk({ id: 'faire', day: TODAY, important: true, urgent: true }),
    mk({ id: 'lachee', day: TODAY, status: 'dropped' }),
    mk({ id: 'demain', day: '2026-10-16' }),
  ];
  assert.deepEqual(tasksOn(tasks, TODAY).map((x) => x.id), ['faire', 'plan', 'brute', 'faite']);
});

test('la charge du jour compte les tâches prévues, faites ou non, pas les lâchées', () => {
  const tasks = [
    mk({ day: TODAY }),
    mk({ day: TODAY, status: 'done' }),
    mk({ day: TODAY, status: 'dropped' }),
    mk({ day: '2026-10-16' }),
    mk({ day: null }),
  ];
  assert.equal(taskCountOn(tasks, TODAY), 2);
  assert.equal(taskCountOn(tasks, '2026-10-16'), 1);
  assert.equal(taskCountOn(tasks, '2026-10-17'), 0);
});

test('retour au sas : une tâche pas cochée un jour passé repasse par le sas, sans jour ni priorité', () => {
  const tasks = [
    mk({ id: 'retard', day: '2026-10-13', important: true, urgent: true }),
    mk({ id: 'aujourdhui', day: TODAY }),
    mk({ id: 'futur', day: '2026-10-20' }),
    mk({ id: 'sansjour', day: null }),
    mk({ id: 'faite', day: '2026-10-13', status: 'done' }),
    mk({ id: 'lachee', day: '2026-10-13', status: 'dropped' }),
  ];
  const out = returnOverdueToSas(tasks, TODAY);
  const get = (id: string) => out.find((t) => t.id === id) as Task;
  assert.equal(get('retard').day, null);
  assert.equal(get('retard').important, null);
  assert.equal(get('retard').urgent, null);
  assert.equal(get('retard').slides, 1);
  assert.ok(byQuadrant(out.map(taskToItem), 'vrac').some((i) => i.id === 'retard')); // retour dans En vrac, à re-décider
  for (const id of ['aujourdhui', 'futur', 'sansjour', 'faite', 'lachee']) {
    assert.equal(get(id).slides, 0, id);
    assert.equal(get(id).day, tasks.find((t) => t.id === id)?.day);
  }
});

test('retour au sas : rien à faire = même tableau, rien ne s’accumule sur demain', () => {
  const calme = [mk({ day: TODAY }), mk({ day: null })];
  assert.equal(returnOverdueToSas(calme, TODAY), calme);
  const once = returnOverdueToSas([mk({ day: '2026-10-01' })], TODAY);
  assert.equal(returnOverdueToSas(once, TODAY), once);
  assert.equal(returnOverdueToSas(once, '2026-10-16'), once); // sans jour : elle attend dans le sas
});

test('événement « Tâche » pas coché : le créneau reste, une tâche repart dans le sas', () => {
  const ev = (o: Partial<CalendarEvent>): CalendarEvent => ({
    id: 'e', title: 'Monter la vidéo', date: '2026-10-13', start: 14 * 60, durationMin: 120,
    category: 'travail', repeat: 'none', kinds: ['tache'], important: true, urgent: false, ...o,
  });
  const events = [
    ev({ id: 'rate' }),
    ev({ id: 'fait', doneDays: ['2026-10-13'] }),
    ev({ id: 'deja', sentToSas: true }),
    ev({ id: 'aujourdhui', date: TODAY }),
    ev({ id: 'serie', repeat: 'daily' }),
    ev({ id: 'rdv', kinds: ['rdv'] }),
  ];
  assert.deepEqual(eventTasksToReturn(events, TODAY).map((e) => e.id), ['rate']);
  const t = taskFromMissedEvent(events[0], TODAY);
  assert.equal(t.title, 'Monter la vidéo');
  assert.equal(t.day, null);
  assert.equal(t.important, null);
  assert.equal(t.slides, 1);
  // une fois renvoyé, l'événement ne compte plus comme tâche (pas de doublon)
  assert.equal(eventToItem({ ...events[0], sentToSas: true }), null);
});

test('une tâche qui revient souvent au sas est signalée comme coincée', () => {
  assert.equal(slideLabel(mk()), null);
  assert.equal(slideLabel(mk({ slides: 1 })), 'Revenue au sas 1 fois');
  assert.equal(slideLabel(mk({ slides: 4 })), 'Revenue au sas 4 fois');
  assert.equal(isStuck(mk({ slides: 2 })), false);
  assert.equal(isStuck(mk({ slides: 3 })), true);
  assert.equal(isStuck(mk({ slides: 5, status: 'done' })), false);
});

test('cocher puis décocher une tâche', () => {
  const t = mk();
  const done = setDone(t, true, TODAY);
  assert.equal(done.status, 'done');
  assert.equal(done.doneAt, TODAY);
  const back = setDone(done, false, TODAY);
  assert.equal(back.status, 'todo');
  assert.equal(back.doneAt, undefined);
});

test('choix « quand » du tri guidé', () => {
  assert.equal(whenToDay('aujourdhui', TODAY), TODAY);
  assert.equal(whenToDay('demain', TODAY), '2026-10-16');
  assert.equal(whenToDay('demain', '2026-10-31'), '2026-11-01');
  assert.equal(whenToDay('un-jour', TODAY), null);
});

// ---- Une seule liste : tâches du module + événements « Tâche » du calendrier ----

const ev = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1', title: 'Appeler le notaire', date: TODAY, start: 14 * 60, durationMin: 30, category: 'travail',
  repeat: 'none', kinds: ['tache'], ...over,
});

test('un événement coché « Tâche » apparaît dans la liste, avec son créneau', () => {
  const item = eventToItem(ev()) as TaskItem;
  assert.equal(item.source, 'event');
  assert.equal(item.key, 'event:e1');
  assert.equal(item.day, TODAY);
  assert.equal(item.start, 14 * 60);
  assert.equal(item.durationMin, 30);
  assert.equal(item.important, null);
  assert.equal(item.status, 'todo');
});

test('les rendez-vous et séries restent dans le calendrier (un objet seul devient une liste)', () => {
  assert.equal(eventToItem(ev({ kinds: ['rdv'] })), null);
  assert.equal(eventToItem(ev({ kinds: undefined })), null); // événements d’avant la v1.1 = rendez-vous
  assert.equal(eventToItem(ev({ kinds: ['objet'], repeat: 'daily' })), null);
  assert.equal(eventToItem(ev({ repeat: 'daily' })), null);
  assert.equal(eventToItem(ev({ repeat: 'weekly' })), null);
  assert.notEqual(eventToItem(ev({ kinds: ['rdv', 'tache', 'objet'] })), null); // « IRM + tâche + objet »
});

test('un événement « Tâche » est fait quand son jour est coché', () => {
  assert.equal(eventToItem(ev({ doneDays: [TODAY] }))?.status, 'done');
  assert.equal(eventToItem(ev({ doneDays: ['2026-10-01'] }))?.status, 'todo');
});

test('sas et matrice mélangent tâches du module et événements, sans doublon', () => {
  const tasks = [mk({ id: 't1' }), mk({ id: 't2', important: true, urgent: false })];
  const events = [
    ev({ id: 'e1' }),
    ev({ id: 'e2', important: true, urgent: false, date: '2026-10-20' }),
    ev({ id: 'e3', kinds: ['rdv'] }),
  ];
  const items = itemsOf(tasks, events);
  assert.deepEqual(items.map((i) => i.key), ['task:t1', 'task:t2', 'event:e1', 'event:e2']);
  assert.deepEqual(byQuadrant(items, 'vrac').map((i) => i.key), ['event:e1', 'task:t1']);
  assert.deepEqual(byQuadrant(items, 'planifier').map((i) => i.key), ['event:e2', 'task:t2']); // le jour le plus proche d'abord, « un jour » en dernier
});

test('la matrice classe par jour : l’événement du 20 passe avant la tâche « un jour »', () => {
  const items = itemsOf(
    [mk({ id: 't', important: true, urgent: false, day: null })],
    [ev({ id: 'e', important: true, urgent: false, date: '2026-10-20' })],
  );
  assert.deepEqual(byQuadrant(items, 'planifier').map((i) => i.key), ['event:e', 'task:t']);
});

test('aujourd’hui : l’événement à 14 h passe avant la tâche sans heure, même moins prioritaire', () => {
  const items = itemsOf(
    [mk({ id: 'sans-heure', day: TODAY, important: true, urgent: true })],
    [ev({ id: 'a14', important: false, urgent: false }), ev({ id: 'a9', start: 9 * 60 })],
  );
  assert.deepEqual(tasksOn(items, TODAY).map((i) => i.id), ['a9', 'a14', 'sans-heure']);
});

test('la charge du jour ne compte pas deux fois un événement « Tâche » (il n’est que dans le calendrier)', () => {
  const tasks = [mk({ day: TODAY })];
  assert.equal(taskCountOn(tasks, TODAY), 1); // seules les tâches du module s’ajoutent aux événements
});

test('programmer une tâche : le brouillon d’événement reprend tout et ne garde que l’heure à choisir', () => {
  const t = mk({ id: 't', title: '  Envoyer le devis ', day: '2026-10-17', category: 'sport', note: 'PDF en pièce jointe', important: true, urgent: false });
  const e = eventFromTask(t, TODAY, ['travail', 'sport']);
  assert.equal(e.title, 'Envoyer le devis');
  assert.equal(e.date, '2026-10-17');
  assert.equal(e.category, 'sport');
  assert.equal(e.note, 'PDF en pièce jointe');
  assert.deepEqual(e.kinds, ['tache']);
  assert.equal(e.repeat, 'none');
  assert.equal(e.important, true);
  assert.equal(e.urgent, false);
  assert.equal(e.start, 9 * 60);
  assert.notEqual(e.id, t.id);
  // le brouillon, une fois enregistré, redevient un élément de la liste, avec la même priorité
  assert.equal(eventToItem(e)?.important, true);
});

test('programmer une tâche sans jour ni domaine connu : aujourd’hui et un domaine qui existe', () => {
  const e = eventFromTask(mk({ day: null, category: 'supprime' }), TODAY, ['famille', 'travail']);
  assert.equal(e.date, TODAY);
  assert.equal(e.category, 'travail');
  assert.equal(eventFromTask(mk(), TODAY, ['famille', 'sport']).category, 'famille');
  assert.equal(eventToItem(e)?.important, null); // pas de priorité : il atterrit dans le sas
});

test('trier un événement « Tâche » ne touche qu’à sa priorité', () => {
  const before = ev({ note: 'x' });
  const after = sortEvent(before, true, false);
  assert.equal(after.important, true);
  assert.equal(after.urgent, false);
  assert.equal(after.start, before.start);
  assert.equal(after.note, 'x');
  assert.ok(!toSort(eventToItem(after) as TaskItem));
});

test('une tâche du module se convertit en élément de liste sans perdre ses champs', () => {
  const item = taskToItem(mk({ id: 'x', day: TODAY, slides: 2, category: 'perso' }));
  assert.equal(item.key, 'task:x');
  assert.equal(item.start, null);
  assert.equal(item.slides, 2);
  assert.equal(item.category, 'perso');
});

// ---- Une seule chose à la fois ----

const it = (key: string, important: boolean | null, urgent: boolean | null, over: Partial<TaskItem> = {}): TaskItem => ({
  ...(taskToItem(mk({ id: key })) as TaskItem), key, important, urgent, ...over,
});

test('la priorité de chaque case de la matrice', () => {
  assert.deepEqual(priorityOf('faire'), { important: true, urgent: true });
  assert.deepEqual(priorityOf('planifier'), { important: true, urgent: false });
  assert.deepEqual(priorityOf('alleger'), { important: false, urgent: true });
  assert.deepEqual(priorityOf('lacher'), { important: false, urgent: false });
  assert.deepEqual(priorityOf('vrac'), { important: null, urgent: null });
  assert.equal(quadrantOf(priorityOf('vrac')), 'vrac');
  for (const q of ['faire', 'planifier', 'alleger', 'lacher'] as const) assert.equal(quadrantOf(priorityOf(q)), q);
});

test('les points : important 2, urgent 1, entre 0 et 3', () => {
  assert.equal(pointsOf({ important: true, urgent: true }), 3);
  assert.equal(pointsOf({ important: true, urgent: false }), 2);
  assert.equal(pointsOf({ important: false, urgent: true }), 1);
  assert.equal(pointsOf({ important: false, urgent: false }), 0);
  assert.equal(pointsOf({ important: null, urgent: null }), 0);
});

test('The One Thing : seulement si l’idée y a été placée, et importante ET urgente', () => {
  assert.equal(quadrantOf({ important: true, urgent: true, oneThing: true }), 'one');
  assert.equal(quadrantOf({ important: true, urgent: true }), 'faire');
  assert.equal(quadrantOf({ important: true, urgent: false, oneThing: true }), 'planifier');
  assert.deepEqual(priorityOf('one'), { important: true, urgent: true });
});

test('l’ordre choisi à la main passe avant le jour', () => {
  const items = [
    it('c', true, false, { day: '2026-10-17' }),
    it('b', true, false, { rank: 1, day: '2026-10-30' }),
    it('a', true, false, { rank: 0, day: '2026-10-31' }),
    it('d', true, false, { day: '2026-10-16' }),
  ];
  assert.deepEqual(byQuadrant(items, 'planifier').map((i) => i.key), ['a', 'b', 'd', 'c']);
});

test('déplacer une idée vers une autre liste, à une place précise', () => {
  const items = [
    it('p1', true, false, { rank: 0 }), it('p2', true, false, { rank: 1 }),
    it('f1', true, true, { rank: 0 }), it('u1', false, true),
  ];
  const f = (key: string, rank: number) => ({ key, important: true, urgent: true, rank, oneThing: false });
  const pl = (key: string, rank: number) => ({ key, important: true, urgent: false, rank, oneThing: false });
  assert.deepEqual(moveIdea(items, 'u1', 'faire', 0), [f('u1', 0), f('f1', 1)]);
  assert.deepEqual(moveIdea(items, 'u1', 'faire', 9), [f('u1', 1)]);
  assert.deepEqual(moveIdea(items, 'p2', 'planifier', 0), [pl('p2', 0), pl('p1', 1)]);
  assert.deepEqual(moveIdea(items, 'p1', 'planifier', 0), []);
  assert.deepEqual(moveIdea(items, 'inconnue', 'faire', 0), []);
  assert.deepEqual(moveIdea(items, 'p1', 'lacher', 0), [{ key: 'p1', important: false, urgent: false, rank: 0, oneThing: false }]);
});

test('The One Thing ne contient qu’une idée : l’ancienne retourne en haut de « urgent et important »', () => {
  const items = [
    it('one', true, true, { rank: 0, oneThing: true }),
    it('f1', true, true, { rank: 0 }), it('f2', true, true, { rank: 1 }), it('p', true, false),
  ];
  const f = (key: string, rank: number) => ({ key, important: true, urgent: true, rank, oneThing: false });
  // case libre : l'idée y entre (f1 garde déjà sa place)
  const free = [it('f1', true, true, { rank: 0 }), it('f2', true, true, { rank: 1 })];
  assert.deepEqual(moveIdea(free, 'f2', 'one', 0), [{ key: 'f2', important: true, urgent: true, rank: 0, oneThing: true }]);
  // case occupée : on remplace
  assert.deepEqual(moveIdea(items, 'p', 'one', 0), [
    { key: 'p', important: true, urgent: true, rank: 0, oneThing: true },
    f('one', 0), f('f1', 1), f('f2', 2),
  ]);
  // en sortir : retour dans une liste normale, le drapeau tombe
  assert.deepEqual(moveIdea(items, 'one', 'planifier', 0), [{ key: 'one', important: true, urgent: false, rank: 0, oneThing: false }, { key: 'p', important: true, urgent: false, rank: 1, oneThing: false }]);
  assert.deepEqual(byQuadrant(items, 'one').map((i) => i.key), ['one']);
  assert.deepEqual(byQuadrant(items, 'faire').map((i) => i.key), ['f1', 'f2']);
});

test('la note continue une liste à tirets', () => {
  assert.equal(continueList('- un', '- un\n'), '- un\n- ');
  assert.equal(continueList('- un\n- ', '- un\n- \n'), '- un\n'); // retour sur un tiret vide : fin de liste
  assert.equal(continueList('texte', 'texte\n'), 'texte\n');
  assert.equal(continueList('- un', '- un deux'), '- un deux');
  assert.equal(continueList('', '\n'), '\n');
});

test('liste : une idée « liste » devient un événement tâche + objet avec ses lignes, et un événement « objet » seul est une liste', () => {
  const t = mk({ id: 'l', kind: 'liste', items: [{ id: '1', text: 'lait' }, { id: '2', text: 'pain', done: true }], important: true, urgent: true });
  assert.equal(taskToItem(t).kind, 'liste');
  const e = eventFromTask(t, TODAY, ['travail']);
  assert.deepEqual(e.kinds, ['tache', 'objet']);
  assert.equal(e.items?.length, 2);
  const back = eventToItem(e);
  assert.equal(back?.kind, 'liste');
  const objetSeul = eventToItem(ev({ id: 'o', kinds: ['objet'], item: 'devis' }));
  assert.equal(objetSeul?.kind, 'liste');
  assert.equal(eventToItem(ev({ id: 'r', kinds: ['rdv', 'objet'], item: 'devis' })), null); // IRM : reste un rendez-vous
  assert.equal(taskToItem(mk({ id: 'x' })).kind, 'tache');
});

test('nuit à 3 h : Important, Urgent et Abandonner repartent en vrac ; The One Thing, Urgent et important et le programmé restent', () => {
  const one = mk({ id: 'o', important: true, urgent: true, oneThing: true });
  const faire = mk({ id: 'f', important: true, urgent: true });
  const plan = mk({ id: 'p', important: true, urgent: false, rank: 2 });
  const alleg = mk({ id: 'a', important: false, urgent: true });
  const lache = mk({ id: 'l', important: false, urgent: false });
  const vrac = mk({ id: 'v' });
  const prevu = mk({ id: 'd', important: true, urgent: false, day: '2026-11-12' });
  const fini = mk({ id: 'x', important: true, urgent: false, status: 'done' });
  const ups = nightlyReset([one, faire, plan, alleg, lache, vrac, prevu, fini].map(taskToItem));
  assert.deepEqual(ups.map((u) => u.key).sort(), ['task:a', 'task:l', 'task:p']);
  assert.ok(ups.every((u) => u.important === null && u.urgent === null && u.rank === undefined && !u.oneThing));
});

test('jour de la matrice : la nuit finit à 3 h', () => {
  assert.equal(matrixDay(new Date(2026, 10, 11, 2, 59)), '2026-11-10');
  assert.equal(matrixDay(new Date(2026, 10, 11, 3, 0)), '2026-11-11');
});

test('toSortCount : compte les idées sans priorité encore à faire, pas les triées ni les faites', () => {
  const items = [
    { important: null, urgent: null, status: 'todo' as const },   // neuve
    { important: true, urgent: null, status: 'todo' as const },   // un « Ne sais pas »
    { important: true, urgent: false, status: 'todo' as const },  // triée
    { important: null, urgent: null, status: 'done' as const },   // faite
    { important: null, urgent: null, status: 'dropped' as const },// abandonnée
  ];
  assert.equal(toSortCount(items), 2);
  assert.equal(toSortCount([]), 0);
});

test('date limite : urgente à 2 jours, pas vidée la nuit, libellé', async () => {
  const { deadlineUpdates, nightlyReset, applyDeadline, deadlineLabel, taskToItem, newTask } = await import('./model.ts');
  const today = '2026-11-13';
  const base = newTask('Payer les impôts', today);
  const loin = taskToItem({ ...base, id: 'a', important: true, urgent: false, deadline: '2026-11-30' });
  const proche = taskToItem({ ...base, id: 'b', important: true, urgent: false, deadline: '2026-11-15' });
  const vrac = taskToItem({ ...base, id: 'c', deadline: '2026-11-14' });
  const items = [loin, proche, vrac];
  assert.deepEqual(deadlineUpdates(items, today).map((u) => [u.key, u.important, u.urgent]), [['task:b', true, true], ['task:c', false, true]]);
  assert.deepEqual(nightlyReset(items, today).map((u) => u.key), ['task:a']); // la proche reste dans la matrice
  assert.equal(applyDeadline({ ...base, deadline: '2026-11-14' }, today).urgent, true);
  assert.equal(applyDeadline({ ...base, deadline: '2026-12-14' }, today).urgent, null);
  assert.equal(deadlineLabel('2026-11-20', today), 'Avant le 20 nov.');
  assert.equal(deadlineLabel('2026-11-12', today), 'Date limite dépassée');
  assert.equal(taskToItem(base).type, 'tache');
});

test('les 3 mots de la priorité : Urgent, Important, Ne sais pas', async () => {
  const { pickPriority, priorityWordOn, quadrantOf } = await import('./model.ts');
  let p = pickPriority({ important: null, urgent: null }, 'urgent');
  assert.equal(quadrantOf(p), 'alleger');
  p = pickPriority(p, 'important');
  assert.equal(quadrantOf(p), 'faire');                       // les deux : Urgent et important
  p = pickPriority(p, 'urgent');
  assert.equal(quadrantOf(p), 'planifier');
  assert.equal(quadrantOf(pickPriority(p, 'important')), 'vrac'); // plus rien de coché : Ne sais pas
  assert.equal(quadrantOf(pickPriority(p, 'nsp')), 'vrac');
  assert.ok(priorityWordOn({ important: null, urgent: null }, 'nsp'));
  assert.ok(!priorityWordOn({ important: false, urgent: false }, 'nsp')); // Abandonner ? : aucun mot allumé
});
