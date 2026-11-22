// Encadré « coach » de l'accueil (22 nov., décision de Valentin) — logique pure, testée dans model.test.ts.
//
// Le parcours : l'appli est gratuite ; la valeur payante, c'est l'analyse humaine de Valentin.
//  - Jours 1 à 3 d'utilisation : « Une question sur l'appli ? » → WhatsApp de Valentin (c'est l'utilisateur qui écrit
//    le premier : consentement maximum).
//  - À partir du 4e jour (s'il a noté au moins un jour) : « Envoie ton journal » → l'utilisateur choisit la période et les
//    commentaires, relit le texte, puis WhatsApp s'ouvre avec le message prêt. Rien ne part sans son geste.
// Le journal part en TEXTE dans WhatsApp (pas de fichier, pas de serveur) : Valentin le lit directement.
import { addDays, DAY_SHORT, diffDays, fromKey, weekdayIndex } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';
import {
  average, FIELD_LABEL, formatClock, formatDuration, formatScore, isClockTime, isEmptyEntry, isScore, noteOf, sleepDuration,
} from '../journal/model.ts';
import type { EntryMap, ScoreField } from '../journal/model.ts';

export const COACH = {
  name: 'Valentin',
  /** Numéro WhatsApp au format international sans « + » ni espaces (donné par Valentin le 22 nov. : 06 20 88 22 80). */
  whatsapp: '33620882280',
  /** Appel découverte gratuit de 45 min (événement secret, donné par Valentin le 22 nov.). */
  calendly: 'https://calendly.com/orducadre/tdahsanslimite',
};

/** Jours d'utilisation avant de proposer l'envoi du journal (jours 1 à 3 : la question ; dès le 4e : le journal). */
export const QUESTION_DAYS = 3;

export type CoachStage = 'question' | 'journal';

/**
 * Premier jour d'utilisation : le plus ancien entre le jour enregistré à la première ouverture et le premier jour noté
 * du journal (quelqu'un qui notait déjà avant cette version n'a pas à attendre 3 jours de plus).
 */
export function firstUseDay(stored: DayKey | undefined, entries: EntryMap, today: DayKey): DayKey {
  const days = Object.keys(entries).filter((d) => d <= today && !isEmptyEntry(entries[d])).sort();
  const candidates = [stored ?? today, ...(days.length ? [days[0]] : [])];
  return candidates.sort()[0];
}

/** Numéro du jour d'utilisation : 1 le premier jour. */
export function dayOfUse(first: DayKey, today: DayKey): number {
  return Math.max(1, diffDays(first, today) + 1);
}

/** Quel encadré montrer : la question les 3 premiers jours, puis l'envoi du journal s'il y a au moins un jour noté. */
export function coachStage(first: DayKey, today: DayKey, entries: EntryMap): CoachStage {
  const noted = Object.keys(entries).some((d) => d <= today && !isEmptyEntry(entries[d]));
  return dayOfUse(first, today) > QUESTION_DAYS && noted ? 'journal' : 'question';
}

/** Lien qui ouvre WhatsApp sur la conversation avec Valentin, message prêt (l'utilisateur appuie lui-même sur Envoyer). */
export function whatsappUrl(text: string, phone: string = COACH.whatsapp): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export const QUESTION_TEXT = `Bonjour ${COACH.name}, j'utilise l'appli Cerveau Externe et j'ai une question : `;

/** Au-delà, le lien WhatsApp risque d'être trop long : on propose une période plus courte ou sans commentaires. */
export const MAX_TEXT = 6000;

export interface JournalTextOptions {
  /** Nombre de jours envoyés, jusqu'à aujourd'hui inclus. */
  days: number;
  /** Notes suivies (réglages du journal). */
  fields: ScoreField[];
  comments: boolean;
  /** Ajouter les heures de coucher / lever. */
  sleepTimes: boolean;
}

const SHORT: Record<ScoreField, string> = { mood: 'Journée', mind: 'Tête', body: 'Corps', sleep: 'Sommeil' };

