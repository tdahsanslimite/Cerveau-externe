// Modèle des routines + logique pure (qui est prévu quel jour, bilan du mois).
// Aucune dépendance à React : testé dans model.test.ts.
//
// Principe : une routine n'est jamais « recopiée » d'un mois à l'autre. Elle existe
// à partir d'un jour (`start`) et jusqu'à son retrait éventuel (`end`). Chaque mois
// la retrouve donc toute seule, et retirer une routine ne réécrit pas le passé.
import { DAY_SHORT, monthDays, weekdayIndex } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';

export type Moment = 'matin' | 'journee' | 'soir';

export const MOMENTS: { id: Moment; label: string }[] = [
  { id: 'matin', label: 'Matin' },
  { id: 'journee', label: 'Journée' },
  { id: 'soir', label: 'Soir' },
];

export const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];

export interface Routine {
  id: string;
  title: string;
  moment: Moment;
  /** Jours de la semaine concernés : 0 = lundi … 6 = dimanche. */
  days: number[];
  /** Premier jour où la routine existe. */
  start: DayKey;
  /** Dernier jour où elle existe, si elle a été retirée. */
  end?: DayKey;
}

/** Cases cochées : pour chaque jour, les identifiants des routines faites. */
export type DoneMap = Record<DayKey, string[]>;

/** « Tous les jours », « Lun – ven », « Lun, mer, ven »… */
export function daysLabel(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Tous les jours';
  if (sorted.length === 5 && sorted.every((d, i) => d === i)) return 'Lun – ven';
  if (sorted.length === 2 && sorted[0] === 5 && sorted[1] === 6) return 'Week-end';
  return sorted.map((d) => DAY_SHORT[d]).join(', ');
}

/** La routine existe-t-elle ce jour-là (indépendamment des jours de la semaine) ? */
export function isActive(r: Routine, day: DayKey): boolean {
  // Les clés "YYYY-MM-DD" se comparent correctement comme du texte.
  return day >= r.start && (r.end === undefined || day <= r.end);
}

/** La routine est-elle à faire ce jour-là ? */
export function isDue(r: Routine, day: DayKey): boolean {
  return isActive(r, day) && r.days.includes(weekdayIndex(day));
}

const momentRank = (m: Moment) => MOMENTS.findIndex((x) => x.id === m);

/** Routines à faire un jour donné : matin, puis journée, puis soir ; à égalité, ordre de création. */
export function routinesOn(routines: Routine[], day: DayKey): Routine[] {
  return routines
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => isDue(r, day))
    .sort((a, b) => momentRank(a.r.moment) - momentRank(b.r.moment) || a.i - b.i)
    .map(({ r }) => r);
}

export function isDone(done: DoneMap, day: DayKey, id: string): boolean {
  return done[day]?.includes(id) ?? false;
}

/** Coche ou décoche une routine pour un jour, sans modifier l'objet d'origine. */
export function toggleDone(done: DoneMap, day: DayKey, id: string): DoneMap {
  const current = done[day] ?? [];
  if (current.includes(id)) {
    const rest = current.filter((x) => x !== id);
    const { [day]: _removed, ...others } = done;
    return rest.length ? { ...others, [day]: rest } : others;
  }
  return { ...done, [day]: [...current, id] };
}

/** On ne coche pas à l'avance : seuls aujourd'hui et le passé sont cochables. */
export function canCheck(day: DayKey, today: DayKey): boolean {
  return day <= today;
}

/** Combien de routines du jour sont cochées. */
export function dayProgress(routines: Routine[], done: DoneMap, day: DayKey): { done: number; total: number } {
  const due = routinesOn(routines, day);
  return { total: due.length, done: due.filter((r) => isDone(done, day, r.id)).length };
}

// ---------------- Bilan du mois ----------------

/**
 * État d'une case dans le bilan :
 * - done : cochée ;
 * - missed : prévue, jour passé, pas cochée ;
 * - upcoming : prévue mais encore à venir (y compris aujourd'hui tant que ce n'est pas coché) ;
 * - off : pas prévue ce jour-là.
 */
export type CellState = 'done' | 'missed' | 'upcoming' | 'off';

export interface RoutineMonth {
  routine: Routine;
  cells: { day: DayKey; state: CellState }[];
  /** Jours prévus et déjà écoulés (aujourd'hui compte seulement s'il est coché). */
  planned: number;
  done: number;
  /** Plus longue suite de jours prévus tous cochés. Les jours non prévus ne la cassent pas. */
  bestRun: number;
}

export function routineMonth(routine: Routine, done: DoneMap, anyDayOfMonth: DayKey, today: DayKey): RoutineMonth {
  const cells = monthDays(anyDayOfMonth).map((day) => {
    let state: CellState;
    if (!isDue(routine, day)) state = 'off';
    else if (isDone(done, day, routine.id)) state = 'done';
    else if (day >= today) state = 'upcoming';
    else state = 'missed';
    return { day, state };
  });

  let run = 0;
  let bestRun = 0;
  for (const c of cells) {
    if (c.state === 'done') {
      run += 1;
      bestRun = Math.max(bestRun, run);
    } else if (c.state !== 'off') {
      run = 0;
    }
  }
  const doneCount = cells.filter((c) => c.state === 'done').length;
  const missed = cells.filter((c) => c.state === 'missed').length;
  return { routine, cells, planned: doneCount + missed, done: doneCount, bestRun };
}

/** Bilan d'un mois : seules les routines qui existaient ce mois-là, avec au moins un jour prévu. */
export function monthReport(routines: Routine[], done: DoneMap, anyDayOfMonth: DayKey, today: DayKey): RoutineMonth[] {
  return routines
    .map((r) => routineMonth(r, done, anyDayOfMonth, today))
    .filter((m) => m.cells.some((c) => c.state !== 'off'));
}

export function newRoutineId(): string {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
