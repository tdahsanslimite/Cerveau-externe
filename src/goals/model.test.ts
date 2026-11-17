/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  annualOneThing, BLASON, effectiveLeading, normalizeGoals, periodWhoByTheme, setThemePeriodField, toggleChosen, weekGoals, blasonCount, isoYear, linesOf, periodKey, periodWho, setBlason, setPeriodField, setThemeField,
  themeIndicator, themeProgress, THEMES, toggleLeading,
} from './model.ts';
import type { YearGoals } from './model.ts';
import { isoWeek } from '../calendar/dates.ts';
import type { EntryMap } from '../journal/model.ts';

test('le blason a 7 encarts, dans l’ordre du carnet', () => {
  assert.deepEqual(BLASON.map((b) => b.id), ['devise', 'reves', 'obstacles', 'valeurs', 'entre', 'talents', 'ressources']);
});

test('blason : un encart vide est retiré, le compteur ne compte que les encarts remplis', () => {
  let b = setBlason({}, 'devise', 'Expérimenter, partager');
  b = setBlason(b, 'talents', 'Créatif\nOptimisation des systèmes');
  assert.equal(blasonCount(b), 2);
  b = setBlason(b, 'devise', '   ');
  assert.equal(blasonCount(b), 1);
  assert.equal('devise' in b, false);
  assert.deepEqual(linesOf(b.talents), ['Créatif', 'Optimisation des systèmes']);
  assert.deepEqual(linesOf(undefined), []);
});

test('thèmes : 5 thèmes, seuls Mindset et Santé s’appuient sur le Journal', () => {
  assert.deepEqual(THEMES.map((t) => t.id), ['mindset', 'sante', 'relation', 'business', 'loisirs']);
  assert.deepEqual(THEMES.filter((t) => t.journal).map((t) => [t.id, t.journal]), [['mindset', 'mind'], ['sante', 'body']]);
});

test('fiche de thème : on remplit par champ, vider un champ le retire, une fiche vide disparaît', () => {
  let y: Record<string, YearGoals> = {};
  y = setThemeField(y, '2026', 'business', 'goal', 'Un business simple');
  y = setThemeField(y, '2026', 'business', 'oneThing', 'Une seule stratégie');
  assert.equal(themeProgress(y['2026'].themes.business), 2);
  y = setThemeField(y, '2026', 'business', 'goal', '');
  assert.deepEqual(y['2026'].themes.business, { oneThing: 'Une seule stratégie' });
  y = setThemeField(y, '2026', 'business', 'oneThing', '  ');
  assert.deepEqual(y, {});
});

test('un seul thème en tête ; le retoucher le retire ; l’objet d’origine n’est pas modifié', () => {
  const start: Record<string, YearGoals> = {};
  let y = toggleLeading(start, '2026', 'business');
  assert.equal(y['2026'].leading, 'business');
  y = toggleLeading(y, '2026', 'sante');
  assert.equal(y['2026'].leading, 'sante');
  y = toggleLeading(y, '2026', 'sante');
  assert.deepEqual(y, {});
  assert.deepEqual(start, {});
});

test('One Thing annuel : celui du thème en tête, seulement s’il est écrit, pour l’année du jour', () => {
  let y: Record<string, YearGoals> = {};
  assert.equal(annualOneThing(y, '2026-10-24'), null);
  y = setThemeField(y, '2026', 'business', 'oneThing', '  Une seule stratégie  ');
  assert.equal(annualOneThing(y, '2026-10-24'), null); // pas en tête
  y = toggleLeading(y, '2026', 'business');
  assert.deepEqual(annualOneThing(y, '2026-10-24'), { theme: 'business', text: 'Une seule stratégie' });
  assert.equal(annualOneThing(y, '2027-01-02'), null); // autre année
  y = setThemeField(y, '2026', 'business', 'oneThing', '');
  assert.equal(annualOneThing(y, '2026-10-24'), null); // en tête mais vide
});

