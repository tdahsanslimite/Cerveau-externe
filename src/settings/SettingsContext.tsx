// Réglages de l'utilisateur. Les modules suivants (tâches, routines) y ajouteront les leurs.
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import type { AlertKind } from '../calendar/model';
import type { TimePicker, TimePlace } from './timePicker';
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
  /** Afficher les agendas du téléphone (Google Agenda…) en lecture seule. */
  phoneCalendars?: boolean;
  /** Agendas du téléphone masqués (par identifiant). Par défaut : tous affichés. */
  hiddenPhoneCalendars?: string[];
  /** Dernier jour (la nuit finit à 3 h) où la matrice des idées a été vidée de Important / Urgent / Abandonner. */
  ideasResetDay?: string;
  /** Dernier jour où le pop-up « ta journée » a été montré (une fois par jour, à la première ouverture). */
  dayPopupDay?: string;
  /** Premier jour pris en compte par le ménage de la veille (jour d'installation de cette version : pas d'historique à rattraper). */
  reviewFrom?: string;
  /** Premier jour d'ouverture de l'appli (encadré coach de l'accueil : la question les 3 premiers jours, puis l'envoi du journal). */
  firstOpenDay?: string;
  /** Masquer les boutons « tutoriel » (?) en haut des modules (22 nov., demande de Valentin : retirable dans les réglages). */
  hideTutorials?: boolean;
  /** Modules dont la vidéo tuto s'est déjà ouverte toute seule (elle ne s'ouvre seule qu'une fois). */
  tutorialsSeen?: string[];
  /** Roulette ou horloge, UN SEUL choix pour toute l'appli (22 nov.). Absent = roulette. */
  timePicker?: TimePicker;
  /** Ancien choix par endroit (version du 22 nov. matin, v1.0.70) : plus lu, sauf pour la reprise (legacyPicker). */
  timePickers?: Partial<Record<TimePlace, TimePicker>>;
  /** Masquer la pastille rouge de retard des Routines (22 nov., réglage du module Routines). */
  hideRoutineDot?: boolean;
  /** Respiration : son et vibration à chaque temps (avant le 22 nov. : remis à « oui » à chaque ouverture). */
  breathSound?: boolean;
  breathVibrate?: boolean;
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
