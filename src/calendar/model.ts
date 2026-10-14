// Modèle de données du calendrier + logique pure (récurrences, charge du jour).
import { diffDays, weekdayIndex } from './dates.ts';
import type { DayKey } from './dates.ts';

export type CategoryId = 'travail' | 'famille' | 'sante' | 'sport' | 'perso';

export const CATEGORIES: { id: CategoryId; label: string; color: string }[] = [
  { id: 'travail', label: 'Travail', color: '#2F63B0' },
  { id: 'famille', label: 'Famille', color: '#C9721F' },
  { id: 'sante', label: 'Santé', color: '#2E8B57' },
  { id: 'sport', label: 'Sport', color: '#7A4FB0' },
  { id: 'perso', label: 'Perso', color: '#6B7178' },
];

export const categoryOf = (id: CategoryId) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[4];

export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly';

export const REPEATS: { id: Repeat; label: string }[] = [
  { id: 'none', label: 'Une fois' },
  { id: 'weekly', label: 'Chaque semaine' },
  { id: 'weekdays', label: 'Lun – ven' },
  { id: 'daily', label: 'Chaque jour' },
];

export interface CalendarEvent {
  id: string;
  title: string;
  /** Jour de la (première) occurrence. */
  date: DayKey;
  /** Minutes depuis minuit, ou null pour « toute la journée ». */
  start: number | null;
  durationMin: number;
  category: CategoryId;
  repeat: Repeat;
  /** Jours où une occurrence d'une série a été supprimée. */
  skipped?: DayKey[];
  note?: string;
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

/**
 * Créneaux libres d'au moins `minGap` minutes entre `dayStart` et `dayEnd`,
 * en tenant compte des chevauchements. Les événements « journée » sont ignorés.
 */
export function freeSlots(occs: Occurrence[], dayStart = 8 * 60, dayEnd = 21 * 60, minGap = 60): { from: number; to: number }[] {
  const busy = occs
    .filter((o) => o.event.start !== null)
    .map((o) => ({ from: o.event.start as number, to: (o.event.start as number) + o.event.durationMin }))
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

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
