// Modèle des tâches + logique pure (sas, matrice d'Eisenhower, glissement, charge).
// Une « tâche » vient de deux endroits, présentés comme une seule liste (TaskItem) :
//  - le module Tâches (saisie rapide, pas d'heure) ;
//  - un événement du calendrier coché « Tâche » (il a un créneau). Il n'est jamais copié : il reste dans le calendrier.
// Testé dans model.test.ts. Les imports gardent l'extension .ts pour que `npm test` les lise.
import { addDays } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';
import type { CalendarEvent } from '../calendar/model.ts';

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
  /** Nombre de fois où la tâche est revenue au sas faute d'avoir été faite le jour prévu. */
  slides: number;
  /** Identifiant d'un domaine du calendrier (personnalisable). */
  category?: string;
  note?: string;
  /** Place dans sa liste (0 = tout en haut). Absent = pas encore placée à la main. */
  rank?: number;
}

// ---- Matrice d'Eisenhower ----

export type QuadrantId = 'faire' | 'planifier' | 'alleger' | 'lacher';

export const QUADRANTS: { id: QuadrantId; label: string; hint: string; icon: 'zap' | 'calendar' | 'users' | 'wind' }[] = [
  { id: 'faire', label: 'Urgent et important', hint: '2 points · à faire en premier', icon: 'zap' },
  { id: 'alleger', label: 'Urgent', hint: '1 point · pas important', icon: 'users' },
  { id: 'planifier', label: 'Important', hint: '1 point · pas urgent', icon: 'calendar' },
  { id: 'lacher', label: 'Abandonner ?', hint: '0 point · ni important, ni urgent', icon: 'wind' },
];

export const quadrantInfo = (id: QuadrantId) => QUADRANTS.find((q) => q.id === id) ?? QUADRANTS[0];

const QUADRANT_RANK: Record<QuadrantId, number> = { faire: 0, alleger: 1, planifier: 2, lacher: 3 };

/** Ce qui sert à trier : commun aux tâches du module et aux événements « Tâche ». */
export interface Triable {
  important: boolean | null;
  urgent: boolean | null;
  status: TaskStatus;
  day: DayKey | null;
  rank?: number;
}

export function quadrantOf(t: Pick<Triable, 'important' | 'urgent'>): QuadrantId | null {
  if (t.important === null || t.urgent === null) return null;
  if (t.important) return t.urgent ? 'faire' : 'planifier';
  return t.urgent ? 'alleger' : 'lacher';
}

export const isSorted = (t: Pick<Triable, 'important' | 'urgent'>) => quadrantOf(t) !== null;

// ---- Une seule liste : tâches du module + événements « Tâche » ----

export interface TaskItem extends Triable {
  /** Clé d'affichage unique ("task:ID" ou "event:ID"). */
  key: string;
  source: 'task' | 'event';
  id: string;
  title: string;
  /** Minutes depuis minuit, ou null (pas d'heure). Seuls les événements en ont une. */
  start: number | null;
  durationMin: number;
  slides: number;
  category?: string;
  note?: string;
}

export function taskToItem(t: Task): TaskItem {
  return {
    key: `task:${t.id}`, source: 'task', id: t.id, title: t.title, day: t.day, start: null, durationMin: 0,
    important: t.important, urgent: t.urgent, status: t.status, slides: t.slides, category: t.category,
    rank: t.rank, note: t.note,
  };
}

/**
 * Un événement coché « Tâche » devient un élément de la liste.
 * Les séries (chaque jour, chaque semaine…) restent dans le calendrier : elles n'ont pas de priorité à trier.
 */
export function eventToItem(e: CalendarEvent): TaskItem | null {
  if (!(e.kinds ?? []).includes('tache') || e.repeat !== 'none' || e.sentToSas) return null;
  return {
    key: `event:${e.id}`, source: 'event', id: e.id, title: e.title, day: e.date,
    start: e.start, durationMin: e.durationMin,
    important: e.important ?? null, urgent: e.urgent ?? null,
    status: e.doneDays?.includes(e.date) ? 'done' : 'todo',
    slides: 0, category: e.category, rank: e.rank, note: e.note,
  };
}

