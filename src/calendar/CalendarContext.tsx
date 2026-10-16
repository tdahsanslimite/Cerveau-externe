// Données du calendrier : événements, domaines, page libre de chaque semaine.
import React, { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';
import { usePersistentState } from '../storage';
import { useSettings } from '../settings/SettingsContext';
import { syncReminders } from './notifications';
import type { DayKey } from './dates';
import { CalendarEvent, DEFAULT_DOMAINS, Domain, domainOf } from './model';

interface CalendarData {
  events: CalendarEvent[];
  /** Page de notes libres, indexée par le lundi de la semaine. */
  weekNotes: Record<DayKey, string>;
  domains: Domain[];
}

interface Ctx {
  events: CalendarEvent[];
  domains: Domain[];
  domain: (id: string) => Domain;
  loaded: boolean;
  saveEvent: (e: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  /** Retire une seule occurrence d'un événement répété. */
  skipOccurrence: (id: string, day: DayKey) => void;
  /** Coche / décoche une tâche pour un jour donné. */
  toggleDone: (id: string, day: DayKey) => void;
  saveDomain: (d: Domain) => void;
  /** Supprime un domaine ; ses événements passent dans `moveTo`. */
  deleteDomain: (id: string, moveTo: string) => void;
  weekNote: (weekStart: DayKey) => string;
  setWeekNote: (weekStart: DayKey, text: string) => void;
}

const CalendarCtx = createContext<Ctx | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [data, setData, loaded] = usePersistentState<CalendarData>('ce.calendar.v1', {
    events: [],
    weekNotes: {},
    domains: DEFAULT_DOMAINS,
  });
  const domains = data.domains?.length ? data.domains : DEFAULT_DOMAINS;

  const defaultAlert = useSettings().settings.defaultAlert ?? 'sonnerie';

  // Reprogramme les rappels du téléphone dès que le calendrier change (et au démarrage).
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => void syncReminders(data.events, defaultAlert), 800);
    return () => clearTimeout(t);
  }, [data.events, loaded, defaultAlert]);

  const value = useMemo<Ctx>(() => ({
    events: data.events,
    domains,
    domain: (id) => domainOf(domains, id),
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
    toggleDone: (id, day) =>
      setData((d) => ({
        ...d,
        events: d.events.map((x) => {
          if (x.id !== id) return x;
          const done = x.doneDays ?? [];
          return { ...x, doneDays: done.includes(day) ? done.filter((k) => k !== day) : [...done, day] };
        }),
      })),
    saveDomain: (dom) =>
      setData((d) => {
        const list = d.domains?.length ? d.domains : DEFAULT_DOMAINS;
        const exists = list.some((x) => x.id === dom.id);
        return { ...d, domains: exists ? list.map((x) => (x.id === dom.id ? dom : x)) : [...list, dom] };
      }),
    deleteDomain: (id, moveTo) =>
      setData((d) => {
        const list = d.domains?.length ? d.domains : DEFAULT_DOMAINS;
        return {
          ...d,
          domains: list.filter((x) => x.id !== id),
          events: d.events.map((e) => (e.category === id ? { ...e, category: moveTo } : e)),
        };
      }),
    weekNote: (weekStart) => data.weekNotes[weekStart] ?? '',
    setWeekNote: (weekStart, text) => setData((d) => ({ ...d, weekNotes: { ...d.weekNotes, [weekStart]: text } })),
  }), [data, domains, loaded, setData]);

  return <CalendarCtx.Provider value={value}>{children}</CalendarCtx.Provider>;
}

export function useCalendar() {
  const ctx = useContext(CalendarCtx);
  if (!ctx) throw new Error('useCalendar hors de CalendarProvider');
  return ctx;
}
