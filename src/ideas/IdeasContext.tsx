// Données de l'onglet Idées, stockées sur le téléphone (clé ce.ideas.v1).
// Ne jamais changer la forme de cette clé : seulement ajouter des champs facultatifs.
import React, { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';
import { todayKey } from '../calendar/dates';
import { useSettings } from '../settings/SettingsContext';
import { usePersistentState } from '../storage';
import {
  addItem, addList, clearDone, DEFAULT_IDEAS, IdeaItem, IdeaList, IdeasData, IdeasReminder, removeItem, removeList,
  renameList, updateItem,
} from './model';
import { syncIdeasReminder } from './notifications';

interface Ctx {
  lists: IdeaList[];
  items: IdeaItem[];
  reminder: IdeasReminder;
  loaded: boolean;
  /** Note une idée (par défaut dans « En vrac »), sans rien décider d'autre. */
  capture: (title: string, listId?: string) => void;
  update: (id: string, patch: Partial<Pick<IdeaItem, 'title' | 'listId' | 'done'>>) => void;
  remove: (id: string) => void;
  /** Retire les éléments cochés d'une liste (ou de toutes si `listId` est null). */
  clearChecked: (listId: string | null) => void;
  /** Crée une liste et renvoie son identifiant (null si le titre est vide ou déjà pris). */
  createList: (title: string) => string | null;
  rename: (id: string, title: string) => void;
  deleteList: (id: string) => void;
  setReminder: (r: IdeasReminder) => void;
}

const IdeasCtx = createContext<Ctx | null>(null);

export function IdeasProvider({ children }: { children: ReactNode }) {
  const [data, setData, loaded] = usePersistentState<IdeasData>('ce.ideas.v1', DEFAULT_IDEAS);
  const { settings } = useSettings();

  // Programme le rappel de tri au démarrage puis à chaque changement de réglage.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => void syncIdeasReminder(data.reminder, settings.defaultAlert), 500);
    return () => clearTimeout(t);
  }, [loaded, data.reminder, settings.defaultAlert]);

  const value = useMemo<Ctx>(() => ({
    lists: data.lists,
    items: data.items,
    reminder: data.reminder,
    loaded,
    capture: (title, listId = 'vrac') => setData((d) => ({ ...d, items: addItem(d.items, title, listId, todayKey()) })),
    update: (id, patch) => setData((d) => ({ ...d, items: updateItem(d.items, id, patch) })),
    remove: (id) => setData((d) => ({ ...d, items: removeItem(d.items, id) })),
    clearChecked: (listId) => setData((d) => ({ ...d, items: clearDone(d.items, listId) })),
    createList: (title) => {
      // La liste est créée une seule fois, ici, pour pouvoir renvoyer son identifiant tout de suite.
      const out = addList(data.lists, title);
      const created = out.lists.find((l) => l.id === out.id);
      if (!created) return null;
      setData((d) => (d.lists.some((l) => l.id === created.id) ? d : { ...d, lists: [...d.lists, created] }));
      return created.id;
    },
    rename: (id, title) => setData((d) => ({ ...d, lists: renameList(d.lists, id, title) })),
    deleteList: (id) => setData((d) => ({ ...d, ...removeList(d, id) })),
    setReminder: (reminder) => setData((d) => ({ ...d, reminder })),
  }), [data, loaded, setData]);

  return <IdeasCtx.Provider value={value}>{children}</IdeasCtx.Provider>;
}

export function useIdeas() {
  const ctx = useContext(IdeasCtx);
  if (!ctx) throw new Error('useIdeas hors de IdeasProvider');
  return ctx;
}
