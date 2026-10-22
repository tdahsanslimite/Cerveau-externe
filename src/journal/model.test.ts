/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  average, baseline, formatScore, historyDays, isEmptyEntry, isScore, noteOf, recentDays, relativeTo, setNote, setScore,
  SCORE_LEVELS, TOTAL_LEVELS, TOTAL_MAX, TOTAL_MIN, totalScore,
} from './model.ts';
import type { EntryMap } from './model.ts';

test('seuls les entiers de 1 à 10 sont des notes', () => {
  assert.equal(isScore(1), true);
  assert.equal(isScore(10), true);
  assert.equal(isScore(0), false);
  assert.equal(isScore(11), false);
  assert.equal(isScore(5.5), false);
  assert.equal(isScore('7'), false);
});

test('trois notes par jour ; retoucher la même la retire ; une note hors 1-10 est ignorée', () => {
  let e: EntryMap = {};
  e = setScore(e, '2026-10-21', 'mood', 7);
  assert.deepEqual(e['2026-10-21'], { mood: 7 });
  e = setScore(e, '2026-10-21', 'mind', 5);
  e = setScore(e, '2026-10-21', 'body', 4);
  assert.deepEqual(e['2026-10-21'], { mood: 7, mind: 5, body: 4 });
  e = setScore(e, '2026-10-21', 'mood', 9); // remplace
  assert.equal(e['2026-10-21'].mood, 9);
  assert.equal(setScore(e, '2026-10-21', 'mood', 11), e);
  e = setScore(e, '2026-10-21', 'mood', 9); // même valeur : retirée
  assert.deepEqual(e['2026-10-21'], { mind: 5, body: 4 });
});

test('une entrée vide disparaît ; l’objet d’origine n’est jamais modifié', () => {
  const start: EntryMap = { '2026-10-21': { mind: 6 } };
  const after = setScore(start, '2026-10-21', 'mind', 6);
  assert.deepEqual(after, {});
  assert.deepEqual(start, { '2026-10-21': { mind: 6 } });
});

test('chaque note a son commentaire : gardé tel quel, vide = retiré, sans toucher aux autres', () => {
  let e: EntryMap = { '2026-10-21': { mind: 3 } };
  e = setNote(e, '2026-10-21', 'mind', 'Trop de choses d’un coup.\n- sport sauté');
  e = setNote(e, '2026-10-21', 'body', 'Dos bloqué.');
  e = setNote(e, '2026-10-21', 'mood', 'Journée longue.');
  assert.equal(noteOf(e['2026-10-21'], 'mind'), 'Trop de choses d’un coup.\n- sport sauté');
  assert.equal(noteOf(e['2026-10-21'], 'body'), 'Dos bloqué.');
  assert.equal(noteOf(e['2026-10-21'], 'mood'), 'Journée longue.');
  assert.equal(e['2026-10-21'].mind, 3);
  e = setNote(e, '2026-10-21', 'body', '   ');
  assert.equal(noteOf(e['2026-10-21'], 'body'), '');
  assert.equal(noteOf(e['2026-10-21'], 'mind'), 'Trop de choses d’un coup.\n- sport sauté'); // l'autre reste
  assert.deepEqual(setNote({}, '2026-10-21', 'mind', ''), {});
  assert.equal(noteOf(undefined, 'mood'), '');
});

test('ancien champ `note` (1re version) = commentaire de « Bonnes journées », rien à migrer', () => {
  const old: EntryMap = { '2026-10-20': { mood: 4, body: 5, note: 'Fatigué.' } };
  assert.equal(noteOf(old['2026-10-20'], 'mood'), 'Fatigué.');
  assert.equal(isEmptyEntry(old['2026-10-20']), false);
});

test('entrée vide : plus de note, ni de chiffre, ni de commentaire', () => {
  assert.equal(isEmptyEntry(undefined), true);
  assert.equal(isEmptyEntry({ note: '  ', mindNote: '', bodyNote: ' ' }), true);
  assert.equal(isEmptyEntry({ body: 1 }), false);
  assert.equal(isEmptyEntry({ bodyNote: 'juste un mot' }), false);
});

test('derniers jours, du plus ancien au plus récent', () => {
  assert.deepEqual(recentDays('2026-10-21', 3), ['2026-10-19', '2026-10-20', '2026-10-21']);
  assert.deepEqual(recentDays('2026-03-01', 2), ['2026-02-28', '2026-03-01']);
});

