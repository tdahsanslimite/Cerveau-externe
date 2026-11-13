/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshot, widgetToday } from './model.ts';
import type { CalendarEvent } from '../calendar/model.ts';

const ev = (o: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'x', title: 'X', date: '2026-11-13', start: 9 * 60, durationMin: 60, category: 'perso', repeat: 'none', kinds: ['rdv'], ...o,
});

test('widget : instantané de 8 jours, rappels à partir de leur jour, jour hors instantané signalé', () => {
  const events = [
    ev({ id: 'k', title: 'Kiné', start: 10 * 60, doneDays: ['2026-11-13'] }),
    ev({ id: 'v', title: 'Anniversaire Max', start: null }),
    ev({ id: 't', title: 'Trampo', start: 18 * 60, repeat: 'daily', date: '2026-11-01' }),
    ev({ id: 'r', title: 'Impôts', start: null, kinds: ['rappel'], date: '2026-11-15', butoir: '2026-11-20' }),
    ev({ id: 'h', title: 'Vieux rappel', start: null, kinds: ['rappel'], date: '2026-11-01', handled: true }),
  ];
  const snap = buildSnapshot(events, '2026-11-13', () => '#123456', 'Finir le devis', 1);
  assert.equal(Object.keys(snap.days).length, 8);
  assert.deepEqual(snap.days['2026-11-13'].map((l) => [l.time, l.title, l.done]), [[null, 'Anniversaire Max', false], ['10:00', 'Kiné', true], ['18:00', 'Trampo', false]]);
  assert.deepEqual(snap.days['2026-11-20'].map((l) => l.title), ['Trampo']);
  assert.deepEqual(widgetToday(snap, '2026-11-14').rappels, []);                 // pas encore
  assert.deepEqual(widgetToday(snap, '2026-11-16').rappels.map((r) => r.title), ['Impôts']);
  assert.equal(widgetToday(snap, '2026-11-13').oneThing, 'Finir le devis');
  assert.equal(widgetToday(snap, '2026-11-25').stale, true);
  assert.equal(widgetToday(null, '2026-11-13').stale, true);
});
