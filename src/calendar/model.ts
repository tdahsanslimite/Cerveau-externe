// Modèle de données du calendrier + logique pure (récurrences, charge, chevauchements, bilan).
// Tout ce fichier est testé dans dates.test.ts.
import { addDays, diffDays, weekdayIndex } from './dates.ts';
import type { DayKey } from './dates.ts';

// ---------------- Domaines (personnalisables) ----------------

export interface Domain {
  id: string;
  label: string;
  color: string;
}

export const DEFAULT_DOMAINS: Domain[] = [
  { id: 'travail', label: 'Travail', color: '#2F63B0' },
  { id: 'famille', label: 'Famille', color: '#C9721F' },
  { id: 'sante', label: 'Santé', color: '#2E8B57' },
  { id: 'sport', label: 'Sport', color: '#7A4FB0' },
  { id: 'perso', label: 'Perso', color: '#6B7178' },
];

/** Couleurs proposées pour un domaine : distinctes, lisibles sur fond clair. */
export const DOMAIN_COLORS = [
  '#2F63B0', '#1F8A9E', '#2E8B57', '#6E8B1F', '#B38A00', '#C9721F',
  '#C2452D', '#B03A6E', '#7A4FB0', '#4F5BB0', '#6B7178', '#8A5A3C',
];

const FALLBACK_DOMAIN: Domain = { id: '_', label: 'Sans domaine', color: '#9AA0A6' };

export function domainOf(domains: Domain[], id: string): Domain {
  return domains.find((d) => d.id === id) ?? FALLBACK_DOMAIN;
}

// ---------------- Événements ----------------

export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly';

export const REPEATS: { id: Repeat; label: string }[] = [
  { id: 'none', label: 'Une fois' },
  { id: 'weekly', label: 'Chaque semaine' },
  { id: 'weekdays', label: 'Lun – ven' },
  { id: 'daily', label: 'Chaque jour' },
];

/** Nature d'un événement. Plusieurs possibles : un IRM est un rendez-vous ET un objet à prendre. */
export type EventKind = 'rdv' | 'tache' | 'objet';

export const KINDS: { id: EventKind; label: string; hint: string }[] = [
  { id: 'rdv', label: 'Rendez-vous', hint: 'Un lieu, une heure, quelqu’un t’attend.' },
  { id: 'tache', label: 'Tâche', hint: 'Un créneau bloqué pour faire quelque chose, à cocher une fois fait.' },
  { id: 'objet', label: 'Objet à prendre', hint: 'Une chose à ne pas oublier d’emporter.' },
];

export type ReminderUnit = 'min' | 'h' | 'j';

export interface Reminder {
  amount: number;
  unit: ReminderUnit;
}

export const MAX_REMINDERS = 3;

/** Comment le téléphone se manifeste au moment du rappel. */
export type AlertKind = 'sonnerie' | 'vibreur' | 'silencieux' | 'carillon' | 'cloche' | 'alarme';

export const ALERTS: { id: AlertKind; label: string }[] = [
  { id: 'sonnerie', label: 'Sonnerie' },
  { id: 'carillon', label: 'Carillon' },
  { id: 'cloche', label: 'Cloche' },
  { id: 'vibreur', label: 'Vibreur' },
  { id: 'silencieux', label: 'Silencieux' },
  // Comme un réveil : le son recommence jusqu'à ce qu'on touche « Je m'en occupe » (voir calendar/alarm.ts).
  { id: 'alarme', label: 'Alarme (jusqu’à éteindre)' },
];
export const REMINDER_UNITS: { id: ReminderUnit; label: string; minutes: number }[] = [
  { id: 'min', label: 'min', minutes: 1 },
  { id: 'h', label: 'heures', minutes: 60 },
  { id: 'j', label: 'jours', minutes: 1440 },
];