test('moyenne : seulement les jours notés, 1 décimale, null si aucun', () => {
  const e: EntryMap = {
    '2026-10-19': { mind: 4, body: 8 },
    '2026-10-20': { mind: 7 },
    '2026-10-21': { note: 'rien de chiffré' },
  };
  const days = recentDays('2026-10-21', 3);
  assert.equal(average(e, days, 'mind'), 5.5);
  assert.equal(average(e, days, 'body'), 8);
  assert.equal(average(e, days, 'mood'), null);
  assert.equal(average({ '2026-10-19': { mood: 7 }, '2026-10-20': { mood: 6 }, '2026-10-21': { mood: 6 } }, days, 'mood'), 6.3);
});

test('point de comparaison : les jours d’avant, sans le jour lui-même, et pas avant 3 jours notés', () => {
  const e: EntryMap = { '2026-10-18': { mind: 6 }, '2026-10-19': { mind: 6 }, '2026-10-21': { mind: 10 } };
  assert.equal(baseline(e, '2026-10-21', 'mind'), null); // 2 jours avant seulement
  e['2026-10-20'] = { mind: 9 };
  assert.equal(baseline(e, '2026-10-21', 'mind'), 7); // (6+6+9)/3, le 21 n'y entre pas
  assert.equal(baseline({ ...e, '2026-08-01': { mind: 1 } }, '2026-10-21', 'mind'), 7); // hors des 30 jours
  assert.equal(baseline(e, '2026-10-21', 'body'), null); // chaque note a sa propre moyenne
});

test('mieux / dans la moyenne / moins bien : écart d’au moins 1 point', () => {
  assert.equal(relativeTo(8, 6.5), 'above');
  assert.equal(relativeTo(7.5, 6.5), 'above');
  assert.equal(relativeTo(7, 6.5), 'usual');
  assert.equal(relativeTo(6, 6.5), 'usual');
  assert.equal(relativeTo(5.5, 6.5), 'below');
});

test('historique : récent d’abord, filtres Difficiles (≤ 4) et Bons moments (≥ 8) sur les 3 notes, pas de futur', () => {
  const e: EntryMap = {
    '2026-10-15': { mood: 3, body: 9 },
    '2026-10-16': { mood: 6, mind: 6, body: 6 },
    '2026-10-17': { mindNote: 'juste un commentaire' },
    '2026-10-18': { mind: 9 },
    '2026-10-19': { mind: 2 }, // seule la note « tête » est basse : compte aussi
    '2026-10-25': { mood: 2 }, // futur : ignoré
  };
  assert.deepEqual(historyDays(e, 'all', '2026-10-21'), ['2026-10-19', '2026-10-18', '2026-10-17', '2026-10-16', '2026-10-15']);
  assert.deepEqual(historyDays(e, 'hard', '2026-10-21'), ['2026-10-19', '2026-10-15']);
  assert.deepEqual(historyDays(e, 'good', '2026-10-21'), ['2026-10-18', '2026-10-15']); // un jour peut être dans les deux
  assert.deepEqual(historyDays(e, 'all', '2026-10-21', 2), ['2026-10-19', '2026-10-18']);
});

test('total des 3 notes : de 3 à 30, seulement si les 3 sont posées', () => {
  assert.equal(totalScore({ mood: 1, mind: 1, body: 1 }), TOTAL_MIN);
  assert.equal(TOTAL_MIN, 3);
  assert.equal(totalScore({ mood: 10, mind: 10, body: 10 }), TOTAL_MAX);
  assert.equal(TOTAL_MAX, 30);
  assert.equal(totalScore({ mood: 6, mind: 7, body: 4, note: 'x' }), 17);
  assert.equal(totalScore({ mood: 6, mind: 7 }), null); // une note manque : pas de total trompeur
  assert.equal(totalScore({ note: 'juste un commentaire' }), null);
  assert.equal(totalScore(undefined), null);
});

test('repères des graphiques', () => {
  assert.deepEqual(SCORE_LEVELS, [2.5, 5, 7.5]);
  assert.deepEqual(TOTAL_LEVELS, [5, 10, 15, 20, 25]);
});

test('virgule française', () => {
  assert.equal(formatScore(6.5), '6,5');
  assert.equal(formatScore(7), '7');
});
