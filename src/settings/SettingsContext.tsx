// Réglages de l'utilisateur. Les modules suivants (tâches, routines) y ajouteront les leurs.
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import type { AlertKind } from '../calendar/model';
import { usePersistentState } from '../storage';

export type CalendarView = 'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee';

export interface Settings {
  /** Nombre d'éléments par jour au-delà duquel la journée est signalée trop chargée. */
  dailyLimit: number;
  /** Vue affichée à l'ouverture de l'appli. */
  startView: CalendarView;
  /** Afficher les créneaux libres entre deux rendez-vous dans la vue Jour. */
  showFreeSlots: boolean;
  /** Type d'alerte des rappels quand l'événement n'en précise pas. */
  defaultAlert: AlertKind;
}

export const DEFAULT_SETTINGS: Settings = { dailyLimit: 6, startView: 'jour', showFreeSlots: true, defaultAlert: 'sonnerie' };

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  loaded: boolean;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings, loaded] = usePersistentState<Settings>('ce.settings.v1', DEFAULT_SETTINGS);
  const value = useMemo<Ctx>(
    () => ({ settings, loaded, update: (patch) => setSettings((s) => ({ ...s, ...patch })) }),
    [settings, loaded, setSettings],
  );
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings hors de SettingsProvider');
  return ctx;
}