test('indicateur : moyennes 7 et 30 jours des notes du Journal (Mindset = tête, Santé = corps), rien pour les autres thèmes', () => {
  const entries: EntryMap = {
    '2026-10-24': { mind: 8, body: 4 },
    '2026-10-23': { mind: 6, body: 6 },
    '2026-10-10': { mind: 2 }, // hors des 7 jours, dans les 30
  };
  const mind = themeIndicator(entries, 'mindset', '2026-10-24');
  assert.deepEqual(mind, { label: 'Bien dans ma tête', avg7: 7, avg30: 5.3 });
  const body = themeIndicator(entries, 'sante', '2026-10-24');
  assert.deepEqual(body, { label: 'Bien dans mon corps', avg7: 5, avg30: 5 });
  assert.equal(themeIndicator(entries, 'relation', '2026-10-24'), null);
  assert.deepEqual(themeIndicator({}, 'mindset', '2026-10-24'), { label: 'Bien dans ma tête', avg7: null, avg30: null });
});

test('clés de période : semaine ISO, mois, trimestre', () => {
  assert.equal(periodKey('semaine', '2026-10-24'), 'S2026-W43');
  assert.equal(periodKey('semaine', '2026-10-19'), 'S2026-W43'); // lundi
  assert.equal(periodKey('semaine', '2026-10-25'), 'S2026-W43'); // dimanche
  assert.equal(periodKey('semaine', '2026-10-26'), 'S2026-W44');
  assert.equal(periodKey('mois', '2026-10-24'), 'M2026-10');
  assert.equal(periodKey('trimestre', '2026-01-01'), 'T2026-Q1');
  assert.equal(periodKey('trimestre', '2026-03-31'), 'T2026-Q1');
  assert.equal(periodKey('trimestre', '2026-04-01'), 'T2026-Q2');
  assert.equal(periodKey('trimestre', '2026-10-24'), 'T2026-Q4');
  assert.equal(periodKey('trimestre', '2026-12-31'), 'T2026-Q4');
});

test('la semaine de la clé est la même que celle affichée dans le calendrier, y compris autour du nouvel an', () => {
  for (const d of ['2026-01-01', '2026-12-31', '2027-01-01', '2027-01-03', '2024-12-30', '2021-01-03', '2026-06-15']) {
    const week = Number(periodKey('semaine', d).split('-W')[1]);
    assert.equal(week, isoWeek(d), d);
  }
  assert.equal(isoYear('2027-01-01'), 2026); // 1er janvier 2027 = semaine 53 de 2026
  assert.equal(periodKey('semaine', '2027-01-01'), 'S2026-W53');
  assert.equal(periodKey('semaine', '2024-12-30'), 'S2025-W01');
});

test('période : « qui je suis » se retrouve pour tous les jours de la période, et seulement eux', () => {
  let p = setPeriodField({}, periodKey('semaine', '2026-10-24'), 'who', '  Calme et régulier  ');
  p = setPeriodField(p, periodKey('mois', '2026-10-24'), 'todo', 'Une vidéo par semaine');
  assert.equal(periodWho(p, 'semaine', '2026-10-19'), 'Calme et régulier');
  assert.equal(periodWho(p, 'semaine', '2026-10-25'), 'Calme et régulier');
  assert.equal(periodWho(p, 'semaine', '2026-10-26'), null);
  assert.equal(periodWho(p, 'mois', '2026-10-24'), null); // le mois n'a que « todo »
  p = setPeriodField(p, periodKey('semaine', '2026-10-24'), 'who', '');
  assert.equal(periodWho(p, 'semaine', '2026-10-24'), null);
  assert.deepEqual(Object.keys(p), ['M2026-10']);
});

test('thème en tête effectif : celui marqué s’il est choisi ; un seul thème choisi est en tête d’office', () => {
  const g: YearGoals = { leading: 'business', themes: {} };
  assert.equal(effectiveLeading(g, ['business', 'sante']), 'business');
  assert.equal(effectiveLeading(g, ['sante', 'relation']), undefined); // en tête mais plus choisi
  assert.equal(effectiveLeading(g, ['sante']), 'sante');
  assert.equal(effectiveLeading(undefined, ['relation']), 'relation');
  assert.equal(effectiveLeading(undefined, []), undefined);
  let y: Record<string, YearGoals> = setThemeField({}, '2026', 'sante', 'oneThing', 'Marcher chaque jour');
  assert.deepEqual(annualOneThing(y, '2026-11-17', ['sante']), { theme: 'sante', text: 'Marcher chaque jour' });
  assert.equal(annualOneThing(y, '2026-11-17', ['sante', 'business']), null); // deux thèmes, aucun en tête
  y = toggleLeading(y, '2026', 'sante');
  assert.deepEqual(annualOneThing(y, '2026-11-17', ['sante', 'business'])?.theme, 'sante');
});

