/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneEventsToCalendar, toCalendarEvents } from './phoneEvents.ts';
import { findConflict, occursOn } from './model.ts';

process.env.TZ = 'Europe/Paris';
const cal = { id: '7', title: 'Google · Valentin', color: '#4285F4', account: 'v@gmail.com' };

test('rendez-vous Calendly avec heure → événement en lecture seule', () => {
  const [e] = toCalendarEvents({ id: '1', calendarId: '7', title: 'Appel découverte TDAH', startDate: new Date(2026, 9, 27, 14, 0), endDate: new Date(2026, 9, 27, 14, 45), allDay: false }, cal);
  assert.equal(e.date, '2026-10-27');
  assert.equal(e.start, 14 * 60);
  assert.equal(e.durationMin, 45);
  assert.deepEqual(e.kinds, ['rdv']);
  assert.equal(e.category, 'phone:7');
  assert.equal(e.phone?.calendarTitle, 'Google · Valentin');
});

test('journée entière (minuit UTC, fin exclue) sur plusieurs jours', () => {
  const [e] = toCalendarEvents({ id: '2', calendarId: '7', title: 'Congés', startDate: '2026-11-02T00:00:00.000Z', endDate: '2026-11-09T00:00:00.000Z', allDay: true }, cal);
  assert.equal(e.start, null);
  assert.equal(e.date, '2026-11-02');
  assert.equal(e.endDate, '2026-11-08');
  const [one] = toCalendarEvents({ id: '3', calendarId: '7', title: 'Anniversaire', startDate: '2026-11-12T00:00:00.000Z', endDate: '2026-11-13T00:00:00.000Z', allDay: true }, cal);
  assert.equal(one.endDate, undefined);
});

test('créneau de nuit qui passe minuit : découpé en deux jours', () => {
  const parts = toCalendarEvents({ id: '4', calendarId: '7', title: 'Soirée trampoline', startDate: new Date(2026, 9, 30, 22, 0), endDate: new Date(2026, 9, 31, 2, 0), allDay: false }, cal);
  assert.deepEqual(parts.map((p) => [p.date, p.start, p.durationMin]), [['2026-10-30', 1320, 120], ['2026-10-31', 0, 120]]);
  assert.notEqual(parts[0].id, parts[1].id);
});

test('occurrences d’un événement répété : un id par occurrence ; agenda inconnu ignoré', () => {
  const raws = [
    { id: '9', calendarId: '7', title: 'Planning BAM', startDate: new Date(2026, 9, 26, 9), endDate: new Date(2026, 9, 26, 17), allDay: false },
    { id: '9', calendarId: '7', title: 'Planning BAM', startDate: new Date(2026, 9, 27, 9), endDate: new Date(2026, 9, 27, 17), allDay: false },
    { id: '10', calendarId: 'autre', title: 'Masqué', startDate: new Date(2026, 9, 26, 9), endDate: new Date(2026, 9, 26, 10), allDay: false },
  ];
  const list = phoneEventsToCalendar(raws, [cal]);
  assert.equal(list.length, 2);
  assert.equal(new Set(list.map((e) => e.id)).size, 2);
});

test('un rendez-vous Google bloque un rendez-vous Cerveau Externe, et une tâche aussi', () => {
  const [google] = toCalendarEvents({ id: '1', calendarId: '7', title: 'Rdv Calendly', startDate: new Date(2026, 9, 27, 14, 0), endDate: new Date(2026, 9, 27, 15, 0), allDay: false }, cal);
  const mine = { id: 'm', title: 'Tournage', date: '2026-10-27', start: 14 * 60 + 30, durationMin: 60, category: 'travail', repeat: 'none' as const };
  assert.equal(findConflict([google], mine)?.event.id, google.id);
  assert.equal(findConflict([google], { ...mine, kinds: ['tache' as const] })?.event.id, google.id);
  assert.ok(occursOn(google, '2026-10-27'));
});
