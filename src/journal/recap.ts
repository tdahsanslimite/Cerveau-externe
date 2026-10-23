// Logique pure du « Recap » du Journal : l'année en 12 mois dépliables, et le classement bon / mauvais jour.
// Aucune dépendance à React : testé dans recap.test.ts.
//
// Bon jour = note AU-DESSUS de la moyenne ; mauvais jour = note EN DESSOUS. À égalité : ni l'un ni l'autre.
// La moyenne est celle de TOUS les jours notés (pas seulement ceux du mois affiché) : elle sert de repère fixe,
// sinon, en regardant un seul mois, la moitié des jours serait toujours « bonne » et l'autre « mauvaise ».
import { monthDays } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';
import { BASELINE_MIN_DAYS, FIELDS, FIELD_LABEL, isEmptyEntry, isScore, totalScore } from './model.ts';
import type { EntryMap, JournalEntry, ScoreField } from './model.ts';

/** Ce qu'on compare à la moyenne : le total des 3 notes, ou une seule des notes. */
export type Metric = 'total' | ScoreField;

export const METRICS: { id: Metric; label: string }[] = [
  { id: 'total', label: 'Les 3 notes (total)' },
  ...FIELDS.map((f) => ({ id: f as Metric, label: FIELD_LABEL[f] })),
];

export type Rel = 'good' | 'bad' | 'usual';
export type DayFilter = 'all' | 'good' | 'bad';

/** Valeur d'un jour pour la note choisie. Le total n'existe que si les 3 notes sont posées. */
export function metricValue(e: JournalEntry | undefined, metric: Metric): number | null {
  if (metric === 'total') return totalScore(e);
  const v = e?.[metric];
  return isScore(v) ? v : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Moyenne de la note sur tous les jours notés jusqu'à `today` (valeur exacte). Null s'il y a moins de 3 jours. */
export function overallAverage(entries: EntryMap, metric: Metric, today: DayKey): number | null {
  const values = Object.keys(entries)
    .filter((d) => d <= today)
    .map((d) => metricValue(entries[d], metric))
    .filter((v): v is number => v !== null);
  if (values.length < BASELINE_MIN_DAYS) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Au-dessus / en dessous de la moyenne. Null s'il manque la valeur ou la moyenne. */
export function relation(value: number | null, avg: number | null): Rel | null {
  if (value === null || avg === null) return null;
  if (value > avg) return 'good';
  if (value < avg) return 'bad';
  return 'usual';
}

/** Années proposées : celles où il y a des notes, plus l'année en cours, de la plus récente à la plus ancienne. */
export function recapYears(entries: EntryMap, today: DayKey): number[] {
  const years = new Set<number>([Number(today.slice(0, 4))]);
  for (const d of Object.keys(entries)) {
    if (d <= today && !isEmptyEntry(entries[d])) years.add(Number(d.slice(0, 4)));
  }
  return [...years].sort((a, b) => b - a);
}

export interface RecapDay {
  day: DayKey;
  entry?: JournalEntry;
  /** Valeur de la note choisie ce jour-là (null = pas de valeur). */
  value: number | null;
  rel: Rel | null;
}

export interface RecapMonth {
  /** 1 à 12. */
  month: number;
  /** Mois qui n'a pas commencé : rien à montrer. */
  future: boolean;
  /** Les jours du mois jusqu'à aujourd'hui (le filtre bon / mauvais est appliqué). Les jours à venir n'y sont pas. */
  days: RecapDay[];
  /** Jours avec quelque chose d'écrit (indépendant du filtre). */
  noted: number;
  /** Jours au-dessus / en dessous de la moyenne (indépendant du filtre). */
  good: number;
  bad: number;
  /** Moyenne de la note sur ce mois (1 décimale), null s'il n'y a aucune valeur. */
  average: number | null;
}

/** Le mois `month` (1-12) de `year`, avec tous ses jours jusqu'à `today`. */
export function recapMonth(
  entries: EntryMap, year: number, month: number, today: DayKey, metric: Metric, avg: number | null, filter: DayFilter,
): RecapMonth {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const future = first > today;
  const all: RecapDay[] = future
    ? []
    : monthDays(first)
        .filter((d) => d <= today)
        .map((d) => {
          const value = metricValue(entries[d], metric);
          return { day: d, entry: entries[d], value, rel: relation(value, avg) };
        });
  const values = all.map((d) => d.value).filter((v): v is number => v !== null);
  return {
    month,
    future,
    days: filter === 'all' ? all : all.filter((d) => d.rel === filter),
    noted: all.filter((d) => !isEmptyEntry(d.entry)).length,
    good: all.filter((d) => d.rel === 'good').length,
    bad: all.filter((d) => d.rel === 'bad').length,
    average: values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null,
  };
}

/** Les mois à afficher : tous, ou un seul. Avec un filtre bon / mauvais, les mois sans jour correspondant disparaissent. */
export function recapMonths(
  entries: EntryMap, year: number, month: number | null, today: DayKey, metric: Metric, avg: number | null, filter: DayFilter,
): RecapMonth[] {
  const months = month === null ? Array.from({ length: 12 }, (_, i) => i + 1) : [month];
  return months
    .map((m) => recapMonth(entries, year, m, today, metric, avg, filter))
    .filter((m) => filter === 'all' || m.days.length > 0);
}
