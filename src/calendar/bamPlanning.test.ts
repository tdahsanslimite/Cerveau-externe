/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coveredDays, isoWeek, shiftsToRaws, tokenEmployeId, tokenExpiry, weeksAround } from './bamPlanning.ts';
import type { BamShift } from './bamPlanning.ts';
import { applyBamImport, bamKeyOf } from './bamImport.ts';
import { detailsOf, isEmptyOps, planMirror } from './bamMirror.ts';
import type { RawPhoneEvent } from './phoneEvents.ts';

process.env.TZ = 'Europe/Paris';
const ME = '8afb9942';
const s = (p: Partial<BamShift>): BamShift => ({
  id: 'x', employe_id: ME, date: '2026-11-24T00:00:00.000Z', heure_debut: '14:30', heure_fin: '21:00', type: 'W', zone: 'Salle', site: 'BAM73', ...p,
});

test('semaines ISO comme le site BAM (S48 = 23 → 29 nov. 2026, 2026 a 53 semaines)', () => {
  assert.deepEqual(isoWeek('2026-11-24'), { annee: 2026, semaine: 48, monday: '2026-11-23' });
  assert.deepEqual(isoWeek('2026-12-31'), { annee: 2026, semaine: 53, monday: '2026-12-28' });
  assert.deepEqual(isoWeek('2027-01-04'), { annee: 2027, semaine: 1, monday: '2027-01-04' });
  assert.equal(isoWeek('2026-06-30').semaine, 27);
  const w = weeksAround('2026-11-24', 1, 2);
  assert.deepEqual(w.map((x) => x.semaine), [47, 48, 49, 50]);
});

test('mes créneaux seulement, titre « BAM Chambéry · Salle », marque bam-shift, brouillons ignorés', () => {
  const raws = shiftsToRaws([
    s({ id: 'a' }),
    s({ id: 'b', employe_id: 'autre' }),
    s({ id: 'c', is_draft: true }),
    s({ id: 'd', site: 'BAM74', zone: null, date: '2026-10-20T00:00:00.000Z', heure_debut: '09:30', heure_fin: '13:00' }),
  ], ME);
  assert.equal(raws.length, 2);
  const [a, d] = raws;
  assert.equal(a.title, 'BAM Chambéry · Salle');
  assert.equal(bamKeyOf(a), 'shift:a');
  assert.equal(new Date(a.startDate).getHours(), 14);
  assert.equal(new Date(a.endDate).getMinutes(), 0);
  assert.equal(d.title, 'BAM Annecy');
});

test('congés : jours consécutifs (des deux salles) regroupés en un bandeau, même marque que Google', () => {
  const raws = shiftsToRaws([
    s({ id: 'c1', type: 'CP', heure_debut: null, heure_fin: null, date: '2026-12-11T00:00:00.000Z' }),
    s({ id: 'c2', type: 'CP', heure_debut: null, heure_fin: null, date: '2026-12-12T00:00:00.000Z', site: 'BAM74' }),
    s({ id: 'c3', type: 'CP', heure_debut: null, heure_fin: null, date: '2026-12-12T00:00:00.000Z' }),
    s({ id: 'c4', type: 'CP', heure_debut: null, heure_fin: null, date: '2026-12-13T00:00:00.000Z' }),
  ], ME);
  assert.equal(raws.length, 1);
  assert.equal(bamKeyOf(raws[0]), 'cp:2026-12-11..2026-12-13');
  assert.equal(raws[0].allDay, true);
  assert.equal(raws[0].title, 'BAM · Congés payés');
});

test('lecture du site → import dans Travail ; semaine pas publiée = rien retiré', () => {
  const read = shiftsToRaws([s({ id: 'a' }), s({ id: 'b', date: '2026-12-15T00:00:00.000Z' })], ME);
  const covered = coveredDays([{ monday: '2026-11-23', published: true }, { monday: '2026-12-14', published: true }]);
  const first = applyBamImport({ events: [], domains: [{ id: 'travail', label: 'Travail', color: '#000' }], deleted: [], raws: read, today: '2026-11-23', readUntil: '2026-11-23', isCovered: (d) => covered.has(d) });
  assert.equal(first.events.length, 2);
  assert.ok(first.events.every((e) => e.category === 'travail'));
  // Plus tard, la semaine du 14 déc. n'est plus publiée (0 créneau) : le créneau b reste.
  const later = coveredDays([{ monday: '2026-11-23', published: true }, { monday: '2026-12-14', published: false }]);
  const second = applyBamImport({ events: first.events, domains: [{ id: 'travail', label: 'Travail', color: '#000' }], deleted: [], raws: [read[0]], today: '2026-11-23', readUntil: '2026-11-23', isCovered: (d) => later.has(d) });
  assert.equal(second.events.length, 2);
});