export function itemsOf(tasks: Task[], events: CalendarEvent[]): TaskItem[] {
  const fromEvents: TaskItem[] = [];
  for (const e of events) {
    const item = eventToItem(e);
    if (item) fromEvents.push(item);
  }
  return [...tasks.map(taskToItem), ...fromEvents];
}

// ---- Le sas : tout ce qui n'a pas encore de priorité ----

/**
 * Éléments à trier : pas faits, pas encore de priorité. Une tâche déposée sans réfléchir n'a pas de jour ;
 * un événement « Tâche » en a un (et un créneau), et attend seulement qu'on lui donne sa priorité.
 */
export function inSas<T extends Triable>(items: T[]): T[] {
  return items.filter((t) => t.status === 'todo' && !isSorted(t));
}

/**
 * Éléments d'une liste, pas encore faits, dans l'ordre choisi à la main (`rank`, 0 = tout en haut) ;
 * ceux qui n'ont jamais été placés viennent ensuite, du plus proche au plus lointain.
 */
export function byQuadrant<T extends Triable>(items: T[], id: QuadrantId): T[] {
  return items
    .filter((t) => t.status === 'todo' && quadrantOf(t) === id)
    .sort((a, b) => {
      if (a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank;
      if (a.rank !== undefined) return -1;
      if (b.rank !== undefined) return 1;
      return (a.day ?? '9999').localeCompare(b.day ?? '9999');
    });
}

// ---- Points : une première lecture de la priorité ----

/** Important = 1, urgent = 1, ni l'un ni l'autre = 0. Entre 0 et 2. Ne sert pas au calendrier. */
export function pointsOf(t: Pick<Triable, 'important' | 'urgent'>): 0 | 1 | 2 {
  return ((t.important ? 1 : 0) + (t.urgent ? 1 : 0)) as 0 | 1 | 2;
}

/** Priorité (important, urgent) qui correspond à une liste. */
export function priorityOf(q: QuadrantId): { important: boolean; urgent: boolean } {
  return { important: q === 'faire' || q === 'planifier', urgent: q === 'faire' || q === 'alleger' };
}

export interface PriorityUpdate {
  key: string;
  important: boolean;
  urgent: boolean;
  rank: number;
}

/**
 * Déplace une idée dans une liste, à la position `index` (0 = tout en haut).
 * Renvoie seulement ce qui change : l'idée déplacée (nouvelle liste, nouvelle place) et les voisins dont la place bouge.
 */
export function moveIdea(items: TaskItem[], key: string, target: QuadrantId, index: number): PriorityUpdate[] {
  const moved = items.find((i) => i.key === key);
  if (!moved) return [];
  const others = byQuadrant(items, target).filter((i) => i.key !== key);
  const at = Math.max(0, Math.min(index, others.length));
  const next = [...others.slice(0, at), moved, ...others.slice(at)];
  const p = priorityOf(target);
  const updates: PriorityUpdate[] = [];
  next.forEach((i, n) => {
    const same = i.rank === n && (i.key !== key || quadrantOf(i) === target);
    if (!same) updates.push({ key: i.key, ...p, rank: n });
  });
  return updates;
}

/**
 * Dans une note, un retour à la ligne après une ligne « - texte » ouvre la ligne suivante par « - » ;
 * un retour à la ligne après un « - » vide ferme la liste.
 */
export function continueList(before: string, after: string): string {
  if (after.length !== before.length + 1 || !after.endsWith('\n') || !after.startsWith(before)) return after;
  const last = before.split('\n').pop() ?? '';
  if (last === '- ') return before.slice(0, before.length - 2);
  if (last.startsWith('- ')) return `${after}- `;
  return after;
}

// ---- Jour ----

/**
 * Éléments prévus ce jour (faits ou non, jamais les lâchés).
 * À faire d'abord ; avec une heure avant sans heure, dans l'ordre de l'heure ; puis par priorité.
 */
export function tasksOn<T extends Triable & { start?: number | null }>(items: T[], day: DayKey): T[] {
  const rank = (t: T) => {
    const q = quadrantOf(t);
    return q === null ? 4 : QUADRANT_RANK[q];
  };
  const at = (t: T) => t.start ?? 24 * 60;
  return items
    .filter((t) => t.day === day && t.status !== 'dropped')
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || at(a) - at(b) || rank(a) - rank(b));
}

