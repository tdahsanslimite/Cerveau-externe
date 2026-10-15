/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addMonths, isoWeek, monthGrid, startOfWeek, weekdayIndex, labelWeekRange, relativeLabel, minutesToLabel, durationLabel } from './dates.ts';
import { planReminders } from './reminders.ts';
import { occursOn, occurrencesOn, loadLevel, freeSlots, findConflict, nextFreeStart, minutesByDomain, reminderMinutes, reminderLabel } from './model.ts';
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

test('chevauchements : bloque, ignore la journée entière et l’événement lui-même', () => {
  const dentist = ev({ id: 'd', start: 10 * 60, durationMin: 60 });           // 10h-11h
  const trampo = ev({ id: 't', date: '2026-10-07', start: 17 * 60, durationMin: 120, repeat: 'weekly' }); // mer. 17h-19h
  const allDay = ev({ id: 'a', start: null });
  const events = [dentist, trampo, allDay];
  assert.equal(findConflict(events, ev({ id: 'n', start: 10 * 60 + 30, durationMin: 30 }))?.event.id, 'd');
  assert.equal(findConflict(events, ev({ id: 'n', start: 11 * 60, durationMin: 30 })), null); // bout à bout : OK
  assert.equal(findConflict(events, ev({ id: 'n', start: 9 * 60, durationMin: 60 })), null);
  assert.equal(findConflict(events, { ...dentist }), null); // se modifier soi-même
  // Une série hebdo du mardi qui tombe un mercredi 3 semaines plus tard ? Non : on teste un mercredi.
  const conflict = findConflict(events, ev({ id: 'n', date: '2026-10-28', start: 18 * 60, durationMin: 30 }));
  assert.equal(conflict?.event.id, 't');
  // Une nouvelle série quotidienne qui finit par croiser le trampoline du mercredi
  const daily = findConflict(events, ev({ id: 'n', date: '2026-10-13', start: 18 * 60, durationMin: 30, repeat: 'daily' }));
  assert.deepEqual([daily?.event.id, daily?.day], ['t', '2026-10-14']);
});

test('prochain créneau libre après un conflit', () => {
  const events = [ev({ id: 'd', start: 10 * 60, durationMin: 60 }), ev({ id: 'e', start: 11 * 60, durationMin: 30 })];
  assert.equal(nextFreeStart(events, ev({ id: 'n', start: 10 * 60, durationMin: 45 }), 10 * 60), 11 * 60 + 30);
});

test('heures par domaine sur une période', () => {
  const events = [
    ev({ id: '1', category: 'travail', start: 9 * 60, durationMin: 120 }),
    ev({ id: '2', category: 'sport', start: 18 * 60, durationMin: 60, repeat: 'daily' }),
    ev({ id: '3', category: 'sport', start: null }),
  ];
  assert.deepEqual(minutesByDomain(events, '2026-10-13', '2026-10-15'), { travail: 120, sport: 180 });
});

test('rappels', () => {
  assert.equal(reminderMinutes({ amount: 2, unit: 'h' }), 120);
  assert.equal(reminderMinutes({ amount: 1, unit: 'j' }), 1440);
  assert.equal(reminderLabel({ amount: 1, unit: 'j' }), '1 jour avant');
  assert.equal(reminderLabel({ amount: 30, unit: 'min' }), '30 min avant');
});

test('rappels programmés : heures exactes, objet, veille au soir, passé ignoré', () => {
  const now = new Date(2026, 9, 15, 11, 0); // jeudi 15 oct. 11:00
  const irm = ev({
    id: 'irm', title: 'IRM', date: '2026-10-16', start: 10 * 60, durationMin: 45,
    kinds: ['rdv', 'objet'], item: 'devis signé', itemEveReminder: true,
    reminders: [{ amount: 1, unit: 'h' }, { amount: 1, unit: 'j' }],
  });
  const past = ev({ id: 'p', date: '2026-10-15', start: 9 * 60, reminders: [{ amount: 30, unit: 'min' }] });
  const plan = planReminders([irm, past], now, '2026-10-15');
  const at = (p: { at: Date }) => `${p.at.getDate()} ${p.at.getHours()}:${String(p.at.getMinutes()).padStart(2, '0')}`;
  assert.deepEqual(plan.map(at), ['15 20:00', '16 9:00']); // veille 20 h ; 1 h avant. « 1 jour avant » (15 à 10:00) est déjà passé
  assert.equal(plan[0].title, 'Demain : IRM');
  assert.match(plan[0].body, /devis signé/);
  assert.equal(plan[1].title, 'IRM · 1 heure avant');
  assert.match(plan[1].body, /10:00 – 10:45\nPense à prendre : devis signé/);
});

test('rappels d’une série : une notification par occurrence', () => {
  const now = new Date(2026, 9, 15, 11, 0);
  const trampo = ev({ id: 't', date: '2026-10-14', start: 17 * 60, repeat: 'weekly', reminders: [{ amount: 30, unit: 'min' }] });
  const plan = planReminders([trampo], now, '2026-10-15');
  assert.equal(plan.length, 4); // 21, 28 oct., 4, 11 nov. (horizon 30 jours)
  assert.equal(plan[0].at.getDate(), 21);
});
