// État persistant sur le téléphone (AsyncStorage ; localStorage sur le web).
// Les données restent sur l'appareil : rien n'est envoyé à un serveur.
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function usePersistentState<T extends object>(key: string, initial: T): [T, (update: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const skipNextSave = useRef(true);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (alive && raw) setValue({ ...initial, ...JSON.parse(raw) });
      })
      .catch(() => undefined) // stockage indisponible : on démarre à vide
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => undefined);
    }, 250);
    return () => clearTimeout(t);
  }, [key, value, loaded]);

  return [value, setValue, loaded];
}
