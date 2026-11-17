// Données de l'onglet Objectifs : blason, thèmes choisis, objectifs de l'année, fiches de période par thème.
// Enregistrées sur le téléphone. Les données d'avant le 17 nov. sont reprises par normalizeGoals (rien n'est perdu).
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { usePersistentState } from '../storage';
import {
  BlasonId, Goals, GoalsData, normalizeGoals, PeriodField, setBlason, setThemeField, setThemePeriodField, ThemeField, ThemeId,
  toggleChosen, toggleLeading,
} from './model';

interface Ctx extends Goals {
  loaded: boolean;
  blasonText: (id: BlasonId, text: string) => void;
  themeText: (year: string, theme: ThemeId, field: ThemeField, text: string) => void;
  /** Met un thème en tête pour l'année (un seul à la fois) ; le retoucher le retire. */
  lead: (year: string, theme: ThemeId) => void;
  /** Premier choix : un seul thème. */
  chooseFirst: (theme: ThemeId) => void;
  /** Ajoute ou retire un thème (jamais le dernier). */
  toggleTheme: (theme: ThemeId) => void;
  periodText: (theme: ThemeId, key: string, field: PeriodField, text: string) => void;
}

const GoalsCtx = createContext<Ctx | null>(null);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw, loaded] = usePersistentState<GoalsData>('ce.goals.v1', { blason: {}, years: {}, periods: {} });
  const data = useMemo(() => normalizeGoals(raw), [raw]);

  const value = useMemo<Ctx>(() => {
    // Chaque modification part des données reprises : la reprise est enregistrée dès la première modification.
    const update = (fn: (d: Goals) => GoalsData) => setRaw((r) => fn(normalizeGoals(r)));
    return {
      ...data,
      loaded,
      blasonText: (id, text) => update((d) => ({ ...d, blason: setBlason(d.blason, id, text) })),
      themeText: (year, theme, field, text) => update((d) => ({ ...d, years: setThemeField(d.years, year, theme, field, text) })),
      lead: (year, theme) => update((d) => ({ ...d, years: toggleLeading(d.years, year, theme) })),
      chooseFirst: (theme) => update((d) => ({ ...d, chosen: [theme] })),
      toggleTheme: (theme) => update((d) => ({ ...d, chosen: toggleChosen(d.chosen, theme) })),
      periodText: (theme, key, field, text) =>
        update((d) => ({ ...d, themePeriods: setThemePeriodField(d.themePeriods, theme, key, field, text) })),
    };
  }, [data, loaded, setRaw]);

  return <GoalsCtx.Provider value={value}>{children}</GoalsCtx.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsCtx);
  if (!ctx) throw new Error('useGoals hors de GoalsProvider');
  return ctx;
}
