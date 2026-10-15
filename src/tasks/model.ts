// Modèle des tâches + logique pure (sas, matrice d'Eisenhower, glissement, charge).
// Testé dans model.test.ts. Les imports gardent l'extension .ts pour que `npm test` les lise.
import { addDays } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';

export type TaskStatus = 'todo' | 'done' | 'dropped';

export interface Task {
  id: string;
  title: string;
  /** Jour où la tâche a été déposée dans le sas. */
  createdAt: DayKey;
  /** null = pas encore trié. */
  important: boolean | null;
  urgent: boolean | null;
  /** Jour prévu, ou null (« un jour »). */
  day: DayKey | null;
  /** `dropped` = lâchée : cachée partout, mais gardée pour un futur bilan. */
  status: TaskStatus;
  doneAt?: DayKey;
  /** Nombre de fois où la tâche a glissé vers un nouveau jour faute d'avoir été faite. */
  slides: number;
  /** Identifiant d'un domaine du calendrier (personnalisable). */
  category?: string;
  note?: string;
}

// ---- Matrice d'Eisenhower ----

export type QuadrantId = 'faire' | 'planifier' | 'alleger' | 'lacher';

export const QUADRANTS: { id: QuadrantId; label: string; hint: string; icon: 'zap' | 'calendar' | 'users' | 'wind' }[] = [
  { id: 'faire', label: 'À faire en premier', hint: 'Important et urgent', icon: 'zap' },
  { id: 'planifier', label: 'À planifier', hint: 'Important, pas urgent', icon: 'calendar' },
  { id: 'alleger', label: 'À déléguer ou alléger', hint: 'Urgent, pas important', icon: 'users' },
  { id: 'lacher', label: 'À lâcher ?', hint: 'Ni important, ni urgent', icon: 'wind' },
];

export const quadrantInfo = (id: QuadrantId) => QUADRANTS.find((q) => q.id === id) ?? QUADRANTS[0];

const QUADRANT_RANK: Record<QuadrantId, number> = { faire: 0, planifier: 1, alleger: 2, lacher: 3 };

export function quadrantOf(t: Pick<Task, 'important' | 'urgent'>): QuadrantId | null {
  if (t.important === null || t.urgent === null) return null;
  if (t.important) return t.urgent ? 'faire' : 'planifier';
  return t.urgent ? 'alleger' : 'lacher';
}

export const isSorted = (t: Task) => quadrantOf(t) !== null;

// ---- Le sas : tout ce qui a été déposé sans réfléchir ----

/** Tâches à trier : ni priorité, ni jour. Ne comptent dans aucune charge. */
export function inSas(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === 'todo' && !isSorted(t) && t.day === null);
}

/** Tâches triées (Eisenhower), pas encore faites, groupées par quadrant. */
export function byQuadrant(tasks: Task[], id: QuadrantId): Task[] {
  return tasks
    .filter((t) => t.status === 'todo' && quadrantOf(t) === id)
    .sort((a, b) => (a.day ?? '9999').localeCompare(b.day ?? '9999'));
}

// ---- Jour ----

/** Tâches prévues ce jour (faites ou non, jamais les lâchées). À faire d'abord, par priorité. */
export function tasksOn(tasks: Task[], day: DayKey): Task[] {
  const rank = (t: Task) => {
    const q = quadrantOf(t);
    return q === null ? 4 : QUADRANT_RANK[q];
  };
  return tasks
    .filter((t) => t.day === day && t.status !== 'dropped')
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || rank(a) - rank(b));
}

/** Nombre de tâches prévues ce jour : c'est ce qui s'ajoute aux événements dans la charge du jour. */
export const taskCountOn = (tasks: Task[], day: DayKey): number =>
  tasks.reduce((n, t) => (t.day === day && t.status !== 'dropped' ? n + 1 : n), 0);

// ---- Glissement ----

/**
 * Les tâches prévues un jour passé et pas faites glissent à aujourd'hui, sans reproche.
 * Renvoie le même tableau (même référence) quand il n'y a rien à faire glisser.
 */
export function slideOverdue(tasks: Task[], today: DayKey): Task[] {
  if (!tasks.some((t) => t.status === 'todo' && t.day !== null && t.day < today)) return tasks;
  return tasks.map((t) => (t.status === 'todo' && t.day !== null && t.day < today ? { ...t, day: today, slides: t.slides + 1 } : t));
}

/** Seuil à partir duquel on propose autre chose que de la repousser encore. */
export const STUCK_AFTER = 3;

export function slideLabel(t: Task): string | null {
  if (t.status !== 'todo' || t.slides === 0) return null;
  return t.slides === 1 ? 'Glissée 1 fois' : `Glissée ${t.slides} fois`;
}

export const isStuck = (t: Task) => t.status === 'todo' && t.slides >= STUCK_AFTER;

// ---- Fabrique et actions ----

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function newTask(title: string, today: DayKey): Task {
  return { id: newId(), title: title.trim(), createdAt: today, important: null, urgent: null, day: null, status: 'todo', slides: 0 };
}

/** Le tri guidé : répond aux deux questions et choisit éventuellement un jour. */
export function sortTask(t: Task, important: boolean, urgent: boolean, day: DayKey | null): Task {
  return { ...t, important, urgent, day };
}

export function setDone(t: Task, done: boolean, today: DayKey): Task {
  return done ? { ...t, status: 'done', doneAt: today } : { ...t, status: 'todo', doneAt: undefined };
}

export type WhenChoice = 'aujourdhui' | 'demain' | 'un-jour';

export function whenToDay(choice: WhenChoice, today: DayKey): DayKey | null {
  return choice === 'aujourdhui' ? today : choice === 'demain' ? addDays(today, 1) : null;
}
