// Modèle du Journal (suivi du quotidien) + logique pure : notes 1-10 avec un commentaire chacune, sommeil, moyennes, comparaison.
// Aucune dépendance à React : testé dans model.test.ts.
//
// Une entrée par jour, jusqu'à 4 notes : « Bonnes journées », « Bien dans ma tête », « Bien dans mon corps », « Bien dormi »
// (ajoutée le 17 nov., avec l'heure de coucher et de lever). Chaque note a son propre commentaire.
// Chacun choisit dans ses réglages les notes qu'il suit (`JournalPrefs`) : les autres sont masquées, jamais effacées.
// Tout est facultatif : un jour peut n'avoir qu'un chiffre, ou qu'un commentaire.
import { addDays } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';

export type ScoreField = 'mood' | 'mind' | 'body' | 'sleep';

/** Ordre d'affichage. */
export const FIELDS: ScoreField[] = ['mood', 'mind', 'body', 'sleep'];
/** Les 3 notes de la 1re version (avant le sommeil) : base des calculs quand on ne précise pas les notes suivies. */
export const CLASSIC_FIELDS: ScoreField[] = ['mood', 'mind', 'body'];

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
  /** « Bien dormi » (la nuit qui précède ce jour) : 1 = très mal dormi, 10 = très bien dormi. */
  sleep?: number;
  /** Commentaire de « Bien dormi ». */
  sleepNote?: string;
  /** Heure de coucher (la veille au soir, ou après minuit), en minutes depuis minuit. */
  bedTime?: number;
  /** Heure de lever (le matin de ce jour), en minutes depuis minuit. */
  wakeTime?: number;
}

export type EntryMap = Record<DayKey, JournalEntry>;

type NoteKey = 'note' | 'mindNote' | 'bodyNote' | 'sleepNote';

export const NOTE_KEY: Record<ScoreField, NoteKey> = { mood: 'note', mind: 'mindNote', body: 'bodyNote', sleep: 'sleepNote' };

export const FIELD_LABEL: Record<ScoreField, string> = {
  mood: 'Bonnes journées',
  mind: 'Bien dans ma tête',
  body: 'Bien dans mon corps',
  sleep: 'Bien dormi',
};

export function isScore(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= SCORE_MIN && n <= SCORE_MAX;
}

export function noteOf(e: JournalEntry | undefined, field: ScoreField): string {
  return e?.[NOTE_KEY[field]] ?? '';
}

