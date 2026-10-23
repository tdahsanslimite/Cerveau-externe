/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metricValue, overallAverage, recapMonth, recapMonths, recapYears, relation } from './recap.ts';
import type { EntryMap } from './model.ts';

const TODAY = '2026-10-23';

// Totaux : 10/10 = 20, 11/10 = 15 (6+5+4), 10/12 = 27, 2026-09-30 = 9, 2025-12-31 = 12.
const E: EntryMap = {
  '2025-12-31': { mood: 4, mind: 4, body: 4 },
  '2026-09-30': { mood: 3, mind: 3, body: 3, note: 'Dur.' },
  '2026-10-10': { mood: 7, mind: 7, body: 6 },
  '2026-10-11': { mood: 6, mind: 5, body: 4 },
  '2026-10-12': { mood: 9, mind: 9, body: 9 },
  '2026-10-14': { mood: 5, mind: 5 }, // corps manquant : pas de total
  '2026-10-20': { note: 'juste un commentaire' },
};

test('valeur d’un jour : total (3 notes obligatoires) ou une seule note', () => {
  assert.equal(metricValue(E['2026-10-10'], 'total'), 20);
  assert.equal(metricValue(E['2026-10-14'], 'total'), null);
  assert.equal(metricValue(E['2026-10-14'], 'mind'), 5);
  assert.equal(metricValue(E['2026-10-14'], 'body'), null);
  assert.equal(metricValue(E['2026-10-20'], 'mood'), null);
  assert.equal(metricValue(undefined, 'total'), null);
});

test('moyenne générale : tous les jours notés jusqu’à aujourd’hui, null sous 3 jours', () => {
  // totaux : 12, 9, 20, 15, 27 → 83 / 5
  assert.equal(overallAverage(E, 'total', TODAY), 83 / 5);
  // le futur ne compte pas
  assert.equal(overallAverage({ ...E, '2026-11-01': { mood: 10, mind: 10, body: 10 } }, 'total', TODAY), 83 / 5);
  assert.equal(overallAverage({ '2026-10-10': { mood: 5 }, '2026-10-11': { mood: 6 } }, 'mood', TODAY), null);
  assert.equal(overallAverage({}, 'total', TODAY), null);
});

test('bon = au-dessus de la moyenne, mauvais = en dessous, égal = ni l’un ni l’autre', () => {
  assert.equal(relation(20, 16.6), 'good');
  assert.equal(relation(9, 16.6), 'bad');
  assert.equal(relation(15, 15), 'usual');
  assert.equal(relation(null, 15), null);
  assert.equal(relation(15, null), null);
});

test('années : celles qui ont des notes + l’année en cours, la plus récente d’abord ; le futur est ignoré', () => {
  assert.deepEqual(recapYears(E, TODAY), [2026, 2025]);
  assert.deepEqual(recapYears({}, TODAY), [2026]);
  assert.deepEqual(recapYears({ '2027-01-05': { mood: 5 } }, TODAY), [2026]);
});

test('mois : tous les jours jusqu’à aujourd’hui, avec leurs valeurs et leur classement', () => {
  const avg = overallAverage(E, 'total', TODAY);
  const oct = recapMonth(E, 2026, 10, TODAY, 'total', avg, 'all');
  assert.equal(oct.future, false);
  assert.equal(oct.days.length, 23); // du 1er au 23 : les jours à venir n'y sont pas
  assert.equal(oct.days[0].day, '2026-10-01');
  assert.equal(oct.days[22].day, '2026-10-23');
  const d = (k: string) => oct.days.find((x) => x.day === k)!;
  assert.equal(d('2026-10-10').value, 20);
  assert.equal(d('2026-10-10').rel, 'good'); // 20 > 16,6
  assert.equal(d('2026-10-11').rel, 'bad'); // 15 < 16,6
  assert.equal(d('2026-10-12').rel, 'good');
  assert.equal(d('2026-10-14').rel, null); // pas de total ce jour-là
  assert.equal(d('2026-10-01').rel, null); // jour vide
  assert.equal(oct.noted, 5); // 10, 11, 12, 14, 20 (le commentaire seul compte comme noté)
  assert.equal(oct.good, 2);
  assert.equal(oct.bad, 1);
  assert.equal(oct.average, 20.7); // (20 + 15 + 27) / 3
});

test('filtre bon / mauvais : seuls les jours correspondants restent, les compteurs ne bougent pas', () => {
  const avg = overallAverage(E, 'total', TODAY);
  const good = recapMonth(E, 2026, 10, TODAY, 'total', avg, 'good');
  assert.deepEqual(good.days.map((x) => x.day), ['2026-10-10', '2026-10-12']);
  const bad = recapMonth(E, 2026, 10, TODAY, 'total', avg, 'bad');
  assert.deepEqual(bad.days.map((x) => x.day), ['2026-10-11']);
  assert.equal(bad.good, 2); // compteurs indépendants du filtre
  assert.equal(bad.noted, 5);
});

test('une seule note comparée à sa propre moyenne', () => {
  const avg = overallAverage(E, 'mind', TODAY); // 4, 3, 7, 5, 9, 5 → 33/6 = 5,5
  assert.equal(avg, 5.5);
  const oct = recapMonth(E, 2026, 10, TODAY, 'mind', avg, 'all');
  assert.equal(oct.days.find((x) => x.day === '2026-10-14')!.rel, 'bad'); // 5 < 5,5 : ce jour compte ici
  assert.equal(oct.days.find((x) => x.day === '2026-10-10')!.rel, 'good');
});

test('un mois à venir est marqué et vide ; le mois en cours s’arrête à aujourd’hui', () => {
  const nov = recapMonth(E, 2026, 11, TODAY, 'total', 16, 'all');
  assert.equal(nov.future, true);
  assert.deepEqual(nov.days, []);
  const dec25 = recapMonth(E, 2025, 12, TODAY, 'total', 16.6, 'all');
  assert.equal(dec25.days.length, 31); // une année passée : tout le mois
  assert.equal(dec25.future, false);
});

test('liste des mois : 12 sans filtre ; un seul si on choisit un mois ; mois sans jour correspondant masqués', () => {
  const avg = overallAverage(E, 'total', TODAY);
  assert.equal(recapMonths(E, 2026, null, TODAY, 'total', avg, 'all').length, 12);
  assert.deepEqual(recapMonths(E, 2026, 10, TODAY, 'total', avg, 'all').map((m) => m.month), [10]);
  // avec « mauvais » : octobre (11/10) et septembre (30/09 = 9) ; les autres mois n'ont rien
  assert.deepEqual(recapMonths(E, 2026, null, TODAY, 'total', avg, 'bad').map((m) => m.month), [9, 10]);
  assert.deepEqual(recapMonths(E, 2026, null, TODAY, 'total', null, 'good'), []); // pas de moyenne : rien n'est classé
});
