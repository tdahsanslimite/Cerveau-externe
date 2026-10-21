// Données du Journal : une entrée par jour (notes 1-10 + note libre), enregistrée sur le téléphone.
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { usePersistentState } from '../storage';
import type { DayKey } from '../calendar/dates';
import { EntryMap, ScoreField, setNote, setScore } from './model';

interface JournalData {
  entries: EntryMap;
}

interface Ctx {
  entries: EntryMap;
  loaded: boolean;
  /** Pose (ou retire, si on retouche la même) la note 1-10 d'un jour. */
  score: (day: DayKey, field: ScoreField, value: number) => void;
  /** Enregistre le commentaire d'une des 3 notes d'un jour. */
  note: (day: DayKey, field: ScoreField, text: string) => void;
}

const JournalCtx = createContext<Ctx | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [data, setData, loaded] = usePersistentState<JournalData>('ce.journal.v1', { entries: {} });

  const value = useMemo<Ctx>(() => ({
    entries: data.entries,
    loaded,
    score: (day, field, v) => setData((d) => ({ ...d, entries: setScore(d.entries, day, field, v) })),
    note: (day, field, text) => setData((d) => ({ ...d, entries: setNote(d.entries, day, field, text) })),
  }), [data, loaded, setData]);

  return <JournalCtx.Provider value={value}>{children}</JournalCtx.Provider>;
}

export function useJournal() {
  const ctx = useContext(JournalCtx);
  if (!ctx) throw new Error('useJournal hors de JournalProvider');
  return ctx;
}