test('reprise des données d’avant le 17 nov. : l’ancienne fiche de période va au thème en tête, les thèmes remplis deviennent choisis', () => {
  const old = {
    blason: {},
    years: { '2026': { leading: 'business' as const, themes: { business: { goal: 'Un business simple' }, mindset: { goal: 'Calme' } } } },
    periods: { 'S2026-W47': { who: 'Régulier' } },
  };
  const n = normalizeGoals(old);
  assert.deepEqual(n.themePeriods, { business: { 'S2026-W47': { who: 'Régulier' } } });
  assert.deepEqual(n.chosen, ['mindset', 'business']); // ordre des thèmes
  assert.deepEqual(old.periods, { 'S2026-W47': { who: 'Régulier' } }); // rien n'est modifié
  // Sans thème en tête : premier thème rempli ; sans rien : Business.
  assert.deepEqual(Object.keys(normalizeGoals({ ...old, years: { '2026': { themes: { sante: { goal: 'x' } } } } }).themePeriods), ['sante']);
  assert.deepEqual(Object.keys(normalizeGoals({ ...old, years: {} }).themePeriods), ['business']);
});

test('reprise : une seule fois, et un tout nouvel utilisateur n’a encore rien choisi', () => {
  const fresh = normalizeGoals({ blason: {}, years: {}, periods: {} });
  assert.deepEqual(fresh.chosen, []);
  assert.deepEqual(fresh.themePeriods, {});
  // themePeriods existe déjà : l'ancienne fiche n'est pas recopiée une 2e fois, chosen enregistré est respecté.
  const later = normalizeGoals({ blason: {}, years: {}, periods: { 'S2026-W47': { who: 'x' } }, themePeriods: {}, chosen: ['sante'] });
  assert.deepEqual(later.themePeriods, {});
  assert.deepEqual(later.chosen, ['sante']);
});

test('thèmes choisis : ajout à la suite, retrait, jamais le dernier', () => {
  let c = toggleChosen([], 'sante');
  c = toggleChosen(c, 'business');
  assert.deepEqual(c, ['sante', 'business']);
  c = toggleChosen(c, 'sante');
  assert.deepEqual(c, ['business']);
  assert.deepEqual(toggleChosen(c, 'business'), ['business']);
});

test('fiches de période par thème : Business et Santé ont chacun leur semaine', () => {
  const w = periodKey('semaine', '2026-11-17');
  let tp = setThemePeriodField({}, 'business', w, 'who', 'Une vidéo par semaine');
  tp = setThemePeriodField(tp, 'sante', w, 'who', 'Je bouge chaque jour');
  tp = setThemePeriodField(tp, 'sante', w, 'avoid', 'Écrans après 22 h');
  assert.equal(tp.business?.[w]?.who, 'Une vidéo par semaine');
  assert.equal(tp.sante?.[w]?.who, 'Je bouge chaque jour');
  assert.deepEqual(periodWhoByTheme(tp, ['sante', 'business'], 'semaine', '2026-11-20'), [
    { theme: 'sante', text: 'Je bouge chaque jour' },
    { theme: 'business', text: 'Une vidéo par semaine' },
  ]);
  assert.deepEqual(periodWhoByTheme(tp, ['sante'], 'semaine', '2026-11-20').length, 1); // thème retiré = masqué
  assert.deepEqual(weekGoals(tp, ['business', 'sante', 'relation'], '2026-11-17'), [
    { theme: 'business', who: 'Une vidéo par semaine' },
    { theme: 'sante', who: 'Je bouge chaque jour', avoid: 'Écrans après 22 h' },
  ]);
  assert.deepEqual(weekGoals(tp, ['business'], '2026-11-24'), []); // semaine suivante vide
  tp = setThemePeriodField(tp, 'business', w, 'who', '');
  assert.equal('business' in tp, false);
});