test('jeton BAM : expiration et employé lus dans le JWT', () => {
  const payload = Buffer.from(JSON.stringify({ employeId: ME, exp: 1797962112 })).toString('base64url');
  const token = `xx.${payload}.yy`;
  assert.equal(tokenExpiry(token), 1797962112000);
  assert.equal(tokenEmployeId(token), ME);
  assert.equal(tokenExpiry('pas-un-jeton'), 0);
});

// ---- Recopie dans Google Agenda ----
const domains = [{ id: 'travail', label: 'Travail', color: '#000' }];
const imported = (raws: RawPhoneEvent[]) =>
  applyBamImport({ events: [], domains, deleted: [], raws, today: '2026-11-23', readUntil: '2027-01-01' }).events;
const google = (from: RawPhoneEvent, id: string, over: Partial<RawPhoneEvent> = {}): RawPhoneEvent => ({ ...from, id, calendarId: 'g', ...over });

test('recopie : crée ce qui manque à partir d’aujourd’hui, jamais le passé', () => {
  const raws = shiftsToRaws([s({ id: 'past', date: '2026-11-20T00:00:00.000Z' }), s({ id: 'a' })], ME);
  const ops = planMirror(imported(raws), [], '2026-11-23');
  assert.equal(ops.create.length, 1);
  assert.equal(ops.create[0].title, 'BAM Chambéry · Salle');
  assert.match(ops.create[0].notes, /bam-shift:a/);
  assert.equal(ops.create[0].startDate.getHours(), 14);
  assert.equal(ops.create[0].location, 'BAM Chambéry');
});

test('recopie : déjà identique = rien ; horaire changé dans LCE = mise à jour ; créneau supprimé = retiré ; doublon retiré', () => {
  const raws = shiftsToRaws([s({ id: 'a' }), s({ id: 'b', date: '2026-11-25T00:00:00.000Z' })], ME);
  const evs = imported(raws);
  const [ga, gb] = evs.map((e) => detailsOf(e)!);
  const same: RawPhoneEvent[] = [
    { id: 'g1', calendarId: 'g', title: ga.title, startDate: ga.startDate, endDate: ga.endDate, allDay: false, notes: ga.notes },
    { id: 'g2', calendarId: 'g', title: gb.title, startDate: gb.startDate, endDate: gb.endDate, allDay: false, notes: gb.notes },
  ];
  assert.ok(isEmptyOps(planMirror(evs, same, '2026-11-23')));

  const moved = evs.map((e) => (e.bam?.key === 'shift:a' ? { ...e, start: 15 * 60 } : e));
  const ops = planMirror(moved, same, '2026-11-23');
  assert.deepEqual(ops.update.map((u) => u.id), ['g1']);
  assert.equal(ops.update[0].details.startDate.getHours(), 15);

  const gone = planMirror(evs.filter((e) => e.bam?.key !== 'shift:b'), same, '2026-11-23');
  assert.deepEqual(gone.remove, ['g2']);

  const dup = planMirror(evs, [...same, google(same[0], 'g3')], '2026-11-23');
  assert.deepEqual(dup.remove, ['g3']);
});

test('recopie : congés en journée entière à minuit UTC ; les événements Google sans marque ne sont jamais touchés', () => {
  const raws = shiftsToRaws([s({ id: 'c', type: 'CP', heure_debut: null, heure_fin: null, date: '2026-12-11T00:00:00.000Z' })], ME);
  const ops = planMirror(imported(raws), [{ id: 'kine', calendarId: 'g', title: 'Kiné', startDate: new Date(2026, 11, 1, 10), endDate: new Date(2026, 11, 1, 11), allDay: false, notes: '' }], '2026-11-23');
  assert.equal(ops.create.length, 1);
  assert.equal(ops.create[0].allDay, true);
  assert.equal(ops.create[0].startDate.toISOString(), '2026-12-11T00:00:00.000Z');
  assert.equal(ops.create[0].endDate.toISOString(), '2026-12-12T00:00:00.000Z');
  assert.deepEqual(ops.remove, []);
});
