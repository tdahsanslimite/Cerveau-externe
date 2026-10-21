/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { average, baseline, formatScore, historyDays, isEmptyEntry, isScore, recentDays, relativeTo, setNote, setScore } from './model.ts';
import type { EntryMap } from './model.ts';

test('seuls les entiers de 1 à 10 sont des notes', () => {
  assert.equal(isScore(1), true);
  assert.equal(isScore(10), true);
  assert.equal(isScore(0), false);
  assert.equal(isScore(11), false);
  assert.equal(isScore(5.5), false);
  assert.equal(isScore('7'), false);
});

test('poser une note ; retoucher la même la retire ; une note hors 1-10 est ignorée', () => {
  let e: EntryMap = {};
  e = setScore(e, '2026-10-21', 'mood', 7);
  assert.deepEqual(e['2026-10-21'], { mood: 7 });
  e = setScore(e, '2026-10-21', 'body', 4);
  assert.deepEqual(e['2026-10-21'], { mood: 7, body: 4 });
  e = setScore(e, '2026-10-21', 'mood', 9); // remplace
  assert.equal(e['2026-10-21'].mood, 9);
  assert.equal(setScore(e, '2026-10-21', 'mood', 11), e);
  e = setScore(e, '2026-10-21', 'mood', 9); // même valeur : retirée
  assert.deepEqual(e['2026-10-21'], { body: 4 });
});

test('une entrée vide disparaît ; l’objet d’origine n’est jamais modifié', () => {
  const start: EntryMap = { '2026-10-21': { mood: 6 } };
  const after = setScore(start, '2026-10-21', 'mood', 6);
  assert.deepEqual(after, {});
  assert.deepEqual(start, { '2026-10-21': { mood: 6 } });
});

test('la note libre : gardée telle quelle, vide = retirée, sans toucher aux chiffres', () => {
  let e: EntryMap = { '2026-10-21': { mood: 3 } };
  e = setNote(e, '2026-10-21', 'Trop de choses d’un coup.\n- sport sauté');
  assert.equal(e['2026-10-21'].note, 'Trop de choses d’un coup.\n- sport sauté');
  assert.equal(e['2026-10-21'].mood, 3);
  e = setNote(e, '2026-10-21', '   ');
  assert.deepEqual(e['2026-10-21'], { mood: 3 });
  assert.deepEqual(setNote({}, '2026-10-21', ''), {});
  assert.equal(isEmptyEntry({ note: '  ' }), true);
  assert.equal(isEmptyEntry({ body: 1 }), false);
});

test('derniers jours, du plus ancien au plus récent', () => {
  assert.deepEqual(recentDays('2026-10-21', 3), ['2026-10-19', '2026-10-20', '2026-10-21']);
  assert.deepEqual(recentDays('2026-03-01', 2), ['2026-02-28', '2026-03-01']);
});

test('moyenne : seulement les jours notés, 1 décimale, null si aucun', () => {
  const e: EntryMap = {
    '2026-10-19': { mood: 4, body: 8 },
    '2026-10-20': { mood: 7 },
    '2026-10-21': { note: 'rien de chiffré' },
  };
  const days = recentDays('2026-10-21', 3);
  assert.equal(average(e, days, 'mood'), 5.5);
  assert.equal(average(e, days, 'body'), 8);
  assert.equal(average({}, days, 'mood'), null);
  assert.equal(average({ '2026-10-19': { mood: 7 }, '2026-10-20': { mood: 6 }, '2026-10-21': { mood: 6 } }, days, 'mood'), 6.3);
});

test('point de comparaison : les jours d’avant, sans le jour lui-même, et pas avant 3 jours notés', () => {
  const e: EntryMap = { '2026-10-18': { mood: 6 }, '2026-10-19': { mood: 6 }, '2026-10-21': { mood: 10 } };
  assert.equal(baseline(e, '2026-10-21', 'mood'), null); // 2 jours avant seulement
  e['2026-10-20'] = { mood: 9 };
  assert.equal(baseline(e, '2026-10-21', 'mood'), 7); // (6+6+9)/3, le 21 n'y entre pas
  // un jour hors de la fenêtre de 30 jours ne compte pas
  assert.equal(baseline({ ...e, '2026-08-01': { mood: 1 } }, '2026-10-21', 'mood'), 7);
});

test('mieux / dans la moyenne / moins bien : écart d’au moins 1 point', () => {
  assert.equal(relativeTo(8, 6.5), 'above');
  assert.equal(relativeTo(7.5, 6.5), 'above');
  assert.equal(relativeTo(7, 6.5), 'usual');
  assert.equal(relativeTo(6, 6.5), 'usual');
  assert.equal(relativeTo(5.5, 6.5), 'below');
});

test('historique : récent d’abord, filtres Difficiles (≤ 4) et Bons moments (≥ 8), pas de futur', () => {
  const e: EntryMap = {
    '2026-10-15': { mood: 3, body: 9 },
    '2026-10-16': { mood: 6, body: 6 },
    '2026-10-17': { note: 'juste une note' },
    '2026-10-18': { mood: 9 },
    '2026-10-25': { mood: 2 }, // futur : ignoré
  };
  assert.deepEqual(historyDays(e, 'all', '2026-10-21'), ['2026-10-18', '2026-10-17', '2026-10-16', '2026-10-15']);
  assert.deepEqual(historyDays(e, 'hard', '2026-10-21'), ['2026-10-15']);
  assert.deepEqual(historyDays(e, 'good', '2026-10-21'), ['2026-10-18', '2026-10-15']); // un jour peut être dans les deux
  assert.deepEqual(historyDays(e, 'all', '2026-10-21', 2), ['2026-10-18', '2026-10-17']);
});

test('virgule française', () => {
  assert.equal(formatScore(6.5), '6,5');
  assert.equal(formatScore(7), '7');
});
