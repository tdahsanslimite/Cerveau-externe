// Modèle du Journal (suivi du quotidien) + logique pure : 3 notes 1-10 avec un commentaire chacune, moyennes, comparaison.
// Aucune dépendance à React : testé dans model.test.ts.
//
// Une entrée par jour, trois notes : « Bonnes journées », « Bien dans ma tête », « Bien dans mon corps ».
// Chaque note a son propre commentaire. Tout est facultatif : un jour peut n'avoir qu'un chiffre, ou qu'un commentaire.
import { addDays } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';

export type ScoreField = 'mood' | 'mind' | 'body';

/** Ordre d'affichage. */
export const FIELDS: ScoreField[] = ['mood', 'mind', 'body'];

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
  /** « Bonnes journées » : 1 = mauvaise journée, 10 = très bonne journée. */
  mood?: number;
  /** « Bien dans ma tête » : 1 = pas bien, 10 = très bien. */
  mind?: number;
  /** « Bien dans mon corps » : 1 = pas en forme, 10 = en pleine forme. */
  body?: number;
  /** Commentaire de « Bonnes journées ». Garde le nom `note` : c'était la note libre de la 1re version (rien à migrer). */
  note?: string;
  /** Commentaire de « Bien dans ma tête ». */
  mindNote?: string;
  /** Commentaire de « Bien dans mon corps ». */
  bodyNote?: string;
}

export type EntryMap = Record<DayKey, JournalEntry>;

type NoteKey = 'note' | 'mindNote' | 'bodyNote';

export const NOTE_KEY: Record<ScoreField, NoteKey> = { mood: 'note', mind: 'mindNote', body: 'bodyNote' };

export const FIELD_LABEL: Record<ScoreField, string> = {
  mood: 'Bonnes journées',
  mind: 'Bien dans ma tête',
  body: 'Bien dans mon corps',
};

export function isScore(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= SCORE_MIN && n <= SCORE_MAX;
}

export function noteOf(e: JournalEntry | undefined, field: ScoreField): string {
  return e?.[NOTE_KEY[field]] ?? '';
}

export function isEmptyEntry(e?: JournalEntry): boolean {
  if (!e) return true;
  return FIELDS.every((f) => e[f] === undefined && !noteOf(e, f).trim());
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

/** Enregistre le commentaire d'une note (texte tel quel, vide = retiré). */
export function setNote(entries: EntryMap, day: DayKey, field: ScoreField, text: string): EntryMap {
  const next: JournalEntry = { ...(entries[day] ?? {}) };
  const key = NOTE_KEY[field];
  if (text.trim()) next[key] = text;
  else delete next[key];
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
  const scores = FIELDS.map((f) => e[f]).filter(isScore);
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
