// Modèle des tâches + logique pure (sas, matrice d'Eisenhower, glissement, charge).
// Une « tâche » vient de deux endroits, présentés comme une seule liste (TaskItem) :
//  - le module Tâches (saisie rapide, pas d'heure) ;
//  - un événement du calendrier coché « Tâche » (il a un créneau). Il n'est jamais copié : il reste dans le calendrier.
// Testé dans model.test.ts. Les imports gardent l'extension .ts pour que `npm test` les lise.
import { addDays, toKey } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';
import type { CalendarEvent, ItemLine } from '../calendar/model.ts';

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
  /** Placée dans « The One Thing » (seulement en la déplaçant à la main) : à faire tout de suite. */
  oneThing?: boolean;
  /** Contenu : absent ou 'tache' = encart libre (note) ; 'liste' = check-liste (courses, étapes…) dans `items`. */
  kind?: IdeaKind;
  items?: ItemLine[];
  /** Tâche (administratif, ménage, courses…) ou Idée (projet, pense-bête…). Absent = tâche. */
  type?: TaskType;
  /** « À faire avant le… » : deux jours avant, elle devient urgente (voir `deadlineUpdates`). */
  deadline?: DayKey;
}

export type TaskType = 'tache' | 'idee';

export type IdeaKind = 'tache' | 'liste';
/** Le contenu : un encart vide ou une check-liste, quel que soit le type (rendez-vous, événement, tâche ou idée). */
export const IDEA_KINDS: { id: IdeaKind; label: string }[] = [
  { id: 'tache', label: 'Encart libre' },
  { id: 'liste', label: 'Check-liste' },
];

/** Ce qu'on programme (13 nov., Valentin) : la première question après le titre. */
export type ProgramType = 'rdv' | 'evenement' | TaskType | 'rappel';

export const PROGRAM_TYPES: { id: ProgramType; label: string; examples: string; icon: 'clock' | 'sun' | 'check-square' | 'zap' | 'bell' }[] = [
  { id: 'rdv', label: 'Rendez-vous', examples: 'Médecin, coiffeur…', icon: 'clock' },
  { id: 'evenement', label: 'Événement', examples: 'Soirée, vacances…', icon: 'sun' },
  { id: 'tache', label: 'Tâche', examples: 'Administratif, ménage, courses…', icon: 'check-square' },
  { id: 'idee', label: 'Idée', examples: 'Projet, pense-bête…', icon: 'zap' },
  { id: 'rappel', label: 'Rappel', examples: 'Date butoir : impôts avant le 15…', icon: 'bell' },
];

/** Une tâche devient urgente quand sa date limite est à 2 jours ou moins. */
export const DEADLINE_URGENT_DAYS = 2;

// ---- Matrice d'Eisenhower ----

export type QuadrantId = 'one' | 'faire' | 'planifier' | 'alleger' | 'lacher' | 'vrac';

export const QUADRANTS: { id: QuadrantId; label: string; hint: string; icon: 'star' | 'zap' | 'calendar' | 'users' | 'wind' | 'inbox' }[] = [
  { id: 'one', label: 'The One Thing', hint: 'Réussir sa journée !', icon: 'star' },
  { id: 'faire', label: 'Urgent et important', hint: 'À faire maintenant !', icon: 'zap' },
  { id: 'planifier', label: 'Important', hint: 'Il faut que tu programmes cette idée', icon: 'calendar' },
  { id: 'alleger', label: 'Urgent', hint: '', icon: 'users' },
  { id: 'lacher', label: 'Abandonner ?', hint: 'Si une idée tombe ici c’est pas bon...', icon: 'wind' },
  { id: 'vrac', label: 'En vrac', hint: 'Les idées à trier : nouvelles, ou sorties de la matrice cette nuit', icon: 'inbox' },
];

export const quadrantInfo = (id: QuadrantId) => QUADRANTS.find((q) => q.id === id) ?? QUADRANTS[0];

const QUADRANT_RANK: Record<QuadrantId, number> = { one: 0, faire: 1, planifier: 2, alleger: 3, lacher: 4, vrac: 5 };

/** Ce qui sert à trier : commun aux tâches du module et aux événements « Tâche ». */
export interface Triable {
  important: boolean | null;
  urgent: boolean | null;
  status: TaskStatus;
  day: DayKey | null;
  rank?: number;
  oneThing?: boolean;
}

/**
 * La case d'une idée. « Ne sais pas » (null) sur l'importance ou l'urgence : elle va « En vrac », la liste sous la matrice,
 * en attendant d'être triée (pas de longue liste au-dessus de The One Thing).
 */
export function quadrantOf(t: Pick<Triable, 'important' | 'urgent' | 'oneThing'>): QuadrantId {
  if (t.important === null || t.urgent === null) return 'vrac';
  if (t.oneThing && t.important && t.urgent) return 'one';
  if (t.important) return t.urgent ? 'faire' : 'planifier';
  return t.urgent ? 'alleger' : 'lacher';
}

/** Pas encore répartie : au moins un « Ne sais pas ». */
export const toSort = (t: Pick<Triable, 'important' | 'urgent'>) => t.important === null || t.urgent === null;

