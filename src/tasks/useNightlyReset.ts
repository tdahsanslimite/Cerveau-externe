// Chaque nuit à 3 h : Important, Urgent et Abandonner se vident « en vrac » (voir nightlyReset),
// et une tâche dont la date limite est à 2 jours devient urgente (deadlineUpdates).
// Vérifié au lancement, au retour dans l'appli et chaque minute. Première fois (nouvelle version) : on note le jour sans rien vider.
import { useEffect, useRef } from 'react';
import { useCalendar } from '../calendar/CalendarContext';
import { useSettings } from '../settings/SettingsContext';
import { useApplyUpdates } from './apply';
import { deadlineUpdates, matrixDay, nightlyReset } from './model';
import { useTasks } from './TasksContext';
import { useTaskItems } from './useTaskItems';

export function useNightlyReset() {
  const items = useTaskItems();
  const apply = useApplyUpdates();
  const { loaded } = useTasks();
  const { loaded: calendarLoaded } = useCalendar();
  const { settings, loaded: settingsLoaded, update } = useSettings();
  const latest = useRef({ items, apply, settings, update });
  latest.current = { items, apply, settings, update };
  const ready = loaded && calendarLoaded && settingsLoaded;

  useEffect(() => {
    if (!ready) return;
    const check = () => {
      const { items, apply, settings, update } = latest.current;
      const day = matrixDay();
      if (settings.ideasResetDay === day) return;
      // Les deux listes ne se recoupent pas : une idée dont la date limite approche n'est pas vidée, elle devient urgente.
      if (settings.ideasResetDay) apply([...nightlyReset(items, day), ...deadlineUpdates(items, day)]);
      update({ ideasResetDay: day });
    };
    check();
    const timer = setInterval(check, 60 * 1000);
    return () => clearInterval(timer);
  }, [ready]);
}
