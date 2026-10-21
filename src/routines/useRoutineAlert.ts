// Nombre de routines d'aujourd'hui à remplir (pour la pastille rouge de l'onglet Routines).
// Se met à jour toute seule quand l'heure passe midi / 18 h / 22 h, quand on coche,
// et quand on revient dans l'appli après l'avoir laissée en arrière-plan.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { toKey } from '../calendar/dates';
import { useRoutines } from './RoutinesContext';
import { overdueRoutines } from './model';

const CHECK_EVERY_MS = 30_000;

export function useRoutineAlert(): number {
  const { routines, done } = useRoutines();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const compute = () => {
      const now = new Date();
      // On ne garde que le nombre : s'il ne change pas, rien ne se redessine.
      setCount(overdueRoutines(routines, done, toKey(now), now.getHours() * 60 + now.getMinutes()).length);
    };
    compute();
    const timer = setInterval(compute, CHECK_EVERY_MS);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && compute());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [routines, done]);

  return count;
}
