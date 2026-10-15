// Les tâches prévues un jour, affichées dans le calendrier (vues Jour et Semaine). Cochables, modifiables.
import React, { useState } from 'react';
import { View } from 'react-native';
import type { DayKey } from '../calendar/dates';
import { Card, SectionLabel } from '../ui';
import { TaskRow } from './components';
import { Task, tasksOn } from './model';
import { TaskEditor } from './TaskEditor';
import { useTasks } from './TasksContext';

/** Les lignes seules, à glisser dans une carte existante. N'affiche rien s'il n'y a pas de tâche ce jour-là. */
export function DayTaskRows({ day }: { day: DayKey }) {
  const { tasks, toggleDone } = useTasks();
  const [editing, setEditing] = useState<Task | null>(null);
  const list = tasksOn(tasks, day);
  return (
    <>
      {list.map((t) => (
        <TaskRow key={t.id} task={t} onPress={() => setEditing(t)} onToggle={(done) => toggleDone(t.id, done)} />
      ))}
      <TaskEditor task={editing} onClose={() => setEditing(null)} />
    </>
  );
}

/** Section « Tâches » de la vue Jour. N'affiche rien quand aucune tâche n'est prévue. */
export function DayTasks({ day }: { day: DayKey }) {
  const { tasks } = useTasks();
  if (tasksOn(tasks, day).length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>Tâches</SectionLabel>
      <Card>
        <DayTaskRows day={day} />
      </Card>
    </View>
  );
}
