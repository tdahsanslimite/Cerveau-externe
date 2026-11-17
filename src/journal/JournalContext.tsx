// Données du Journal : une entrée par jour (notes 1-10, commentaires, heures de sommeil) + les réglages, enregistrés sur le téléphone.
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { usePersistentState } from '../storage';
import type { DayKey } from '../calendar/dates';
import { defaultPrefs, EntryMap, JournalPrefs, ScoreField, setNote, setScore, setSleepTime, SleepTimeKey } from './model';

interface JournalData {
  entries: EntryMap;
  /** Réglages (17 nov.). Absent = pas encore choisis : le Journal les demande à la première ouverture. */
  prefs?: JournalPrefs;
}

interface Ctx {
  entries: EntryMap;
  loaded: boolean;
  /** Réglages en vigueur (ou la proposition par défaut tant qu'ils n'ont pas été choisis). */
  prefs: JournalPrefs;
  /** false tant que l'utilisateur n'a pas validé ses réglages une première fois. */
  prefsChosen: boolean;
  setPrefs: (p: JournalPrefs) => void;
  /** Pose (ou retire, si on retouche la même) la note 1-10 d'un jour. */
  score: (day: DayKey, field: ScoreField, value: number) => void;
  /** Enregistre le commentaire d'une note d'un jour. */
  note: (day: DayKey, field: ScoreField, text: string) => void;
  /** Heure de coucher / lever d'un jour (minutes depuis minuit), null = effacer. */
  sleepTime: (day: DayKey, key: SleepTimeKey, minutes: number | null) => void;
}

const JournalCtx = createContext<Ctx | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [data, setData, loaded] = usePersistentState<JournalData>('ce.journal.v1', { entries: {} });

  const value = useMemo<Ctx>(() => ({
    entries: data.entries,
    loaded,
    prefs: data.prefs ?? defaultPrefs(data.entries),
    prefsChosen: !!data.prefs,
    setPrefs: (p) => setData((d) => ({ ...d, prefs: p })),
    score: (day, field, v) => setData((d) => ({ ...d, entries: setScore(d.entries, day, field, v) })),
    note: (day, field, text) => setData((d) => ({ ...d, entries: setNote(d.entries, day, field, text) })),
    sleepTime: (day, key, m) => setData((d) => ({ ...d, entries: setSleepTime(d.entries, day, key, m) })),
  }), [data, loaded, setData]);

  return <JournalCtx.Provider value={value}>{children}</JournalCtx.Provider>;
}

export function useJournal() {
  const ctx = useContext(JournalCtx);
  if (!ctx) throw new Error('useJournal hors de JournalProvider');
  return ctx;
}
