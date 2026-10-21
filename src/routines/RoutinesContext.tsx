// Données des routines : la liste des routines + les cases cochées jour par jour.
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { usePersistentState } from '../storage';
import type { DayKey } from '../calendar/dates';
import { DoneMap, isDone, Routine, toggleDone } from './model';

interface RoutinesData {
  routines: Routine[];
  done: DoneMap;
  /** Moment (ms) de la dernière case cochée : sert à éteindre la pastille de l'onglet. Facultatif. */
  lastCheckAt?: number;
}

interface Ctx {
  routines: Routine[];
  done: DoneMap;
  lastCheckAt: number | null;
  loaded: boolean;
  saveRoutine: (r: Routine) => void;
  /** Retire une routine à partir de `lastDay` (inclus) : le passé et le bilan restent intacts. */
  retireRoutine: (id: string, lastDay: DayKey) => void;
  toggle: (day: DayKey, id: string) => void;
}

const RoutinesCtx = createContext<Ctx | null>(null);

export function RoutinesProvider({ children }: { children: ReactNode }) {
  const [data, setData, loaded] = usePersistentState<RoutinesData>('ce.routines.v1', { routines: [], done: {} });

  const value = useMemo<Ctx>(() => ({
    routines: data.routines,
    done: data.done,
    lastCheckAt: data.lastCheckAt ?? null,
    loaded,
    saveRoutine: (r) =>
      setData((d) => {
        const exists = d.routines.some((x) => x.id === r.id);
        return { ...d, routines: exists ? d.routines.map((x) => (x.id === r.id ? r : x)) : [...d.routines, r] };
      }),
    retireRoutine: (id, lastDay) =>
      setData((d) => ({
        ...d,
        routines: d.routines
          // Retirée avant même son premier jour : elle n'a jamais compté, on l'efface vraiment.
          .filter((x) => x.id !== id || lastDay >= x.start)
          .map((x) => (x.id === id ? { ...x, end: lastDay } : x)),
      })),
    toggle: (day, id) =>
      setData((d) => ({
        ...d,
        done: toggleDone(d.done, day, id),
        // Cocher (pas décocher) compte comme « j'ai fait quelque chose ».
        lastCheckAt: isDone(d.done, day, id) ? d.lastCheckAt : Date.now(),
      })),
  }), [data, loaded, setData]);

  return <RoutinesCtx.Provider value={value}>{children}</RoutinesCtx.Provider>;
}

export function useRoutines() {
  const ctx = useContext(RoutinesCtx);
  if (!ctx) throw new Error('useRoutines hors de RoutinesProvider');
  return ctx;
}
