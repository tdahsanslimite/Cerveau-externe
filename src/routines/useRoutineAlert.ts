// La pastille rouge de l'onglet Routines est-elle allumée ? (règle : `alertOn` dans model.ts)
// Se met à jour toute seule quand l'heure passe midi / 18 h / 22 h, quand on coche,
// et quand on revient dans l'appli après l'avoir laissée en arrière-plan.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { toKey } from '../calendar/dates';
import { useRoutines } from './RoutinesContext';
import { alertOn } from './model';

const CHECK_EVERY_MS = 30_000;

export function useRoutineAlert(): boolean {
  const { routines, done, lastCheckAt } = useRoutines();
  const [on, setOn] = useState(false);

  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const today = toKey(now);
      // Dernière coche : seule celle d'aujourd'hui compte.
      let lastCheckMin: number | null = null;
      if (lastCheckAt !== null) {
        const last = new Date(lastCheckAt);
        if (toKey(last) === today) lastCheckMin = last.getHours() * 60 + last.getMinutes();
      }
      // On ne garde qu'un booléen : s'il ne change pas, rien ne se redessine.
      setOn(alertOn(routines, done, today, now.getHours() * 60 + now.getMinutes(), lastCheckMin));
    };
    compute();
    const timer = setInterval(compute, CHECK_EVERY_MS);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && compute());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [routines, done, lastCheckAt]);

  return on;
}
