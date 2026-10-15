// Données des tâches, stockées sur le téléphone (clé ce.tasks.v1).
import React, { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';
import { usePersistentState } from '../storage';
import { todayKey } from '../calendar/dates';
import { newTask, setDone, slideOverdue, Task } from './model';

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

  // Au chargement, puis chaque minute (passage de minuit appli ouverte), les tâches en retard glissent à aujourd'hui.
  useEffect(() => {
    if (!loaded) return;
    const slide = () => setData((d) => {
      const tasks = slideOverdue(d.tasks, todayKey());
      return tasks === d.tasks ? d : { ...d, tasks };
    });
    slide();
    const timer = setInterval(slide, 60 * 1000);
    return () => clearInterval(timer);
  }, [loaded, setData]);

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