/**
 * Nombre d'idées « En vrac » à trier : celles qui n'ont pas de priorité et ne sont ni faites ni abandonnées.
 * Une idée neuve, ou sortie de la matrice par le vidage de 3 h (nightlyReset), en fait partie : la matrice se vide
 * chaque nuit, donc il y a chaque jour quelque chose à trier. C'est le chiffre du badge sur « Idées ».
 */
export const toSortCount = (items: Pick<Triable, 'important' | 'urgent' | 'status'>[]): number =>
  items.reduce((n, t) => (t.status === 'todo' && toSort(t) ? n + 1 : n), 0);

/**
 * Les 3 mots de la priorité (13 nov.) : Urgent, Important, Ne sais pas.
 * Urgent et Important se cumulent (les deux = « Urgent et important ») ; Ne sais pas = En vrac.
 * Enlever le dernier mot coché revient à Ne sais pas.
 */
export type PriorityWord = 'urgent' | 'important' | 'nsp';

export function pickPriority(cur: Pick<Triable, 'important' | 'urgent'>, word: PriorityWord): { important: boolean | null; urgent: boolean | null } {
  if (word === 'nsp') return { important: null, urgent: null };
  const known = cur.important !== null && cur.urgent !== null;
  const important = known ? !!cur.important : false;
  const urgent = known ? !!cur.urgent : false;
  const next = word === 'urgent' ? { important, urgent: !urgent } : { important: !important, urgent };
  return next.important || next.urgent ? next : { important: null, urgent: null };
}

export const priorityWordOn = (cur: Pick<Triable, 'important' | 'urgent'>, word: PriorityWord) =>
  word === 'nsp' ? cur.important === null || cur.urgent === null : word === 'urgent' ? cur.urgent === true : cur.important === true;

/** Peut-on la mettre au calendrier ? Seulement si elle est dans The One Thing ou « Urgent et important ». */
export const canSchedule = (t: Pick<Triable, 'important' | 'urgent' | 'oneThing'>) => {
  const q = quadrantOf(t);
  return q === 'one' || q === 'faire';
};

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
  kind: IdeaKind;
  items?: ItemLine[];
  type: TaskType;
  deadline?: DayKey;
}

export function taskToItem(t: Task): TaskItem {
  return {
    key: `task:${t.id}`, source: 'task', id: t.id, title: t.title, day: t.day, start: null, durationMin: 0,
    important: t.important, urgent: t.urgent, status: t.status, slides: t.slides, category: t.category,
    rank: t.rank, note: t.note, oneThing: t.oneThing, kind: t.kind ?? 'tache', items: t.items,
    type: t.type ?? 'tache', deadline: t.deadline,
  };
}

/**
 * Un événement coché « Tâche » devient un élément de la liste.
 * Les séries (chaque jour, chaque semaine…) restent dans le calendrier : elles n'ont pas de priorité à trier.
 */
