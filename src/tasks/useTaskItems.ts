// La liste unique des tâches : celles du module Tâches + les événements « Tâche » du calendrier.
import { useMemo } from 'react';
import { useCalendar } from '../calendar/CalendarContext';
import { itemsOf, TaskItem } from './model';
import { useTasks } from './TasksContext';

export function useTaskItems(): TaskItem[] {
  const { tasks } = useTasks();
  const { events } = useCalendar();
  return useMemo(() => itemsOf(tasks, events), [tasks, events]);
}
