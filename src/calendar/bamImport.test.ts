/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBamImport, bamKeyOf, markBamEdit, workDomainOf } from './bamImport.ts';
import type { RawPhoneEvent } from './phoneEvents.ts';
import { hoursByDomain, isCheckable } from './model.ts';
import type { CalendarEvent, Domain } from './model.ts';

process.env.TZ = 'Europe/Paris';

const domains: Domain[] = [
  { id: 'perso', label: 'Perso', color: '#6B7178' },
  { id: 'travail', label: 'Travail', color: '#2F63B0' },
];
const shift = (id: string, day: number, h1: number, m1: number, h2: number, m2: number, title = 'BAM Chambéry · Salle'): RawPhoneEvent => ({
  id: `raw-${id}`,
  calendarId: '1',
  title,
  startDate: new Date(2026, 10, day, h1, m1),
  endDate: new Date(2026, 10, day, h2, m2),
  allDay: false,
  notes: `Planning BAM (synchro auto)\nbam-shift:${id}`,
});
const base = { domains, deleted: [] as string[], today: '2026-11-23', readUntil: '2027-05-25' };
const run = (events: CalendarEvent[], raws: RawPhoneEvent[], extra: Partial<typeof base> = {}) =>
  applyBamImport({ ...base, ...extra, events, raws });

test('reconnaît les marques BAM et ignore le reste', () => {
  assert.equal(bamKeyOf({ notes: 'Planning BAM (synchro auto)\nbam-shift:4dc9612b-0eff' }), 'shift:4dc9612b-0eff');
  assert.equal(bamKeyOf({ notes: 'bam-cp:2026-12-11..2026-12-13' }), 'cp:2026-12-11..2026-12-13');
  assert.equal(bamKeyOf({ notes: 'Appel découverte' }), null);
  assert.equal(bamKeyOf({}), null);
});

test('un créneau BAM devient un vrai créneau Travail, cochable, compté dans les heures Travail', () => {
  const res = run([], [shift('a', 24, 14, 30, 21, 0)]);
  assert.equal(res.changed, true);
  const [e] = res.events;
  assert.equal(e.category, 'travail');
  assert.equal(e.date, '2026-11-24');
  assert.equal(e.start, 14 * 60 + 30);
  assert.equal(e.durationMin, 390);
  assert.equal(e.phone, undefined);
  assert.deepEqual(e.bam, { key: 'shift:a' });
  assert.equal(isCheckable(e), true);
  assert.ok(res.importedRawIds.has('raw-a'));
  const hours = hoursByDomain(res.events, '2026-11-24', '2026-11-24', '2026-11-30');
  assert.equal(hours.travail?.done, 390);
});

test('deuxième passage sans changement : rien à écrire', () => {
  const first = run([], [shift('a', 24, 14, 30, 21, 0)]);
  const second = run(first.events, [shift('a', 24, 14, 30, 21, 0)]);
  assert.equal(second.changed, false);
  assert.equal(second.events.length, 1);
});

test('le planning bouge : heures mises à jour, coche et note gardées', () => {
  const [e] = run([], [shift('a', 24, 14, 30, 21, 0)]).events;
  const mine = { ...e, doneDays: ['2026-11-24'], note: 'clés du local' };
  const res = run([mine], [shift('a', 24, 15, 0, 21, 10)]);
  assert.equal(res.changed, true);
  assert.equal(res.events[0].start, 15 * 60);
  assert.equal(res.events[0].durationMin, 370);
  assert.deepEqual(res.events[0].doneDays, ['2026-11-24']);
  assert.equal(res.events[0].note, 'clés du local');
});

test('modifié à la main : le planning n’y touche plus', () => {
  const [e] = run([], [shift('a', 24, 14, 30, 21, 0)]).events;
  const edited = markBamEdit(e, { ...e, start: 15 * 60 });
  assert.equal(edited.bam?.edited, true);
  const res = run([edited], [shift('a', 24, 16, 0, 21, 0)]);
  assert.equal(res.events[0].start, 15 * 60);
  // cocher ou ajouter une note n'est pas « modifier l'horaire »
  assert.equal(markBamEdit(e, { ...e, note: 'x' }).bam?.edited, undefined);
});

test('supprimé à la main : jamais recréé', () => {
  const res = run([], [shift('a', 24, 14, 30, 21, 0)], { deleted: ['shift:a'] });
  assert.equal(res.events.length, 0);
  assert.ok(res.importedRawIds.has('raw-a')); // ni en double en lecture seule
});

test('retiré du planning : supprimé s’il est à venir, gardé s’il est passé, coché ou modifié', () => {
  const evs = run([], [shift('past', 20, 14, 0, 18, 0), shift('fut', 25, 9, 30, 13, 0), shift('done', 26, 9, 0, 12, 0)]).events;
  const marked = evs.map((e) => (e.bam?.key === 'shift:done' ? { ...e, doneDays: ['2026-11-26'] } : e));
  const res = run(marked, []);
  assert.deepEqual(res.events.map((e) => e.bam?.key).sort(), ['shift:done', 'shift:past']);
});

test('congés payés : bandeau journée entière sur plusieurs jours, dans Travail, sans heures', () => {
  const cp: RawPhoneEvent = {
    id: 'raw-cp', calendarId: '1', title: 'BAM · Congés payés', allDay: true,
    startDate: '2026-12-11T00:00:00.000Z', endDate: '2026-12-14T00:00:00.000Z',
    notes: 'Planning BAM (synchro auto)\nbam-cp:2026-12-11..2026-12-13',
  };
  const [e] = run([], [cp]).events;
  assert.equal(e.start, null);
  assert.equal(e.date, '2026-12-11');
  assert.equal(e.endDate, '2026-12-13');
  assert.equal(e.nature, 'evenement');
  assert.equal(e.category, 'travail');
});

test('domaine Travail : retrouvé par son nom, sinon créé', () => {
  assert.equal(workDomainOf([{ id: 'x1', label: 'travail ', color: '#000' }])?.id, 'x1');
  const res = applyBamImport({ ...base, domains: [{ id: 'perso', label: 'Perso', color: '#000' }], events: [], raws: [shift('a', 24, 9, 0, 12, 0)] });
  assert.equal(res.addedDomain?.id, 'travail');
  assert.equal(res.events[0].category, 'travail');
});

test('les autres événements de l’appli ne sont jamais touchés', () => {
  const mine: CalendarEvent = { id: 'm', title: 'Kiné', date: '2026-11-25', start: 600, durationMin: 30, category: 'perso', repeat: 'none' };
  const res = run([mine], []);
  assert.equal(res.changed, false);
  assert.deepEqual(res.events, [mine]);
});
