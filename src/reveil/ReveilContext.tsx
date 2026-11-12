// Données du réveil (clé ce.reveil.v1) et synchronisation avec Android.
// À chaque changement, la liste des réveils allumés est renvoyée au téléphone, qui programme lui-même
// la prochaine sonnerie de chacun (et la suivante après chaque sonnerie, même appli fermée).
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { usePersistentState } from '../storage';
import { EMPTY, ReveilData, STORAGE_KEY, toNative, turnOffFired, WakeAlarm } from './model';
import { consumeFired, reveilStatus, ReveilStatus, syncAlarms } from './native';

interface Ctx {
  alarms: WakeAlarm[];
  loaded: boolean;
  /** État des autorisations Android (null sur le web). */
  status: ReveilStatus | null;
  /** Dernier problème de programmation, s'il y en a un. */
  problem: string | null;
  saveAlarm: (a: WakeAlarm) => void;
  removeAlarm: (id: string) => void;
  setOn: (id: string, on: boolean) => void;
  refreshStatus: () => void;
}

const ReveilCtx = createContext<Ctx | null>(null);

export function ReveilProvider({ children }: { children: ReactNode }) {
  const [data, setData, loaded] = usePersistentState<ReveilData>(STORAGE_KEY, EMPTY);
  const [status, setStatus] = useState<ReveilStatus | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const refreshStatus = () => {
    reveilStatus().then(setStatus);
  };

  // À l'ouverture et à chaque retour dans l'appli : les réveils « une fois » qui ont sonné s'éteignent.
  useEffect(() => {
    if (!loaded) return;
    const check = () =>
      consumeFired().then((ids) => {
        if (ids.length > 0) setData((d) => ({ ...d, alarms: turnOffFired(d.alarms, ids) }));
        setChecked(true);
        refreshStatus();
      });
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Le téléphone reçoit la liste à jour (après avoir éteint les « une fois » déjà passés).
  useEffect(() => {
    if (!loaded || !checked) return;
    syncAlarms(toNative(data.alarms))
      .then(() => setProblem(null))
      .catch((e: unknown) => setProblem(e instanceof Error ? e.message : String(e)));
  }, [data.alarms, loaded, checked]);

  const value = useMemo<Ctx>(() => ({
    alarms: data.alarms,
    loaded,
    status,
    problem,
    saveAlarm: (a) =>
      setData((d) => {
        const exists = d.alarms.some((x) => x.id === a.id);
        return { ...d, alarms: exists ? d.alarms.map((x) => (x.id === a.id ? a : x)) : [...d.alarms, a] };
      }),
    removeAlarm: (id) => setData((d) => ({ ...d, alarms: d.alarms.filter((x) => x.id !== id) })),
    setOn: (id, on) => setData((d) => ({ ...d, alarms: d.alarms.map((x) => (x.id === id ? { ...x, on } : x)) })),
    refreshStatus,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, loaded, status, problem]);

  return <ReveilCtx.Provider value={value}>{children}</ReveilCtx.Provider>;
}

export function useReveil(): Ctx {
  const c = useContext(ReveilCtx);
  if (!c) throw new Error('useReveil hors de ReveilProvider');
  return c;
}
