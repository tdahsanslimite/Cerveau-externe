/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthDays } from '../calendar/dates.ts';
import { fitColWidth, fitRowHeight } from './tableLayout.ts';
import { ALERT_AFTER, ALL_WEEK, overdueRoutines, canCheck, dayProgress, daysLabel, isDone, isDue, monthReport, routineMonth, routinesOn, toggleDone } from './model.ts';
import type { DoneMap, Routine } from './model.ts';

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'r1', title: 'Médicament', moment: 'matin', days: ALL_WEEK, start: '2026-10-01', ...over,
});

test('jours d’un mois, bissextile compris', () => {
  assert.equal(monthDays('2026-10-15').length, 31);
  assert.equal(monthDays('2026-10-15')[0], '2026-10-01');
  assert.equal(monthDays('2026-10-15')[30], '2026-10-31');
  assert.equal(monthDays('2028-02-10').length, 29);
  assert.equal(monthDays('2027-02-10').length, 28);
});

test('une routine existe entre son début et son retrait, et passe d’un mois à l’autre toute seule', () => {
  const r = routine({ start: '2026-09-20' });
  assert.equal(isDue(r, '2026-09-19'), false);
  assert.equal(isDue(r, '2026-09-20'), true);
  assert.equal(isDue(r, '2026-10-01'), true); // le mois suivant, sans recopie
  const retired = routine({ start: '2026-09-20', end: '2026-10-14' });
  assert.equal(isDue(retired, '2026-10-14'), true);
  assert.equal(isDue(retired, '2026-10-15'), false); // retirée : plus de liste…
  assert.equal(isDue(retired, '2026-09-25'), true); // …mais le passé reste intact
});

test('jours de la semaine choisis', () => {
  const sport = routine({ days: [0, 2, 4] }); // lun, mer, ven
  assert.equal(isDue(sport, '2026-10-12'), true); // lundi
  assert.equal(isDue(sport, '2026-10-13'), false); // mardi
  assert.equal(isDue(sport, '2026-10-14'), true); // mercredi
});

test('liste du jour : matin, journée, soir, puis ordre de création', () => {
  const list = [
    routine({ id: 'a', title: 'Soir 1', moment: 'soir' }),
    routine({ id: 'b', title: 'Matin 1', moment: 'matin' }),
    routine({ id: 'c', title: 'Journée', moment: 'journee' }),
    routine({ id: 'd', title: 'Matin 2', moment: 'matin' }),
    routine({ id: 'e', title: 'Pas lundi', moment: 'matin', days: [1] }),
  ];
  assert.deepEqual(routinesOn(list, '2026-10-12').map((r) => r.id), ['b', 'd', 'c', 'a']);
});

test('cocher et décocher sans toucher à l’original', () => {
  const start: DoneMap = {};
  const a = toggleDone(start, '2026-10-15', 'r1');
  assert.deepEqual(a, { '2026-10-15': ['r1'] });
  assert.deepEqual(start, {});
  const b = toggleDone(a, '2026-10-15', 'r2');
  assert.deepEqual(b['2026-10-15'], ['r1', 'r2']);
  const c = toggleDone(toggleDone(b, '2026-10-15', 'r1'), '2026-10-15', 'r2');
  assert.deepEqual(c, {}); // plus de jour vide qui traîne
  assert.equal(isDone(a, '2026-10-15', 'r1'), true);
  assert.equal(isDone(a, '2026-10-16', 'r1'), false);
});

test('libellé des jours', () => {
  assert.equal(daysLabel(ALL_WEEK), 'Tous les jours');
  assert.equal(daysLabel([4, 0, 1, 2, 3]), 'Lun – ven');
  assert.equal(daysLabel([6, 5]), 'Week-end');
  assert.equal(daysLabel([4, 0, 2]), 'Lun, Mer, Ven');
});

test('on ne coche pas à l’avance', () => {
  assert.equal(canCheck('2026-10-14', '2026-10-15'), true);
  assert.equal(canCheck('2026-10-15', '2026-10-15'), true);
  assert.equal(canCheck('2026-10-16', '2026-10-15'), false);
});

test('avancement du jour', () => {
  const list = [routine({ id: 'a' }), routine({ id: 'b' }), routine({ id: 'c', days: [6] })];
  const done = toggleDone({}, '2026-10-15', 'a'); // jeudi : c n'est pas prévue
  assert.deepEqual(dayProgress(list, done, '2026-10-15'), { done: 1, total: 2 });
});

test('bilan : aujourd’hui non coché n’est pas un oubli', () => {
  const r = routine({ start: '2026-10-01' });
  let done: DoneMap = {};
  for (const d of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']) {
    done = toggleDone(done, d, 'r1');
  }
  const m = routineMonth(r, done, '2026-10-15', '2026-10-10');
  // 1er → 9 : 9 jours écoulés, 7 cochés ; le 10 (aujourd'hui) n'est pas encore compté
  assert.equal(m.planned, 9);
  assert.equal(m.done, 7);
  assert.equal(m.bestRun, 4); // du 5 au 8 (le 4 manque)
  assert.equal(m.cells.find((c) => c.day === '2026-10-10')?.state, 'upcoming');
  assert.equal(m.cells.find((c) => c.day === '2026-10-04')?.state, 'missed');
  assert.equal(m.cells.find((c) => c.day === '2026-10-20')?.state, 'upcoming');

  // Aujourd'hui coché : il compte.
  const m2 = routineMonth(r, toggleDone(done, '2026-10-10', 'r1'), '2026-10-15', '2026-10-10');
  assert.equal(m2.planned, 10);
  assert.equal(m2.done, 8);
});