export interface CalendarEvent {
  id: string;
  title: string;
  /** Jour de la (première) occurrence. */
  date: DayKey;
  /** Minutes depuis minuit, ou null pour « toute la journée ». */
  start: number | null;
  durationMin: number;
  /** Identifiant du domaine (Travail, Sport…). */
  category: string;
  repeat: Repeat;
  /** Absent sur les événements créés avant la v1.1 : traité comme ['rdv']. */
  kinds?: EventKind[];
  /** Ce qu'il faut emporter (type « objet »). */
  item?: string;
  /** Rappel la veille à 20 h pour préparer l'objet. */
  itemEveReminder?: boolean;
  reminders?: Reminder[];
  /** Type d'alerte de ses rappels ; absent = celui choisi dans les réglages. */
  alert?: AlertKind;
  /** Jours où la tâche a été faite (une série peut être cochée jour par jour). */
  doneDays?: DayKey[];
  /**
   * Priorité d'un événement « Tâche » ponctuel, pour le sas et la matrice d'Eisenhower du module Tâches.
   * Absent ou null = pas encore trié (l'événement apparaît alors dans le sas).
   */
  important?: boolean | null;
  urgent?: boolean | null;
  /** Place dans sa liste d'idées (0 = tout en haut). */
  rank?: number;
  /** Placé dans « The One Thing » des idées. */
  oneThing?: boolean;
  /** Tâche pas cochée le jour prévu : le créneau reste (historique) et une nouvelle tâche est repartie dans le sas. */
  sentToSas?: boolean;
  /** Jours où une occurrence d'une série a été supprimée. */
  skipped?: DayKey[];
  note?: string;
}

export const kindsOf = (e: CalendarEvent): EventKind[] => (e.kinds && e.kinds.length ? e.kinds : ['rdv']);
export const isTask = (e: CalendarEvent) => kindsOf(e).includes('tache');
export const isDoneOn = (e: CalendarEvent, day: DayKey) => !!e.doneDays?.includes(day);
export const endOf = (e: CalendarEvent) => (e.start ?? 0) + e.durationMin;

export function reminderMinutes(r: Reminder): number {
  return r.amount * (REMINDER_UNITS.find((u) => u.id === r.unit)?.minutes ?? 1);
}

export function reminderLabel(r: Reminder): string {
  const unit = r.unit === 'min' ? 'min' : r.unit === 'h' ? (r.amount > 1 ? 'heures' : 'heure') : r.amount > 1 ? 'jours' : 'jour';
  return `${r.amount} ${unit} avant`;
}

/** Une occurrence affichable d'un événement, sur un jour précis. */
export interface Occurrence {
  event: CalendarEvent;
  day: DayKey;
}

export function occursOn(e: CalendarEvent, day: DayKey): boolean {
  if (e.skipped?.includes(day)) return false;
  const n = diffDays(e.date, day);
  if (n < 0) return false;
  switch (e.repeat) {
    case 'none':
      return n === 0;
    case 'daily':
      return true;
    case 'weekdays':
      return weekdayIndex(day) < 5;
    case 'weekly':
      return n % 7 === 0;
  }
}

/** Occurrences d'un jour, triées : journée entière d'abord, puis par heure. */
export function occurrencesOn(events: CalendarEvent[], day: DayKey): Occurrence[] {
  return events
    .filter((e) => occursOn(e, day))
    .map((event) => ({ event, day }))
    .sort((a, b) => (a.event.start ?? -1) - (b.event.start ?? -1) || a.event.title.localeCompare(b.event.title));
}

// ---------------- Charge du jour ----------------

export type LoadLevel = 'vide' | 'legere' | 'equilibree' | 'chargee' | 'trop';

export const LOAD_LABEL: Record<LoadLevel, string> = {
  vide: 'Journée libre',
  legere: 'Légère',
  equilibree: 'Équilibrée',
  chargee: 'Au maximum',
  trop: 'Trop chargée',
};

/** Charge d'une journée par rapport à la limite choisie par l'utilisateur. */
export function loadLevel(count: number, limit: number): LoadLevel {
  if (count === 0) return 'vide';
  if (count > limit) return 'trop';
  if (count === limit) return 'chargee';
  if (count / limit > 0.6) return 'equilibree';
  return 'legere';
}

// ---------------- Créneaux et chevauchements ----------------

/**
 * Créneaux libres d'au moins `minGap` minutes entre `dayStart` et `dayEnd`,
 * en tenant compte des chevauchements. Les événements « journée » sont ignorés.
 */
