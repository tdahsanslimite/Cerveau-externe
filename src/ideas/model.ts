// Modèle de l'onglet Idées + logique pure (listes, éléments, rappel de tri).
// Aucune dépendance à React : testé dans model.test.ts.
//
// Principe : on vide sa tête d'abord (tout tombe dans « En vrac »), on trie plus tard
// (déplacer un élément dans une liste : Vidéos, Courses…). Plus tard, ces éléments
// pourront être reliés aux tâches et au calendrier : `IdeaItem` reste donc volontairement simple.
import { minutesToLabel } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';

/** Liste d'accueil : tout ce qu'on note sans réfléchir y tombe. Elle ne peut pas être supprimée. */
export const VRAC_ID = 'vrac';

export interface IdeaList {
  id: string;
  title: string;
}

export interface IdeaItem {
  id: string;
  title: string;
  listId: string;
  createdAt: DayKey;
  done: boolean;
}

export type ReminderMode = 'off' | 'daily' | 'weekly';

export interface IdeasReminder {
  mode: ReminderMode;
  /** Heure du rappel, en minutes depuis minuit. */
  minutes: number;
  /** Jour du rappel hebdomadaire : 0 = lundi … 6 = dimanche. */
  weekday: number;
}

export interface IdeasData {
  lists: IdeaList[];
  items: IdeaItem[];
  reminder: IdeasReminder;
}

export const DEFAULT_REMINDER: IdeasReminder = { mode: 'off', minutes: 18 * 60, weekday: 6 };

export const DEFAULT_IDEAS: IdeasData = {
  lists: [{ id: VRAC_ID, title: 'En vrac' }],
  items: [],
  reminder: DEFAULT_REMINDER,
};

/** Idées de listes proposées à la création (modifiables). */
export const LIST_SUGGESTIONS = ['Vidéos', 'Courses', 'À acheter', 'À appeler'];

export const WEEKDAYS_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- éléments ----------

/** Ajoute un élément en tête de liste (le plus récent d'abord). Un titre vide n'ajoute rien. */
export function addItem(items: IdeaItem[], title: string, listId: string, today: DayKey): IdeaItem[] {
  const t = title.trim();
  if (!t) return items;
  return [{ id: newId(), title: t, listId, createdAt: today, done: false }, ...items];
}

export function updateItem(items: IdeaItem[], id: string, patch: Partial<Pick<IdeaItem, 'title' | 'listId' | 'done'>>): IdeaItem[] {
  return items.map((i) => {
    if (i.id !== id) return i;
    const title = patch.title === undefined ? i.title : patch.title.trim();
    return { ...i, ...patch, title: title || i.title };
  });
}

export const removeItem = (items: IdeaItem[], id: string): IdeaItem[] => items.filter((i) => i.id !== id);

/** Retire les éléments cochés (d'une liste, ou de toutes si `listId` est null). */
export function clearDone(items: IdeaItem[], listId: string | null): IdeaItem[] {
  return items.filter((i) => !(i.done && (listId === null || i.listId === listId)));
}

/** Éléments à afficher : ceux à faire d'abord (récents en haut), les cochés tout en bas. */
export function visibleItems(items: IdeaItem[], listId: string | null): IdeaItem[] {
  const inList = listId === null ? items : items.filter((i) => i.listId === listId);
  return [...inList.filter((i) => !i.done), ...inList.filter((i) => i.done)];
}

/** Nombre d'éléments pas encore cochés (d'une liste, ou de toutes si `listId` est null). */
export function openCount(items: IdeaItem[], listId: string | null): number {
  return items.filter((i) => !i.done && (listId === null || i.listId === listId)).length;
}

// ---------- listes ----------

/** Ajoute une liste. Refuse un titre vide ou déjà pris (sans tenir compte des majuscules). */
export function addList(lists: IdeaList[], title: string): { lists: IdeaList[]; id: string | null } {
  const t = title.trim();
  if (!t || lists.some((l) => l.title.toLowerCase() === t.toLowerCase())) return { lists, id: null };
  const id = newId();
  return { lists: [...lists, { id, title: t }], id };
}

export function renameList(lists: IdeaList[], id: string, title: string): IdeaList[] {
  const t = title.trim();
  if (!t || lists.some((l) => l.id !== id && l.title.toLowerCase() === t.toLowerCase())) return lists;
  return lists.map((l) => (l.id === id ? { ...l, title: t } : l));
}

/** Supprime une liste : ses éléments retournent « En vrac », rien n'est perdu. « En vrac » ne se supprime pas. */
export function removeList(data: Pick<IdeasData, 'lists' | 'items'>, id: string): Pick<IdeasData, 'lists' | 'items'> {
  if (id === VRAC_ID || !data.lists.some((l) => l.id === id)) return data;
  return {
    lists: data.lists.filter((l) => l.id !== id),
    items: data.items.map((i) => (i.listId === id ? { ...i, listId: VRAC_ID } : i)),
  };
}

/** Garde-fou : une liste inconnue (supprimée ailleurs) retombe sur « En vrac ». */
export const listTitle = (lists: IdeaList[], id: string): string => lists.find((l) => l.id === id)?.title ?? 'En vrac';

// ---------- rappel de tri ----------

export type ReminderTrigger =
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'weekly'; weekday: number; hour: number; minute: number };

/** Déclencheur du rappel. `weekday` suit la convention des notifications : 1 = dimanche … 7 = samedi. */
export function reminderTrigger(r: IdeasReminder): ReminderTrigger | null {
  if (r.mode === 'off') return null;
  const hour = Math.floor(r.minutes / 60);
  const minute = r.minutes % 60;
  if (r.mode === 'daily') return { kind: 'daily', hour, minute };
  return { kind: 'weekly', weekday: ((r.weekday + 1) % 7) + 1, hour, minute };
}

export function reminderLabel(r: IdeasReminder): string {
  if (r.mode === 'off') return 'Pas de rappel';
  const at = minutesToLabel(r.minutes);
  return r.mode === 'daily' ? `Chaque jour à ${at}` : `Chaque ${WEEKDAYS_LONG[r.weekday]} à ${at}`;
}
