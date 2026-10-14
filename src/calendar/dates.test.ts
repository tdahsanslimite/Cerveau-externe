/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addMonths, isoWeek, monthGrid, startOfWeek, weekdayIndex, labelWeekRange, relativeLabel, minutesToLabel, durationLabel } from './dates.ts';
import { occursOn, occurrencesOn, loadLevel, freeSlots } from './model.ts';
import type { CalendarEvent } from './model.ts';

test('navigation entre jours, y compris changement de mois, d’année et heure d’été', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30'); // passage à l'heure d'été
  assert.equal(addDays('2026-10-24', 2), '2026-10-26'); // retour à l'heure d'hiver
});

test('ajout de mois borné au dernier jour', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-10-13', -1), '2026-09-13');
  assert.equal(addMonths('2026-12-15', 1), '2027-01-15');
});

test('semaine qui commence le lundi', () => {
  assert.equal(weekdayIndex('2026-10-12'), 0); // lundi
  assert.equal(weekdayIndex('2026-10-18'), 6); // dimanche
  assert.equal(startOfWeek('2026-10-18'), '2026-10-12');
  assert.equal(isoWeek('2026-10-13'), 42);
  assert.equal(isoWeek('2027-01-01'), 53);
  assert.equal(labelWeekRange('2026-10-13'), '12 – 18 oct.');
  assert.equal(labelWeekRange('2026-10-28'), '26 oct. – 1 nov.');
});

test('grille du mois en semaines complètes', () => {
  const oct = monthGrid('2026-10-13');
  assert.equal(oct.length % 7, 0);
  assert.equal(oct[0].key, '2026-09-28');
  assert.equal(oct.filter((c) => c.inMonth).length, 31);
  const feb = monthGrid('2027-02-10'); // février 2027 : du lundi 1er au dimanche 28
  assert.equal(feb.length, 28);
});

test('libellés', () => {
  assert.equal(relativeLabel('2026-10-14', '2026-10-13'), 'Demain');
  assert.equal(relativeLabel('2026-10-20', '2026-10-13'), null);
  assert.equal(minutesToLabel(9 * 60 + 5), '09:05');
  assert.equal(durationLabel(90), '1 h 30');
  assert.equal(durationLabel(45), '45 min');
});

const ev = (o: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'x', title: 'Test', date: '2026-10-13', start: 600, durationMin: 60, category: 'travail', repeat: 'none', ...o,
});

test('récurrences', () => {
  const weekly = ev({ repeat: 'weekly' });
  assert.ok(occursOn(weekly, '2026-10-20'));
  assert.ok(!occursOn(weekly, '2026-10-21'));
  assert.ok(!occursOn(weekly, '2026-10-06')); // avant le début
  const wd = ev({ repeat: 'weekdays' });
  assert.ok(occursOn(wd, '2026-10-16'));
  assert.ok(!occursOn(wd, '2026-10-17'));
  const skipped = ev({ repeat: 'daily', skipped: ['2026-10-15'] });
  assert.ok(!occursOn(skipped, '2026-10-15'));
  assert.ok(occursOn(skipped, '2026-10-16'));
});

test('tri des occurrences : journée entière puis heure', () => {
  const list = occurrencesOn([
    ev({ id: 'b', title: 'Soir', start: 1200 }),
    ev({ id: 'a', title: 'Anniv', start: null }),
    ev({ id: 'c', title: 'Matin', start: 480 }),
  ], '2026-10-13');
  assert.deepEqual(list.map((o) => o.event.id), ['a', 'c', 'b']);
});

test('charge du jour relative à la limite', () => {
  assert.equal(loadLevel(0, 6), 'vide');
  assert.equal(loadLevel(2, 6), 'legere');
  assert.equal(loadLevel(5, 6), 'equilibree');
  assert.equal(loadLevel(6, 6), 'chargee');
  assert.equal(loadLevel(7, 6), 'trop');
});

test('créneaux libres, avec chevauchement', () => {
  const occs = occurrencesOn([
    ev({ id: '1', start: 9 * 60, durationMin: 120 }),      // 9h-11h
    ev({ id: '2', start: 10 * 60, durationMin: 90 }),      // 10h-11h30 (chevauche)
    ev({ id: '3', start: 12 * 60, durationMin: 60 }),      // 12h-13h (trou de 30 min avant : ignoré)
    ev({ id: '4', start: 17 * 60, durationMin: 120 }),     // 17h-19h
    ev({ id: '5', start: null }),                          // journée : ignoré
  ], '2026-10-13');
  assert.deepEqual(freeSlots(occs), [
    { from: 8 * 60, to: 9 * 60 },
    { from: 13 * 60, to: 17 * 60 },
    { from: 19 * 60, to: 21 * 60 },
  ]);
  assert.deepEqual(freeSlots([]), [{ from: 480, to: 1260 }]);
});