export function isEmptyEntry(e?: JournalEntry): boolean {
  if (!e) return true;
  return FIELDS.every((f) => e[f] === undefined && !noteOf(e, f).trim()) && e.bedTime === undefined && e.wakeTime === undefined;
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

export type SleepTimeKey = 'bedTime' | 'wakeTime';

export function isClockTime(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 24 * 60;
}

/** Enregistre l'heure de coucher ou de lever d'un jour (minutes depuis minuit), null = effacer. */
export function setSleepTime(entries: EntryMap, day: DayKey, key: SleepTimeKey, minutes: number | null): EntryMap {
  const next: JournalEntry = { ...(entries[day] ?? {}) };
  if (minutes !== null && isClockTime(minutes)) next[key] = minutes;
  else delete next[key];
  return withEntry(entries, day, next);
}

/**
 * Durée de la nuit en minutes (coucher la veille → lever), null s'il manque une heure.
 * Un coucher après minuit (01:00 → 08:00) marche aussi. Coucher = lever : null (pas une nuit de 24 h).
 */
export function sleepDuration(e: JournalEntry | undefined): number | null {
  if (!e || !isClockTime(e.bedTime) || !isClockTime(e.wakeTime)) return null;
  const d = (e.wakeTime - e.bedTime + 24 * 60) % (24 * 60);
  return d === 0 ? null : d;
}

/** Les nuits se lisent de 14 h à 14 h le lendemain : 23:00 → 1380, 01:00 → 1500, 07:00 → 1860. */
export const NIGHT_PIVOT = 14 * 60;
export function nightMinute(m: number): number {
  return m < NIGHT_PIVOT ? m + 24 * 60 : m;
}

/** « 07:05 ». Accepte aussi une minute « de nuit » (au-delà de 24 h). */
export function formatClock(m: number): string {
  const v = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}

/** « 7 h 45 », « 8 h ». */
export function formatDuration(min: number): string {
  const r = Math.round(min);
  const h = Math.floor(r / 60), m = r % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

export interface SleepStats {
  /** Nombre de nuits avec les 2 heures. */
  nights: number;
  /** Coucher et lever moyens (minutes « de nuit », voir `nightMinute`), durée moyenne en minutes. */
  bed: number | null;
  wake: number | null;
  duration: number | null;
}

/** Moyennes des heures de sommeil sur une liste de jours (seulement les nuits complètes pour la durée). */
export function sleepStats(entries: EntryMap, days: DayKey[]): SleepStats {
  const beds = days.map((d) => entries[d]?.bedTime).filter(isClockTime).map(nightMinute);
  const wakes = days.map((d) => entries[d]?.wakeTime).filter(isClockTime).map(nightMinute);
  const durations = days.map((d) => sleepDuration(entries[d])).filter((v): v is number => v !== null);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return { nights: durations.length, bed: avg(beds), wake: avg(wakes), duration: avg(durations) };
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

/** Total des 3 notes de la 1re version : de 3 (1+1+1) à 30 (10+10+10). */
export const TOTAL_MIN = SCORE_MIN * CLASSIC_FIELDS.length;
export const TOTAL_MAX = SCORE_MAX * CLASSIC_FIELDS.length;

/** Repères fins des graphiques : sur une note (1-10) et sur le total (3-30). */
export const SCORE_LEVELS = [2.5, 5, 7.5];
export const TOTAL_LEVELS = [5, 10, 15, 20, 25];

/**
 * Total d'un jour = somme des notes posées parmi celles suivies (par défaut les 3 de la 1re version).
 * Décision de Valentin (17 nov.) : « ce qui compte c'est l'accumulation chaque jour » ; un jour avec moins de notes
 * fait simplement moins de points, et les jours d'avant le sommeil gardent leur total. null = aucune note posée.
 */
export function totalScore(e: JournalEntry | undefined, fields: ScoreField[] = CLASSIC_FIELDS): number | null {
  if (!e) return null;
  const scores = fields.map((f) => e[f]).filter(isScore);
  return scores.length ? scores.reduce((a, b) => a + b, 0) : null;
}

/**
 * Échelle et repères du graphique « total » selon le nombre de notes suivies.
 * 3 notes : 3 à 30, repères 5 · 10 · 15 · 20 · 25 (choix de Valentin) ; 2 notes : 2 à 20, repères 5 · 10 · 15 ;
 * 4 notes : 4 à 40, repères 10 · 20 · 30 (= 2,5 · 5 · 7,5 par note, comme le graphique des notes ; tous les 5 ferait 7 lignes).
 */
export function totalRange(count: number): { min: number; max: number; levels: number[] } {
  // L'échelle part de 0 : un jour avec une seule note posée peut faire moins que `count` points.
  const min = 0, max = SCORE_MAX * count;
  const step = count >= 4 ? 10 : 5;
  const levels: number[] = [];
  for (let l = step; l < max; l += step) if (l > min) levels.push(l);
  return { min, max, levels };
}

const FIELD_SHORT: Record<ScoreField, string> = { mood: 'Journée', mind: 'Tête', body: 'Corps', sleep: 'Sommeil' };

/** « Journée 9 · Tête 8 · Corps 6 » (seulement les notes posées, parmi celles suivies). */
export function shortSummary(e: JournalEntry, fields: ScoreField[] = FIELDS): string {
  return fields.filter((f) => isScore(e[f])).map((f) => `${FIELD_SHORT[f]} ${e[f]}`).join(' · ');
}

// ——— Réglages du Journal (17 nov., demande de Valentin : « tout le monde n'a pas des problèmes de sommeil ») ———

export type { TimePicker } from '../settings/timePicker';
import type { TimePicker } from '../settings/timePicker';

export interface JournalPrefs {
  /** Notes suivies, dans l'ordre de `FIELDS`. Au moins une. */
  fields: ScoreField[];
  /** Avec « Bien dormi » : demander aussi l'heure de coucher et de lever. */
  sleepTimes: boolean;
  /** Pour choisir une heure : roue (heures / minutes qui défilent) ou horloge (on touche le cadran). */
  picker: TimePicker;
}

/**
 * Proposition avant le premier choix : les notes déjà utilisées sur ce téléphone (rien ne disparaît pour
 * quelqu'un qui a déjà des données), sinon seulement « Bonnes journées » (le moins de choix possible).
 */
export function defaultPrefs(entries: EntryMap): JournalPrefs {
  const used = FIELDS.filter((f) => Object.values(entries).some((e) => isScore(e[f]) || noteOf(e, f).trim() !== ''));
  return { fields: used.length ? used : ['mood'], sleepTimes: true, picker: 'wheel' };
}

/** Ajoute ou retire une note suivie, en gardant l'ordre d'affichage. On ne retire jamais la dernière. */
export function toggleField(fields: ScoreField[], f: ScoreField): ScoreField[] {
  if (fields.includes(f)) return fields.length > 1 ? fields.filter((x) => x !== f) : fields;
  return FIELDS.filter((x) => x === f || fields.includes(x));
}

/** Les heures de coucher / lever sont demandées seulement si « Bien dormi » est suivi ET l'option cochée. */
export function asksSleepTimes(p: JournalPrefs): boolean {
  return p.fields.includes('sleep') && p.sleepTimes;
}

/** « 6,5 » : virgule française. */
export function formatScore(n: number): string {
  return String(n).replace('.', ',');
}