export function eventToItem(e: CalendarEvent): TaskItem | null {
  const k = e.kinds ?? [];
  // Tâche ou liste (« objet » sans rendez-vous) ; un rendez-vous, même avec des objets, reste dans le calendrier.
  if (!(k.includes('tache') || (k.includes('objet') && !k.includes('rdv'))) || e.repeat !== 'none' || e.sentToSas) return null;
  return {
    key: `event:${e.id}`, source: 'event', id: e.id, title: e.title, day: e.date,
    start: e.start, durationMin: e.durationMin,
    important: e.important ?? null, urgent: e.urgent ?? null,
    status: e.doneDays?.includes(e.date) ? 'done' : 'todo',
    slides: 0, category: e.category, rank: e.rank, note: e.note, oneThing: e.oneThing,
    kind: k.includes('objet') ? 'liste' : 'tache', items: k.includes('objet') ? (e.items ?? (e.item ? [{ id: 'old', text: e.item }] : [])) : undefined,
    type: 'tache',
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

// ---- Points : le tri automatique ----

/** Important = 2, urgent = 1 (donc 0 à 3). Pas affiché : sert seulement à ranger. */
export function pointsOf(t: Pick<Triable, 'important' | 'urgent'>): 0 | 1 | 2 | 3 {
  return ((t.important ? 2 : 0) + (t.urgent ? 1 : 0)) as 0 | 1 | 2 | 3;
}

/** Priorité (important, urgent) qui correspond à une liste. */
export function priorityOf(q: QuadrantId): { important: boolean | null; urgent: boolean | null } {
  if (q === 'vrac') return { important: null, urgent: null };
  return { important: q === 'one' || q === 'faire' || q === 'planifier', urgent: q === 'one' || q === 'faire' || q === 'alleger' };
}

export interface PriorityUpdate {
  key: string;
  important: boolean | null;
  urgent: boolean | null;
  rank?: number;
  oneThing: boolean;
}

/**
 * Chaque nuit, ce qui est dans Important, Urgent et Abandonner sort de la matrice et retourne « En vrac » (priorité effacée),
 * pour refaire le tri et s'assurer que chaque idée est encore pertinente. The One Thing et Urgent et important restent
 * jusqu'à ce qu'elles soient faites ; une idée déjà programmée au calendrier ne bouge pas.
 */
export function nightlyReset(items: TaskItem[], today?: DayKey): PriorityUpdate[] {
  const out = ['planifier', 'alleger', 'lacher'] as QuadrantId[];
  return items
    .filter((i) => i.status === 'todo' && i.day === null && out.includes(quadrantOf(i)) && !(today && deadlineNear(i, today)))
    .map((i) => ({ key: i.key, important: null, urgent: null, rank: undefined, oneThing: false }));
}

/** Date limite à 2 jours ou moins (ou dépassée). */
export const deadlineNear = (t: Pick<TaskItem, 'deadline'>, today: DayKey) => !!t.deadline && t.deadline <= addDays(today, DEADLINE_URGENT_DAYS);

/**
 * Date limite qui approche : la tâche devient urgente (son importance ne change pas ; « Ne sais pas » devient « pas important »
 * pour qu'elle sorte d'En vrac et se voie dans Urgent).
 */
export function deadlineUpdates(items: TaskItem[], today: DayKey): PriorityUpdate[] {
  return items
    .filter((i) => i.status === 'todo' && i.urgent !== true && deadlineNear(i, today))
    .map((i) => ({ key: i.key, important: i.important ?? false, urgent: true, rank: i.rank, oneThing: !!i.oneThing }));
}

/** Libellé court d'une date limite. */
export function deadlineLabel(deadline: DayKey, today: DayKey): string {
  if (deadline < today) return 'Date limite dépassée';
  if (deadline === today) return 'À faire aujourd’hui au plus tard';
  if (deadline === addDays(today, 1)) return 'Avant demain soir';
  const [y, m, d] = deadline.split('-').map(Number);
  const mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][m - 1];
  return `Avant le ${d} ${mois}${y !== Number(today.slice(0, 4)) ? ` ${y}` : ''}`;
}

/** Jour « de la matrice » : la nuit finit à 3 h (avant 3 h on est encore la veille). */
export function matrixDay(now: Date = new Date()): DayKey {
  return toKey(new Date(now.getTime() - 3 * 60 * 60 * 1000));
}

/**
 * Déplace une idée dans une liste, à la position `index` (0 = tout en haut).
 * Renvoie seulement ce qui change : l'idée déplacée (nouvelle liste, nouvelle place) et les voisins dont la place bouge.
 * « The One Thing » ne contient qu'une idée : celle qui y était retourne tout en haut de « Urgent et important ».
 */
export function moveIdea(items: TaskItem[], key: string, target: QuadrantId, index: number): PriorityUpdate[] {
  const moved = items.find((i) => i.key === key);
  if (!moved) return [];
  const updates: PriorityUpdate[] = [];
  const place = (list: TaskItem[], q: QuadrantId) => {
    const p = priorityOf(q);
    list.forEach((i, n) => {
      if (i.rank === n && quadrantOf(i) === q) return;
      updates.push({ key: i.key, ...p, rank: n, oneThing: q === 'one' });
    });
  };
  const others = byQuadrant(items, target).filter((i) => i.key !== key);
  if (target === 'one') {
    const faire = [...others, ...byQuadrant(items, 'faire').filter((i) => i.key !== key)];
    place([moved], 'one');
    place(faire, 'faire');
    return updates;
  }
  const at = Math.max(0, Math.min(index, others.length));
  place([...others.slice(0, at), moved, ...others.slice(at)], target);
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
    return QUADRANT_RANK[quadrantOf(t)];
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
    ...((e.kinds ?? []).includes('objet') ? { kind: 'liste' as const, items: (e.items ?? []).map((i) => ({ ...i, done: false })) } : {}),
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

/** À l'enregistrement : une date limite proche rend la tâche urgente tout de suite (sans attendre la nuit). */
export function applyDeadline(t: Task, today: DayKey): Task {
  if (t.status !== 'todo' || t.urgent === true || !deadlineNear(t, today)) return t;
  return { ...t, urgent: true, important: t.important ?? false };
}

/** Le tri guidé : répond aux deux questions et choisit éventuellement un jour. */
export function sortTask(t: Task, important: boolean, urgent: boolean, day: DayKey | null): Task {
  return { ...t, important, urgent, day };
}

export function setDone(t: Task, done: boolean, today: DayKey): Task {
  return done ? { ...t, status: 'done', doneAt: today, oneThing: undefined } : { ...t, status: 'todo', doneAt: undefined };
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
    repeat: 'none', kinds: t.kind === 'liste' ? ['tache', 'objet'] : ['tache'], reminders: [{ amount: 30, unit: 'min' }],
    items: t.kind === 'liste' ? t.items : undefined,
    important: t.important, urgent: t.urgent, note: t.note, rank: t.rank, oneThing: t.oneThing,
  };
}

/** Donne sa priorité à un événement « Tâche » (tri guidé du sas). */
export function sortEvent(e: CalendarEvent, important: boolean, urgent: boolean): CalendarEvent {
  return { ...e, important, urgent };
}
