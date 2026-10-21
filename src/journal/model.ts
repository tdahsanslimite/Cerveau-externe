// Modèle du Journal (suivi du quotidien) + logique pure : notes 1-10, note libre, moyennes, comparaison.
// Aucune dépendance à React : testé dans model.test.ts.
//
// Une entrée par jour : état psychologique (« bonne journée ou non »), état physique (« en forme ou non »),
// et une note libre. Tout est facultatif : un jour peut n'avoir qu'une note, ou qu'un chiffre.
import { addDays } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';

export type ScoreField = 'mood' | 'body';

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;
/** Un score ≤ 4 range le jour dans « Difficiles », un score ≥ 8 dans « Bons moments ». */
export const HARD_MAX = 4;
export const GOOD_MIN = 8;
/** Nombre de jours (avant le jour affiché) servant de point de comparaison. */
export const BASELINE_SPAN = 30;
/** Il faut au moins ce nombre de jours notés pour parler de « moyenne ». */
export const BASELINE_MIN_DAYS = 3;

export interface JournalEntry {
  /** État psychologique : 1 = mauvaise journée, 10 = très bonne journée. */
  mood?: number;
  /** État physique : 1 = pas en forme, 10 = en pleine forme. */
  body?: number;
  note?: string;
}

export type EntryMap = Record<DayKey, JournalEntry>;

export const FIELD_LABEL: Record<ScoreField, string> = { mood: 'Psychologique', body: 'Physique' };

export function isScore(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= SCORE_MIN && n <= SCORE_MAX;
}

export function isEmptyEntry(e?: JournalEntry): boolean {
  if (!e) return true;
  return e.mood === undefined && e.body === undefined && !(e.note && e.note.trim());
}

/** Remplace l'entrée d'un jour ; une entrée vide est retirée (pas de jours fantômes). */
function withEntry(entries: EntryMap, day: DayKey, entry: JournalEntry): EntryMap {
  const { [day]: _old, ...others } = entries;
  return isEmptyEntry(entry) ? others : { ...others, [day]: entry };
}

/** Pose une note de 1 à 10. Retoucher la même valeur l'efface (pour revenir à « pas noté »). */
export function setScore(entries: EntryMap, day: DayKey, field: ScoreField, value: number): EntryMap {
  if (!isScore(value)) return entries;
  const current = entries[day] ?? {};
  const next: JournalEntry = { ...current };
  if (current[field] === value) delete next[field];
  else next[field] = value;
  return withEntry(entries, day, next);
}

/** Enregistre la note libre du jour (texte tel quel, vide = retirée). */
export function setNote(entries: EntryMap, day: DayKey, note: string): EntryMap {
  const next: JournalEntry = { ...(entries[day] ?? {}) };
  if (note.trim()) next.note = note;
  else delete next.note;
  return withEntry(entries, day, next);
}

/** Les `n` derniers jours jusqu'à `end` inclus, du plus ancien au plus récent. */
export function recentDays(end: DayKey, n: number): DayKey[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

/** Moyenne d'une note sur une liste de jours (1 décimale), null s'il n'y en a aucune. */
export function average(entries: EntryMap, days: DayKey[], field: ScoreField): number | null {
  const values = days.map((d) => entries[d]?.[field]).filter(isScore);
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** Moyenne des jours AVANT `day` (le jour lui-même n'y entre pas), null si trop peu de jours notés. */
export function baseline(entries: EntryMap, day: DayKey, field: ScoreField, span = BASELINE_SPAN): number | null {
  const days = recentDays(addDays(day, -1), span);
  const count = days.filter((d) => isScore(entries[d]?.[field])).length;
  if (count < BASELINE_MIN_DAYS) return null;
  return average(entries, days, field);
}

export type Relative = 'above' | 'usual' | 'below';

/** Situe une note par rapport à la moyenne : écart d'au moins 1 point pour parler de mieux / moins bien. */
export function relativeTo(value: number, base: number): Relative {
  if (value >= base + 1) return 'above';
  if (value <= base - 1) return 'below';
  return 'usual';
}

export type HistoryKind = 'all' | 'hard' | 'good';

export function matchesKind(e: JournalEntry, kind: HistoryKind): boolean {
  if (kind === 'all') return true;
  const scores = [e.mood, e.body].filter(isScore);
  return kind === 'hard' ? scores.some((s) => s <= HARD_MAX) : scores.some((s) => s >= GOOD_MIN);
}

/** Jours à relire, du plus récent au plus ancien, jusqu'à `today` inclus. */
export function historyDays(entries: EntryMap, kind: HistoryKind, today: DayKey, limit = 60): DayKey[] {
  return Object.keys(entries)
    .filter((d) => d <= today && !isEmptyEntry(entries[d]) && matchesKind(entries[d], kind))
    .sort()
    .reverse()
    .slice(0, limit);
}

/** « 6,5 » : virgule française. */
export function formatScore(n: number): string {
  return String(n).replace('.', ',');
}
