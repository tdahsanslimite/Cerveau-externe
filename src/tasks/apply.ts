// Applique des changements de priorité / de place à des éléments de la liste, où qu'ils vivent
// (module Tâches ou événement « Tâche » du calendrier).
import { useCallback } from 'react';
import { useCalendar } from '../calendar/CalendarContext';
import type { PriorityUpdate } from './model';
import { useTasks } from './TasksContext';

export function useApplyUpdates() {
  const { tasks, save } = useTasks();
  const { events, saveEvent } = useCalendar();
  return useCallback(
    (updates: PriorityUpdate[]) => {
      for (const u of updates) {
        const id = u.key.slice(u.key.indexOf(':') + 1);
        if (u.key.startsWith('task:')) {
          const t = tasks.find((x) => x.id === id);
          if (t) save({ ...t, important: u.important, urgent: u.urgent, rank: u.rank, oneThing: u.oneThing || undefined });
        } else {
          const e = events.find((x) => x.id === id);
          if (e) saveEvent({ ...e, important: u.important, urgent: u.urgent, rank: u.rank, oneThing: u.oneThing || undefined });
        }
      }
    },
    [tasks, events, save, saveEvent],
  );
}
