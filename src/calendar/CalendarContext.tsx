// Données du calendrier : événements, domaines, page libre de chaque semaine.
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { usePersistentState } from '../storage';
import { useSettings } from '../settings/SettingsContext';
import { syncReminders } from './notifications';
import { addDays, fromKey, todayKey } from './dates';
import type { DayKey } from './dates';
import { CalendarEvent, DEFAULT_DOMAINS, Domain, domainOf, itemsOf } from './model';
import { listPhoneCalendars, listPhoneEvents, phoneCalendarsSupported, phonePermission } from './phoneCalendar';
import { isPhoneDomain, PhoneCalendarInfo, phoneDomain, phoneEventsToCalendar } from './phoneEvents';

export type PhoneStatus = 'off' | 'unsupported' | 'denied' | 'loading' | 'on' | 'error';

/** Fenêtre lue dans les agendas du téléphone : 2 mois en arrière (bilan), 6 mois devant. */
const PHONE_PAST_DAYS = 62;
const PHONE_FUTURE_DAYS = 183;
const PHONE_REFRESH_MS = 10 * 60 * 1000;

interface CalendarData {
  events: CalendarEvent[];
  /** Page de notes libres, indexée par le lundi de la semaine. */
  weekNotes: Record<DayKey, string>;
  domains: Domain[];
}

interface Ctx {
  /** Tous les événements à afficher : ceux de l'appli + ceux des agendas du téléphone (lecture seule). */
  events: CalendarEvent[];
  /** Agendas du téléphone : état, liste, actions. */
  phone: {
    status: PhoneStatus;
    calendars: PhoneCalendarInfo[];
    count: number;
    error: string | null;
    lastSync: number | null;
    /** Demande l'autorisation puis active la lecture. */
    enable: () => Promise<void>;
    disable: () => void;
    refresh: () => Promise<void>;
    /** Agendas masqués (identifiants). */
    hidden: string[];
    toggleCalendar: (id: string) => void;
  };
  domains: Domain[];
  domain: (id: string) => Domain;
  loaded: boolean;
  saveEvent: (e: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  /** Retire une seule occurrence d'un événement répété. */
  skipOccurrence: (id: string, day: DayKey) => void;
  /** Coche / décoche une tâche pour un jour donné. */
  toggleDone: (id: string, day: DayKey) => void;
  /** Coche / décoche un objet de la liste d'un événement. */
  toggleItem: (id: string, itemId: string) => void;
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

  const { settings, update } = useSettings();
  const defaultAlert = settings.defaultAlert ?? 'sonnerie';

  // ---- Agendas du téléphone (lecture seule) ----
  const [phoneCals, setPhoneCals] = useState<PhoneCalendarInfo[]>([]);
  const [phoneEvents, setPhoneEvents] = useState<CalendarEvent[]>([]);
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>('off');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const phoneOn = !!settings.phoneCalendars;
  const hiddenKey = (settings.hiddenPhoneCalendars ?? []).join(',');

  const refreshPhone = useCallback(async () => {
    if (!phoneCalendarsSupported) return setPhoneStatus('unsupported');
    if (!phoneOn) {
      setPhoneEvents([]);
      return setPhoneStatus('off');
    }
    try {
      if ((await phonePermission(false)) !== 'granted') {
        setPhoneEvents([]);
        return setPhoneStatus('denied');
      }
      const cals = await listPhoneCalendars();
      const hidden = new Set(hiddenKey ? hiddenKey.split(',') : []);
      const shown = cals.filter((c) => !hidden.has(c.id));
      const today = todayKey();
      const raws = await listPhoneEvents(shown.map((c) => c.id), fromKey(addDays(today, -PHONE_PAST_DAYS)), fromKey(addDays(today, PHONE_FUTURE_DAYS)));
      setPhoneCals(cals);
      setPhoneEvents(phoneEventsToCalendar(raws, shown));
      setPhoneStatus('on');
      setPhoneError(null);
      setLastSync(Date.now());
    } catch (err) {
      setPhoneStatus('error');
      setPhoneError(String((err as Error)?.message ?? err));
    }
  }, [phoneOn, hiddenKey]);

  // Au démarrage, quand les réglages changent, au retour dans l'appli, et toutes les 10 minutes.
  useEffect(() => {
    void refreshPhone();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void refreshPhone(); });
    const timer = setInterval(() => void refreshPhone(), PHONE_REFRESH_MS);
    return () => { sub.remove(); clearInterval(timer); };
  }, [refreshPhone]);

  // Reprogramme les rappels du téléphone dès que le calendrier change (et au démarrage).
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => void syncReminders(data.events, defaultAlert), 800);
    return () => clearTimeout(t);
  }, [data.events, loaded, defaultAlert]);

  const value = useMemo<Ctx>(() => ({
    events: phoneEvents.length ? [...data.events, ...phoneEvents] : data.events,
    phone: {
      status: phoneStatus,
      calendars: phoneCals,
      count: phoneEvents.length,
      error: phoneError,
      lastSync,
      enable: async () => {
        if (!phoneCalendarsSupported) return setPhoneStatus('unsupported');
        setPhoneStatus('loading');
        const perm = await phonePermission(true).catch(() => 'denied' as const);
        if (perm !== 'granted') return setPhoneStatus('denied');
        update({ phoneCalendars: true });
      },
      disable: () => update({ phoneCalendars: false }),
      refresh: refreshPhone,
      hidden: settings.hiddenPhoneCalendars ?? [],
      toggleCalendar: (id) => {
        const hidden = new Set(settings.hiddenPhoneCalendars ?? []);
        if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
        update({ hiddenPhoneCalendars: [...hidden] });
      },
    },
    domains,
    domain: (id) => {
      if (isPhoneDomain(id)) {
        const cal = phoneCals.find((c) => `phone:${c.id}` === id);
        if (cal) return phoneDomain(cal);
      }
      return domainOf(domains, id);
    },
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
    toggleItem: (id, itemId) =>
      setData((d) => ({
        ...d,
        events: d.events.map((x) =>
          x.id !== id ? x : { ...x, item: undefined, items: itemsOf(x).map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) },
        ),
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
  }), [data, domains, loaded, setData, phoneEvents, phoneStatus, phoneCals, phoneError, lastSync, refreshPhone, settings.hiddenPhoneCalendars, update]);

  return <CalendarCtx.Provider value={value}>{children}</CalendarCtx.Provider>;
}

export function useCalendar() {
  const ctx = useContext(CalendarCtx);
  if (!ctx) throw new Error('useCalendar hors de CalendarProvider');
  return ctx;
}
