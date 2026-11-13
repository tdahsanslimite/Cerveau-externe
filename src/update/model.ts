// Mise à jour de l'appli Android (13 nov., demande de Valentin : « je ne veux pas qu'ils aient besoin de chercher »).
// Chaque fabrication publie la version « v1.0.<numéro> » dans le dépôt public de téléchargement, et le même numéro
// est glissé dans l'appli au moment de la fabrication (EXPO_PUBLIC_CE_BUILD). Comparer les deux suffit.

export const PUBLIC_REPO = 'tdahsanslimite/cerveau-externe-telechargement';
export const LATEST_API = `https://api.github.com/repos/${PUBLIC_REPO}/releases/latest`;
/** Lien direct : le téléphone télécharge l'APK, il n'y a plus qu'à toucher « Installer ». */
export const APK_URL = `https://github.com/${PUBLIC_REPO}/releases/latest/download/cerveau-externe.apk`;

/** Numéro de fabrication d'une étiquette « v1.0.57 » → 57 ; null si la forme est inconnue. */
export function buildOfTag(tag: unknown): number | null {
  if (typeof tag !== 'string') return null;
  const m = /^v?\d+\.\d+\.(\d+)$/.exec(tag.trim());
  return m ? Number(m[1]) : null;
}

/** Numéro de fabrication de l'appli installée ; null en développement (pas de numéro : jamais de bandeau). */
export function parseBuild(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Numéro de la version plus récente à proposer, ou null s'il n'y a rien à proposer. */
export function newerBuild(current: number | null, latestTag: unknown): number | null {
  const latest = buildOfTag(latestTag);
  if (current == null || latest == null) return null;
  return latest > current ? latest : null;
}

/** Vérifier au plus une fois par heure (l'API GitHub sans compte accepte 60 demandes par heure). */
export const CHECK_EVERY_MS = 60 * 60 * 1000;
export function shouldCheck(lastCheck: number | null, now: number): boolean {
  return lastCheck == null || now - lastCheck >= CHECK_EVERY_MS;
}
