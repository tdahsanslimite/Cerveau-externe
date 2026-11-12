/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_WEEK, countOn, daysText, formatTime, newAlarm, nextOverall, nextRing, sortAlarms, soundLabel, toNative,
  turnOffFired, untilText, whenText, WORK_WEEK,
} from './model.ts';
import type { WakeAlarm } from './model.ts';

const alarm = (over: Partial<WakeAlarm> = {}): WakeAlarm => ({
  id: 'a', minutes: 6 * 60 + 45, days: [], title: 'Réveil', sound: 'app:douceur', on: true, ...over,
});
// Jeudi 12 novembre 2026, 08:49
const NOW = new Date(2026, 10, 12, 8, 49);

test('heure affichée à la minute près', () => {
  assert.equal(formatTime(6 * 60 + 5), '06:05');
  assert.equal(formatTime(23 * 60 + 59), '23:59');
});

test('jours en clair', () => {
  assert.equal(daysText([]), 'Une fois');
  assert.equal(daysText(ALL_WEEK), 'Tous les jours');
  assert.equal(daysText(WORK_WEEK), 'Lun – ven');
  assert.equal(daysText([6, 5]), 'Week-end');
  assert.equal(daysText([2, 0]), 'Lun, Mer');
});

test('un réveil « une fois » sonne aujourd’hui si l’heure n’est pas passée, sinon demain', () => {
  assert.deepEqual(nextRing(alarm({ minutes: 9 * 60 }), NOW), new Date(2026, 10, 12, 9, 0));
  assert.deepEqual(nextRing(alarm({ minutes: 6 * 60 + 45 }), NOW), new Date(2026, 10, 13, 6, 45));
  // à la minute exacte en cours : déjà passé
  assert.deepEqual(nextRing(alarm({ minutes: 8 * 60 + 49 }), NOW), new Date(2026, 10, 13, 8, 49));
});

test('un réveil de semaine saute le week-end', () => {
  const fri = new Date(2026, 10, 13, 7, 0); // vendredi 7:00, réveil de 6:45 déjà passé
  assert.deepEqual(nextRing(alarm({ days: WORK_WEEK }), fri), new Date(2026, 10, 16, 6, 45)); // lundi
});

test('un réveil éteint ne sonne pas', () => {
  assert.equal(nextRing(alarm({ on: false }), NOW), null);
});

test('le prochain réveil parmi plusieurs', () => {
  const list = [alarm({ id: 'x', minutes: 22 * 60 }), alarm({ id: 'y', minutes: 12 * 60 }), alarm({ id: 'z', minutes: 9 * 60, on: false })];
  const next = nextOverall(list, NOW);
  assert.equal(next?.alarm.id, 'y');
  assert.equal(nextOverall([], NOW), null);
});

test('temps restant et jour en clair', () => {
  assert.equal(untilText(new Date(2026, 10, 12, 8, 50), NOW), 'dans moins d’une minute');
  assert.equal(untilText(new Date(2026, 10, 12, 9, 30), NOW), 'dans 41 min');
  assert.equal(untilText(new Date(2026, 10, 12, 16, 54), NOW), 'dans 8 h 05');
  assert.equal(untilText(new Date(2026, 10, 12, 10, 49), NOW), 'dans 2 h');
  assert.equal(untilText(new Date(2026, 10, 14, 10, 49), NOW), 'dans 2 j 2 h');
  assert.equal(whenText(new Date(2026, 10, 12, 21, 0), NOW), 'aujourd’hui à 21:00');
  assert.equal(whenText(new Date(2026, 10, 13, 6, 45), NOW), 'demain à 06:45');
  assert.equal(whenText(new Date(2026, 10, 16, 6, 45), NOW), 'lundi à 06:45');
});

test('une dizaine de réveils dans la journée, triés par heure', () => {
  const list = Array.from({ length: 10 }, (_, i) => alarm({ id: `r${i}`, minutes: (20 - i) * 60, days: ALL_WEEK, title: `R${i}` }));
  assert.equal(countOn(list, NOW, NOW), 10);
  assert.deepEqual(sortAlarms(list).map((a) => a.minutes)[0], 11 * 60);
  // un « une fois » de 6:45 sonne demain, pas aujourd'hui
  assert.equal(countOn([alarm()], NOW, NOW), 0);
  assert.equal(countOn([alarm()], new Date(2026, 10, 13), NOW), 1);
});

test('le téléphone ne reçoit que les réveils allumés, avec heure et minute', () => {
  const out = toNative([alarm({ minutes: 6 * 60 + 47, days: [4, 0, 0] }), alarm({ id: 'off', on: false }), alarm({ id: 'b', title: '  ' })]);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { id: 'a', hour: 6, minute: 47, days: [0, 4], title: 'Réveil', sound: 'app:douceur' });
  assert.equal(out[1].title, 'Réveil');
});

test('un réveil « une fois » qui a sonné s’éteint, un réveil répété reste allumé', () => {
  const list = [alarm({ id: 'once' }), alarm({ id: 'rep', days: ALL_WEEK })];
  const after = turnOffFired(list, ['once', 'rep']);
  assert.equal(after[0].on, false);
  assert.equal(after[1].on, true);
  assert.equal(turnOffFired(list, []), list);
});

test('nom du son : son de l’appli ou sonnerie du téléphone', () => {
  assert.equal(soundLabel({ sound: 'app:cloche' }), 'Cloche');
  assert.equal(soundLabel({ sound: 'uri:content://x', soundLabel: 'Argon' }), 'Argon');
  assert.equal(soundLabel({ sound: 'uri:content://x' }), 'Sonnerie du téléphone');
});

test('nouveau réveil : le soir, 7:00 le lendemain ; la journée, dans environ une heure', () => {
  assert.equal(newAlarm(new Date(2026, 10, 12, 22, 10), 'n').minutes, 7 * 60);
  assert.equal(newAlarm(NOW, 'n').minutes, 9 * 60 + 50);
  assert.deepEqual(newAlarm(NOW, 'n').days, []);
});
