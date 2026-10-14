// Données du calendrier : événements + page libre de chaque semaine.
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { usePersistentState } from '../storage';
import type { DayKey } from './dates';
import type { CalendarEvent } from './model';

interface CalendarData {
  events: CalendarEvent[];
  /** Page de notes libres, indexée par le lundi de la semaine. */
  weekNotes: Record<DayKey, string>;
}

interface Ctx {
  events: CalendarEvent[];
  loaded: boolean;
  saveEvent: (e: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  /** Retire une seule occurrence d'un événement répété. */
  skipOccurrence: (id: string, day: DayKey) => void;
  weekNote: (weekStart: DayKey) => string;
  setWeekNote: (weekStart: DayKey, text: string) => void;
}

const CalendarCtx = createContext<Ctx | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [data, setData, loaded] = usePersistentState<CalendarData>('ce.calendar.v1', { events: [], weekNotes: {} });

  const value = useMemo<Ctx>(() => ({
    events: data.events,
    loaded,
    saveEvent: (e) =>
      setData((d) => {
        const exists = d.events.some((x) => x.id === e.id);
        return { ...d, events: exists ? d.events.map((x) => (x.id === e.id ? e : x)) : [...d.events, e] };
      }),
    deleteEvent: (id) => setData((d) => ({ ...d, events: d.events.filter((x) => x.id !== id) })),
    skipOccurrence: (id, day) =>
      setData((d) => ({
        ...d,
        events: d.events.map((x) => (x.id === id ? { ...x, skipped: [...(x.skipped ?? []), day] } : x)),
      })),
    weekNote: (weekStart) => data.weekNotes[weekStart] ?? '',
    setWeekNote: (weekStart, text) => setData((d) => ({ ...d, weekNotes: { ...d.weekNotes, [weekStart]: text } })),
  }), [data, loaded, setData]);

  return <CalendarCtx.Provider value={value}>{children}</CalendarCtx.Provider>;
}

export function useCalendar() {
  const ctx = useContext(CalendarCtx);
  if (!ctx) throw new Error('useCalendar hors de CalendarProvider');
  return ctx;
}