export function freeSlots(occs: Occurrence[], dayStart = 8 * 60, dayEnd = 21 * 60, minGap = 60): { from: number; to: number }[] {
  const busy = occs
    .filter((o) => o.event.start !== null)
    .map((o) => ({ from: o.event.start as number, to: endOf(o.event) }))
    .sort((a, b) => a.from - b.from);
  const slots: { from: number; to: number }[] = [];
  let cursor = dayStart;
  for (const b of busy) {
    if (b.from - cursor >= minGap && b.from <= dayEnd) slots.push({ from: cursor, to: Math.min(b.from, dayEnd) });
    cursor = Math.max(cursor, b.to);
  }
  if (dayEnd - cursor >= minGap) slots.push({ from: cursor, to: dayEnd });
  return slots;
}

const overlaps = (a: CalendarEvent, b: CalendarEvent) =>
  a.start !== null && b.start !== null && a.start < endOf(b) && b.start < endOf(a);

/**
 * Premier événement déjà prévu qui chevauche `candidate`.
 * Pour une série, vérifie les `horizonDays` prochains jours.
 * Les événements « toute la journée » ne bloquent rien.
 */
export function findConflict(events: CalendarEvent[], candidate: CalendarEvent, horizonDays = 56): Occurrence | null {
  if (candidate.start === null) return null;
  const others = events.filter((e) => e.id !== candidate.id && e.start !== null);
  const days = candidate.repeat === 'none' ? 1 : horizonDays;
  for (let i = 0; i < days; i++) {
    const day = addDays(candidate.date, i);
    if (!occursOn(candidate, day)) continue;
    const hit = others.find((o) => occursOn(o, day) && overlaps(candidate, o));
    if (hit) return { event: hit, day };
  }
  return null;
}

/** Première heure de début ≥ `from` où un événement de `duration` minutes tient ce jour-là. */
export function nextFreeStart(events: CalendarEvent[], candidate: CalendarEvent, from: number): number | null {
  for (let s = from; s + candidate.durationMin <= 24 * 60; s += 5) {
    const moved = { ...candidate, start: s, repeat: 'none' as Repeat };
    if (!findConflict(events, moved)) return s;
  }
  return null;
}

// ---------------- Bilan : heures par domaine ----------------

/** Minutes passées par domaine sur [from, to] inclus (événements à heure précise uniquement). */
export function minutesByDomain(events: CalendarEvent[], from: DayKey, to: DayKey): Record<string, number> {
  const out: Record<string, number> = {};
  for (let day = from; diffDays(day, to) >= 0; day = addDays(day, 1)) {
    for (const o of occurrencesOn(events, day)) {
      if (o.event.start === null) continue;
      out[o.event.category] = (out[o.event.category] ?? 0) + o.event.durationMin;
    }
  }
  return out;
}

export type BilanPeriod = 'semaine' | 'mois' | 'annee';

export interface DomainHours {
  /** Minutes déjà passées (jours écoulés et aujourd'hui). */
  done: number;
  /** Minutes encore prévues d'ici la fin de la période. */
  planned: number;
}

/**
 * Bilan des heures par domaine sur [from, to].
 * Jours passés (et aujourd'hui) → « passé » ; jours à venir → « prévu ».
 * Une tâche du calendrier non cochée un jour passé n'a pas eu lieu : elle n'est pas comptée.
 * Les événements « toute la journée » n'ont pas de durée : ignorés.
 */
export function hoursByDomain(events: CalendarEvent[], from: DayKey, to: DayKey, today: DayKey): Record<string, DomainHours> {
  const out: Record<string, DomainHours> = {};
  for (let day = from; diffDays(day, to) >= 0; day = addDays(day, 1)) {
    const past = diffDays(day, today) >= 0;
    for (const o of occurrencesOn(events, day)) {
      const e = o.event;
      if (e.start === null) continue;
      if (past && isTask(e) && !isDoneOn(e, day) && diffDays(day, today) > 0) continue;
      const slot = (out[e.category] ??= { done: 0, planned: 0 });
      if (past) slot.done += e.durationMin;
      else slot.planned += e.durationMin;
    }
  }
  return out;
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