const dayLabel = (d: DayKey) => {
  const date = fromKey(d);
  return `${DAY_SHORT[weekdayIndex(d)]} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/** Le message envoyé à Valentin : les jours du plus ancien au plus récent, puis les moyennes. */
export function journalText(entries: EntryMap, today: DayKey, o: JournalTextOptions): string {
  const days = Array.from({ length: o.days }, (_, i) => addDays(today, i - o.days + 1));
  const lines: string[] = [
    `Bonjour ${COACH.name}, voici mon journal Cerveau Externe des ${o.days} derniers jours. J'aimerais en parler avec toi lors d'un appel.`,
    '',
  ];
  for (const d of days) {
    const e = entries[d];
    const scores = o.fields.filter((f) => isScore(e?.[f])).map((f) => `${SHORT[f]} ${e![f]}`);
    const night = o.sleepTimes && e && (isClockTime(e.bedTime) || isClockTime(e.wakeTime))
      ? `Nuit ${isClockTime(e.bedTime) ? formatClock(e.bedTime) : '?'} → ${isClockTime(e.wakeTime) ? formatClock(e.wakeTime) : '?'}`
        + (sleepDuration(e) !== null ? ` (${formatDuration(sleepDuration(e)!)})` : '')
      : null;
    const parts = [...scores, ...(night ? [night] : [])];
    const comments = o.comments && e
      ? o.fields.map((f) => ({ f, t: noteOf(e, f).trim() })).filter((c) => c.t)
      : [];
    if (!parts.length && !comments.length) {
      lines.push(`${dayLabel(d)} : pas noté`);
      continue;
    }
    lines.push(`${dayLabel(d)} : ${parts.length ? parts.join(' · ') : 'pas de note'}`);
    for (const c of comments) lines.push(`   ${FIELD_LABEL[c.f]} : ${c.t.replace(/\s*\n\s*/g, ' / ')}`);
  }
  const avgs = o.fields
    .map((f) => ({ f, v: average(entries, days, f) }))
    .filter((a) => a.v !== null)
    .map((a) => `${SHORT[a.f]} ${formatScore(a.v!)}`);
  if (avgs.length) lines.push('', `Moyennes : ${avgs.join(' · ')}`);
  return lines.join('\n');
}

// ——— Transmission directe dans le Drive de Valentin (22 nov., décision de Valentin : « go drive ») ———
// Un seul appui sur « Transmettre mes données » : on ne quitte plus l'appli (WhatsApp faisait sortir et l'utilisateur
// ne revenait pas réserver), et les données ne traînent pas dans WhatsApp. Elles arrivent dans un Google Sheet du
// compte TDAH de Valentin via un script Apps Script (scripts/reception-donnees.gs) qui le prévient aussi par e-mail.

export const COACH_INBOX = {
  /** Adresse « Application Web » du script (…/exec). Vide = on garde l'envoi par WhatsApp. */
  url: '',
  /** Même valeur que CLE dans scripts/reception-donnees.gs : écarte les envois qui ne viennent pas de l'appli. */
  key: 'ce-coach-2026',
};

export interface InboxPayload {
  key: string; prenom: string; telephone: string; jours: number; version: string; texte: string;
}

/** Prénom et téléphone obligatoires : sans eux, Valentin ne sait pas qui le contacte. */
export function canTransmit(prenom: string, telephone: string): boolean {
  return prenom.trim().length > 0 && telephone.replace(/\D/g, '').length >= 9;
}

export function inboxPayload(o: { prenom: string; telephone: string; jours: number; version: string; texte: string }): InboxPayload {
  return { key: COACH_INBOX.key, prenom: o.prenom.trim(), telephone: o.telephone.trim(), jours: o.jours, version: o.version, texte: o.texte };
}

// ——— « Envie d'aller plus loin ? » (22 nov., décision de Valentin) ———
// L'encadré coach devient un seul petit bouton qui ouvre une page hors de l'appli (transmettre ses données à Valentin,
// réserver un appel gratuit de 45 min). Il est EN HAUT de l'accueil tant que la page n'a jamais été ouverte ; une fois
// ouverte, il descend sous « Paramètres ». Il remonte en haut quand l'utilisateur revient après au moins 3 jours sans
// ouvrir l'appli (lutter contre l'abandon), puis redescend dès qu'il rouvre la page. Et ainsi de suite.

/** Jours sans ouvrir l'appli après lesquels le bouton remonte en haut (ex. dernière ouverture lundi, retour jeudi). */
export const ABSENCE_DAYS = 3;

export interface Presence {
  /** Dernier jour où l'appli a été ouverte. */
  lastSeenDay?: DayKey;
  /** Dernier jour de retour après une absence d'au moins ABSENCE_DAYS jours. */
  comebackDay?: DayKey;
}

/** À chaque ouverture de l'appli : retient le jour, et le jour de retour s'il y a eu une absence. */
export function markSeen(prev: Presence, today: DayKey): Presence {
  const back = !!prev.lastSeenDay && diffDays(prev.lastSeenDay, today) >= ABSENCE_DAYS;
  return { lastSeenDay: today, comebackDay: back ? today : prev.comebackDay };
}

/** Le bouton est-il en haut de l'accueil ? Jamais ouvert, ou pas rouvert depuis le dernier retour après absence. */
export function furtherOnTop(openedDay: DayKey | undefined, comebackDay: DayKey | undefined): boolean {
  if (!openedDay) return true;
  return !!comebackDay && openedDay < comebackDay;
}

/** Lien qui ramène dans l'appli depuis la page externe pour envoyer son journal (schéma déclaré dans app.json). */
export const SEND_JOURNAL_LINK = 'cerveauexterne://envoi-journal';

/** Ce lien (ou une de ses variantes) demande-t-il d'ouvrir l'envoi du journal ? */
export function isSendJournalLink(url: string | null | undefined): boolean {
  return !!url && /^cerveauexterne:\/\/+envoi-journal/i.test(url);
}