test('bilan : une série n’est pas cassée par un jour non prévu', () => {
  const r = routine({ days: [0, 2, 4] }); // lun, mer, ven
  let done: DoneMap = {};
  for (const d of ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12']) done = toggleDone(done, d, 'r1'); // lun, mer, ven, lun
  const m = routineMonth(r, done, '2026-10-15', '2026-10-13');
  assert.equal(m.bestRun, 4);
});

test('bilan du mois : seulement les routines qui existaient', () => {
  const old = routine({ id: 'old', start: '2026-08-01', end: '2026-09-15' });
  const current = routine({ id: 'cur', start: '2026-09-01' });
  const recent = routine({ id: 'new', start: '2026-10-20' });
  const sept = monthReport([old, current, recent], {}, '2026-09-10', '2026-10-15').map((m) => m.routine.id);
  assert.deepEqual(sept, ['old', 'cur']);
  const oct = monthReport([old, current, recent], {}, '2026-10-10', '2026-10-15').map((m) => m.routine.id);
  assert.deepEqual(oct, ['cur', 'new']);
});

test('bilan : une case par jour du mois, dans l’ordre, et colonnes dans l’ordre de la liste du jour', () => {
  const soir = routine({ id: 's', moment: 'soir' });
  const matin1 = routine({ id: 'm1', moment: 'matin' });
  const matin2 = routine({ id: 'm2', moment: 'matin' });
  const days = monthDays('2026-10-15');
  const report = monthReport([soir, matin1, matin2], {}, '2026-10-15', '2026-10-15');
  assert.deepEqual(report.map((m) => m.routine.id), ['m1', 'm2', 's']);
  for (const m of report) {
    assert.equal(m.cells.length, days.length);
    assert.deepEqual(m.cells.map((c) => c.day), days);
  }
});

test('tableau : hauteur de ligne ajustée au mois, bornée', () => {
  assert.equal(fitRowHeight(640, 64, 31, 18, 40), 18); // 576 / 31 = 18,58 → 18 : tient sans défiler
  assert.equal(fitRowHeight(755, 64, 31, 18, 40), 22);
  assert.equal(fitRowHeight(2000, 64, 28, 18, 40), 40); // grand écran : plafonné
  assert.equal(fitRowHeight(300, 64, 31, 18, 40), 18); // petit écran : plancher (le tableau défilera)
});

test('tableau : largeur de colonne ; s’il faut défiler, une demi-colonne dépasse', () => {
  assert.equal(fitColWidth(300, 3, 50), 100);
  assert.equal(fitColWidth(300, 5, 50), 60); // tout tient
  assert.equal(fitColWidth(300, 6, 50), 50); // tout tient, pile
  assert.equal(fitColWidth(300, 0, 50), 50);
  for (const cols of [7, 9, 15]) {
    const w = fitColWidth(300, cols, 50);
    assert.ok(w >= 50, 'jamais plus étroit que le minimum');
    assert.ok(cols * w > 300, 'il faut défiler');
    assert.ok(Math.abs((300 / w) % 1 - 0.5) < 0.1, 'une demi-colonne est visible à droite');
  }
});

test('pastille : matin après midi, journée après 18 h, soir après 22 h', () => {
  const list = [
    routine({ id: 'm', moment: 'matin' }),
    routine({ id: 'j', moment: 'journee' }),
    routine({ id: 's', moment: 'soir' }),
  ];
  const day = '2026-10-21';
  const at = (h: number, min = 0, done: DoneMap = {}) => overdueRoutines(list, done, day, h * 60 + min).map((r) => r.id);
  assert.deepEqual(ALERT_AFTER, { matin: 720, journee: 1080, soir: 1320 });
  assert.deepEqual(at(8), []);
  assert.deepEqual(at(11, 59), []);
  assert.deepEqual(at(12), ['m']);
  assert.deepEqual(at(17, 59), ['m']);
  assert.deepEqual(at(18), ['m', 'j']); // les retards s'additionnent
  assert.deepEqual(at(22), ['m', 'j', 's']);
  assert.deepEqual(at(23, 59), ['m', 'j', 's']);
});

test('pastille : elle disparaît quand c’est coché, et revient au moment suivant', () => {
  const list = [routine({ id: 'm', moment: 'matin' }), routine({ id: 'j', moment: 'journee' }), routine({ id: 's', moment: 'soir' })];
  const day = '2026-10-21';
  let done: DoneMap = toggleDone({}, day, 'm');
  assert.equal(overdueRoutines(list, done, day, 13 * 60).length, 0); // matin fait : plus de pastille à 13 h
  assert.deepEqual(overdueRoutines(list, done, day, 18 * 60).map((r) => r.id), ['j']); // elle revient à 18 h
  done = toggleDone(done, day, 'j');
  assert.equal(overdueRoutines(list, done, day, 20 * 60).length, 0);
  assert.deepEqual(overdueRoutines(list, done, day, 22 * 60).map((r) => r.id), ['s']); // et à 22 h
  done = toggleDone(done, day, 's');
  assert.equal(overdueRoutines(list, done, day, 23 * 60).length, 0);
});

test('pastille : seulement les routines réellement prévues aujourd’hui', () => {
  const day = '2026-10-21'; // mercredi
  const list = [
    routine({ id: 'lun', days: [0] }), // pas un mercredi
    routine({ id: 'demain', start: '2026-10-22' }), // commence demain
    routine({ id: 'retiree', end: '2026-10-20' }), // retirée hier
    routine({ id: 'ok', days: [2] }),
  ];
  assert.deepEqual(overdueRoutines(list, {}, day, 13 * 60).map((r) => r.id), ['ok']);
  // Une coche faite un autre jour ne compte pas pour aujourd'hui.
  assert.deepEqual(overdueRoutines(list, toggleDone({}, '2026-10-20', 'ok'), day, 13 * 60).map((r) => r.id), ['ok']);
});
