// Charge d'un jour = événements du calendrier + tâches prévues ce jour.
// On compte des éléments (pas du temps) et on compare à la limite choisie dans les réglages.
import { useCallback } from 'react';
import { useCalendar } from './calendar/CalendarContext';
import type { DayKey } from './calendar/dates';
import { occurrencesOn } from './calendar/model';
import { taskCountOn } from './tasks/model';
import { useTasks } from './tasks/TasksContext';

export function useDayLoad() {
  const { events } = useCalendar();
  const { tasks } = useTasks();
  /** `except` : élément en cours d'édition, à ne pas compter deux fois. */
  return useCallback(
    (day: DayKey, except?: { eventId?: string; taskId?: string }): number =>
      occurrencesOn(events.filter((e) => e.id !== except?.eventId), day).length +
      taskCountOn(tasks.filter((t) => t.id !== except?.taskId), day),
    [events, tasks],
  );
}
