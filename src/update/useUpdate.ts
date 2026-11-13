// Vérifie au démarrage et à chaque retour dans l'appli (au plus une fois par heure) s'il existe une version plus récente.
// Aucune donnée envoyée : une simple lecture de la page publique des versions. Sans réseau, rien ne s'affiche.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { APK_URL, LATEST_API, newerBuild, parseBuild, shouldCheck } from './model';

// Remplacé par le numéro de fabrication au moment de fabriquer l'APK (voir .github/workflows/android.yml).
const CURRENT = parseBuild(process.env.EXPO_PUBLIC_CE_BUILD);

export function useUpdate() {
  const [latest, setLatest] = useState<number | null>(null);
  const [hidden, setHidden] = useState<number | null>(null);
  const lastCheck = useRef<number | null>(null);

  const check = useCallback(async () => {
    if (Platform.OS !== 'android' || CURRENT == null) return;
    const now = Date.now();
    if (!shouldCheck(lastCheck.current, now)) return;
    lastCheck.current = now;
    try {
      const res = await fetch(LATEST_API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) return;
      const data = await res.json();
      setLatest(newerBuild(CURRENT, data?.tag_name));
    } catch {
      // Pas de réseau : on réessaiera au prochain retour dans l'appli.
      lastCheck.current = null;
    }
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub.remove();
  }, [check]);

  return {
    /** Numéro de la nouvelle version à proposer, ou null. */
    available: latest != null && latest !== hidden ? latest : null,
    install: () => Linking.openURL(APK_URL),
    /** « Plus tard » : masqué jusqu'à la prochaine ouverture de l'appli (ou une version encore plus récente). */
    later: () => setHidden(latest),
  };
}