/** Nombre de tâches du module prévues ce jour : c'est ce qui s'ajoute aux événements dans la charge du jour. */
export const taskCountOn = (tasks: Task[], day: DayKey): number =>
  tasks.reduce((n, t) => (t.day === day && t.status !== 'dropped' ? n + 1 : n), 0);

// ---- Retour au sas ----

/**
 * Une tâche prévue un jour passé et pas cochée ne glisse PAS au lendemain : elle repasse par le sas,
 * sans jour ni priorité, pour qu'on décide à nouveau si elle vaut encore la peine (pas d'accumulation).
 * `slides` compte ces retours. Renvoie le même tableau (même référence) quand il n'y a rien à faire.
 */
export function returnOverdueToSas(tasks: Task[], today: DayKey): Task[] {
  const overdue = (t: Task) => t.status === 'todo' && t.day !== null && t.day < today;
  if (!tasks.some(overdue)) return tasks;
  return tasks.map((t) => (overdue(t) ? { ...t, day: null, important: null, urgent: null, slides: t.slides + 1 } : t));
}

/**
 * Événements « Tâche » ponctuels d'un jour passé, pas cochés : le créneau reste dans le calendrier
 * (c'était prévu ce jour-là), et une tâche toute neuve repart dans le sas.
 */
export function eventTasksToReturn(events: CalendarEvent[], today: DayKey): CalendarEvent[] {
  return events.filter(
    (e) => (e.kinds ?? []).includes('tache') && e.repeat === 'none' && !e.sentToSas
      && e.date < today && !e.doneDays?.includes(e.date),
  );
}

export function taskFromMissedEvent(e: CalendarEvent, today: DayKey): Task {
  return {
    id: newId(), title: e.title, createdAt: today, important: null, urgent: null, day: null,
    status: 'todo', slides: 1, category: e.category, note: e.note,
  };
}

/** Seuil à partir duquel on propose autre chose que de la repousser encore. */
export const STUCK_AFTER = 3;

export function slideLabel(t: Pick<TaskItem, 'status' | 'slides'>): string | null {
  if (t.status !== 'todo' || t.slides === 0) return null;
  return t.slides === 1 ? 'Revenue au sas 1 fois' : `Revenue au sas ${t.slides} fois`;
}

export const isStuck = (t: Pick<TaskItem, 'status' | 'slides'>) => t.status === 'todo' && t.slides >= STUCK_AFTER;

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

// ---- Passage d'une tâche au calendrier ----

/**
 * Brouillon d'événement « Tâche » créé à partir d'une tâche, pour la programmer dans le calendrier sans tout ressaisir :
 * intitulé, jour, domaine, note et priorité sont repris. Seule l'heure reste à choisir (9 h proposée).
 */
export function eventFromTask(t: Task, today: DayKey, domainIds: string[]): CalendarEvent {
  const category = t.category && domainIds.includes(t.category) ? t.category : domainIds.includes('travail') ? 'travail' : (domainIds[0] ?? 'travail');
  return {
    id: newId(), title: t.title.trim(), date: t.day ?? today, start: 9 * 60, durationMin: 60, category,
    repeat: 'none', kinds: ['tache'], reminders: [{ amount: 30, unit: 'min' }],
    important: t.important, urgent: t.urgent, note: t.note, rank: t.rank,
  };
}

/** Donne sa priorité à un événement « Tâche » (tri guidé du sas). */
export function sortEvent(e: CalendarEvent, important: boolean, urgent: boolean): CalendarEvent {
  return { ...e, important, urgent };
}
