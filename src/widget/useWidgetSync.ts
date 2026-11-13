// Garde le widget à jour : à chaque changement du calendrier (agendas du téléphone compris) ou de The One Thing,
// l'appli réécrit l'instantané des 8 prochains jours et redessine le widget (1 s après le dernier changement).
import { useEffect, useMemo } from 'react';
import { useCalendar } from '../calendar/CalendarContext';
import { todayKey } from '../calendar/dates';
import { byQuadrant } from '../tasks/model';
import { useTaskItems } from '../tasks/useTaskItems';
import { buildSnapshot } from './model';
import { syncWidget } from './sync';

export function useWidgetSync() {
  const { events, loaded, domain } = useCalendar();
  const items = useTaskItems();
  const oneThing = useMemo(() => byQuadrant(items, 'one')[0]?.title, [items]);
  const today = todayKey();
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => void syncWidget(buildSnapshot(events, today, (c) => domain(c).color, oneThing)), 1000);
    return () => clearTimeout(t);
  }, [events, loaded, oneThing, today]); // eslint-disable-line react-hooks/exhaustive-deps
}
