// Données des tâches, stockées sur le téléphone (clé ce.tasks.v1).
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { usePersistentState } from '../storage';
import { todayKey } from '../calendar/dates';
import { useCalendar } from '../calendar/CalendarContext';
import { eventTasksToReturn, newTask, returnOverdueToSas, setDone, Task, taskFromMissedEvent } from './model';

interface TasksData {
  tasks: Task[];
}

interface Ctx {
  tasks: Task[];
  loaded: boolean;
  /** Dépose une tâche dans le sas (aucune décision à prendre). */
  capture: (title: string) => void;
  save: (t: Task) => void;
  toggleDone: (id: string, done: boolean) => void;
  remove: (id: string) => void;
}

const TasksCtx = createContext<Ctx | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [data, setData, loaded] = usePersistentState<TasksData>('ce.tasks.v1', { tasks: [] });

  const { events, loaded: calendarLoaded, saveEvent } = useCalendar();

  // Au chargement, puis chaque minute (passage de minuit appli ouverte) : les tâches pas cochées
  // un jour passé repassent par le sas (pas d'accumulation sur le lendemain).
  useEffect(() => {
    if (!loaded) return;
    const back = () => setData((d) => {
      const tasks = returnOverdueToSas(d.tasks, todayKey());
      return tasks === d.tasks ? d : { ...d, tasks };
    });
    back();
    const timer = setInterval(back, 60 * 1000);
    return () => clearInterval(timer);
  }, [loaded, setData]);

  // Même règle pour les événements « Tâche » du calendrier : le créneau reste (c'était prévu ce jour-là),
  // une nouvelle tâche part dans le sas. Revérifié à chaque changement du calendrier et chaque minute.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!loaded || !calendarLoaded) return;
    const today = todayKey();
    const missed = eventTasksToReturn(events, today);
    if (!missed.length) return;
    setData((d) => ({ ...d, tasks: [...d.tasks, ...missed.map((e) => taskFromMissedEvent(e, today))] }));
    for (const e of missed) saveEvent({ ...e, sentToSas: true });
  }, [events, loaded, calendarLoaded, saveEvent, setData, tick]);

  const value = useMemo<Ctx>(() => ({
    tasks: data.tasks,
    loaded,
    capture: (title) => {
      if (!title.trim()) return;
      setData((d) => ({ ...d, tasks: [...d.tasks, newTask(title, todayKey())] }));
    },
    save: (t) =>
      setData((d) => {
        const exists = d.tasks.some((x) => x.id === t.id);
        return { ...d, tasks: exists ? d.tasks.map((x) => (x.id === t.id ? t : x)) : [...d.tasks, t] };
      }),
    toggleDone: (id, done) =>
      setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === id ? setDone(x, done, todayKey()) : x)) })),
    remove: (id) => setData((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== id) })),
  }), [data, loaded, setData]);

  return <TasksCtx.Provider value={value}>{children}</TasksCtx.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksCtx);
  if (!ctx) throw new Error('useTasks hors de TasksProvider');
  return ctx;
}
