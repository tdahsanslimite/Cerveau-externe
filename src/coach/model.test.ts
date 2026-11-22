/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COACH, coachStage, dayOfUse, firstUseDay, furtherOnTop, isSendJournalLink, journalText, markSeen, MAX_TEXT, QUESTION_TEXT, whatsappUrl, withBookingLink } from './model.ts';
import type { EntryMap } from '../journal/model.ts';

const TODAY = '2026-11-22';

test('premier jour : le jour enregistré, ou un jour noté plus ancien', () => {
  assert.equal(firstUseDay(undefined, {}, TODAY), TODAY);
  assert.equal(firstUseDay('2026-11-20', {}, TODAY), '2026-11-20');
  assert.equal(firstUseDay('2026-11-22', { '2026-10-01': { mood: 5 } }, TODAY), '2026-10-01');
  assert.equal(firstUseDay('2026-11-22', { '2026-10-01': {} }, TODAY), '2026-11-22'); // entrée vide : ne compte pas
});

test('jours 1 à 3 : la question ; dès le 4e jour avec un jour noté : le journal', () => {
  const noted: EntryMap = { '2026-11-20': { mood: 6 } };
  assert.equal(dayOfUse('2026-11-22', TODAY), 1);
  assert.equal(coachStage('2026-11-20', TODAY, noted), 'question'); // jour 3
  assert.equal(coachStage('2026-11-19', TODAY, noted), 'journal'); // jour 4
  assert.equal(coachStage('2026-11-01', TODAY, {}), 'question'); // rien de noté : rien à envoyer
});

test('lien WhatsApp vers Valentin, message encodé', () => {
  assert.equal(whatsappUrl('a b'), 'https://wa.me/33620882280?text=a%20b');
  assert.ok(whatsappUrl(QUESTION_TEXT).includes('Bonjour%20Valentin'));
});

test('texte du journal : du plus ancien au plus récent, notes suivies, nuit, commentaires, moyennes', () => {
  const e: EntryMap = {
    '2026-11-20': { mood: 7, mind: 6, sleep: 8, note: 'Bonne séance\nde sport', bedTime: 23 * 60, wakeTime: 7 * 60 },
    '2026-11-22': { mood: 3, body: 4, bodyNote: 'genou' },
  };
  const text = journalText(e, TODAY, { days: 3, fields: ['mood', 'mind', 'sleep'], comments: true, sleepTimes: true });
  const lines = text.split('\n');
  assert.match(lines[0], /des 3 derniers jours/);
  assert.equal(lines[2], 'Ven 20/11 : Journée 7 · Tête 6 · Sommeil 8 · Nuit 23:00 → 07:00 (8 h)');
  assert.equal(lines[3], '   Bonnes journées : Bonne séance / de sport');
  assert.equal(lines[4], 'Sam 21/11 : pas noté');
  assert.equal(lines[5], 'Dim 22/11 : Journée 3'); // « corps » non suivi : ni sa note ni son commentaire
  assert.equal(lines.at(-1), 'Moyennes : Journée 5 · Tête 6 · Sommeil 8');
  const bare = journalText(e, TODAY, { days: 3, fields: ['mood'], comments: false, sleepTimes: false });
  assert.ok(!bare.includes('séance') && !bare.includes('Nuit'));
});

test('withBookingLink : le lien Calendly en dernière ligne du message', () => {
  const t = withBookingLink('Bonjour', 'https://calendly.com/x');
  assert.equal(t.split('\n').at(-1), 'Je réserve mon appel gratuit (45 min) : https://calendly.com/x');
  assert.ok(withBookingLink('a').includes(COACH.calendly));
});

test('30 jours avec commentaires restent sous la limite d’un message ordinaire', () => {
  const e: EntryMap = {};
  for (let i = 1; i <= 30; i++) e[`2026-11-${String(i).padStart(2, '0')}`] = { mood: 5, mind: 5, body: 5, sleep: 5, note: 'Une phrase de commentaire assez normale.' };
  const text = journalText(e, '2026-11-30', { days: 30, fields: ['mood', 'mind', 'body', 'sleep'], comments: true, sleepTimes: false });
  assert.ok(text.length < MAX_TEXT, `${text.length}`);
});

test('markSeen : retient le jour ; un retour après 3 jours sans ouvrir l’appli est noté', () => {
  assert.deepEqual(markSeen({}, '2026-11-22'), { lastSeenDay: '2026-11-22', comebackDay: undefined });
  // ouvert lundi 16, revenu mercredi 18 : pas d'absence
  assert.deepEqual(markSeen({ lastSeenDay: '2026-11-16' }, '2026-11-18'), { lastSeenDay: '2026-11-18', comebackDay: undefined });
  // ouvert lundi 16, revenu jeudi 19 : retour
  assert.deepEqual(markSeen({ lastSeenDay: '2026-11-16' }, '2026-11-19'), { lastSeenDay: '2026-11-19', comebackDay: '2026-11-19' });
  // le jour de retour est gardé les jours suivants
  assert.deepEqual(markSeen({ lastSeenDay: '2026-11-19', comebackDay: '2026-11-19' }, '2026-11-20'), { lastSeenDay: '2026-11-20', comebackDay: '2026-11-19' });
});

test('furtherOnTop : en haut tant que jamais ouvert, en bas après, remonte après une absence, redescend si rouvert', () => {
  assert.equal(furtherOnTop(undefined, undefined), true);
  assert.equal(furtherOnTop('2026-11-16', undefined), false);
  assert.equal(furtherOnTop('2026-11-16', '2026-11-19'), true);
  assert.equal(furtherOnTop('2026-11-19', '2026-11-19'), false);
  assert.equal(furtherOnTop('2026-11-20', '2026-11-19'), false);
});

test('isSendJournalLink', () => {
  assert.equal(isSendJournalLink('cerveauexterne://envoi-journal'), true);
  assert.equal(isSendJournalLink('cerveauexterne:///envoi-journal?x=1'), true);
  assert.equal(isSendJournalLink('https://wa.me/33'), false);
  assert.equal(isSendJournalLink(null), false);
});
