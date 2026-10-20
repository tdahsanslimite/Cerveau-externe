import test from 'node:test';
import assert from 'node:assert/strict';
import { ALARM_PHRASES, pickPhrase } from './phrases.ts';
import { planReminders, splitByAlarm } from './reminders.ts';
import type { CalendarEvent } from './model.ts';

test('pickPhrase : tire dans la liste selon le hasard donné', () => {
  assert.equal(pickPhrase(['a', 'b', 'c'], () => 0), 'a');
  assert.equal(pickPhrase(['a', 'b', 'c'], () => 0.5), 'b');
  assert.equal(pickPhrase(['a', 'b', 'c'], () => 0.999999), 'c');
});

test('pickPhrase : ne répète jamais la phrase précédente (liste de 2 ou plus)', () => {
  for (const r of [0, 0.3, 0.6, 0.99]) {
    assert.notEqual(pickPhrase(['a', 'b', 'c'], () => r, 'b'), 'b');
  }
  assert.equal(pickPhrase(['seule'], () => 0.5, 'seule'), 'seule');
});

test('pickPhrase : liste vide = texte vide, et les phrases d’essai sont au nombre de 3', () => {
  assert.equal(pickPhrase([]), '');
  assert.equal(ALARM_PHRASES.length, 3);
});

test('splitByAlarm : les rappels « alarme » sont séparés des autres', () => {
  const base: CalendarEvent = {
    id: 'e1', title: 'Rdv médical', date: '2026-10-25', start: 10 * 60, durationMin: 30, category: 'sante', repeat: 'none',
    reminders: [{ amount: 30, unit: 'min' }], alert: 'alarme',
  } as CalendarEvent;
  const other = { ...base, id: 'e2', title: 'Courses', alert: 'carillon' } as CalendarEvent;
  const plan = planReminders([base, other], new Date('2026-10-20T08:00:00'), '2026-10-20', 'sonnerie');
  const { alarms, others } = splitByAlarm(plan);
  assert.equal(alarms.length, 1);
  assert.equal(others.length, 1);
  assert.match(alarms[0].title, /Rdv médical/);
  assert.equal(others[0].alert, 'carillon');
});
