// Données de l'onglet Objectifs : blason, objectifs de l'année, objectifs de période. Enregistrées sur le téléphone.
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { usePersistentState } from '../storage';
import {
  BlasonId, BlasonMap, PeriodField, PeriodMap, setBlason, setPeriodField, setThemeField, ThemeField, ThemeId, toggleLeading, YearGoals,
} from './model';

interface GoalsData {
  blason: BlasonMap;
  years: Record<string, YearGoals>;
  periods: PeriodMap;
}

interface Ctx extends GoalsData {
  loaded: boolean;
  blasonText: (id: BlasonId, text: string) => void;
  themeText: (year: string, theme: ThemeId, field: ThemeField, text: string) => void;
  /** Met un thème en tête pour l'année (un seul à la fois) ; le retoucher le retire. */
  lead: (year: string, theme: ThemeId) => void;
  periodText: (key: string, field: PeriodField, text: string) => void;
}

const GoalsCtx = createContext<Ctx | null>(null);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [data, setData, loaded] = usePersistentState<GoalsData>('ce.goals.v1', { blason: {}, years: {}, periods: {} });

  const value = useMemo<Ctx>(() => ({
    ...data,
    loaded,
    blasonText: (id, text) => setData((d) => ({ ...d, blason: setBlason(d.blason, id, text) })),
    themeText: (year, theme, field, text) => setData((d) => ({ ...d, years: setThemeField(d.years, year, theme, field, text) })),
    lead: (year, theme) => setData((d) => ({ ...d, years: toggleLeading(d.years, year, theme) })),
    periodText: (key, field, text) => setData((d) => ({ ...d, periods: setPeriodField(d.periods, key, field, text) })),
  }), [data, loaded, setData]);

  return <GoalsCtx.Provider value={value}>{children}</GoalsCtx.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsCtx);
  if (!ctx) throw new Error('useGoals hors de GoalsProvider');
  return ctx;
}
