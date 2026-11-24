// Connexion au site Planning BAM et lecture des semaines (24 nov.). Le reste (conversion, import) est pur et testé :
// bamPlanning.ts, bamImport.ts. Identifiants et jeton gardés dans expo-secure-store (chiffrés par Android) ;
// sur le web, rien n'est gardé (la fonction n'y est pas proposée).
import { Platform } from 'react-native';
import { coveredDays, shiftsToRaws, tokenEmployeId, tokenExpiry, weeksAround } from './bamPlanning';
import type { BamShift } from './bamPlanning';
import type { DayKey } from './dates';
import type { RawPhoneEvent } from './phoneEvents';

export const BAM_API = 'https://api.planning.bam-freesports.com';
export const BAM_SITE_CODES = ['BAM73', 'BAM74'];
export const bamSupported = Platform.OS === 'android' || Platform.OS === 'ios';

type Store = typeof import('expo-secure-store');
const store = (): Store => require('expo-secure-store') as Store; // eslint-disable-line @typescript-eslint/no-require-imports
const K_EMAIL = 'ce.bam.email';
const K_PASSWORD = 'ce.bam.password';
const K_TOKEN = 'ce.bam.token';

export class BamAuthError extends Error {}

async function login(email: string, password: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${BAM_API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error('Pas de connexion au site BAM (réseau ?)');
  }
  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; data?: { token?: string } } | null;
  if (!json?.ok || !json.data?.token) throw new BamAuthError(json?.error || 'Identifiants BAM refusés');
  return json.data.token;
}

/** Première connexion depuis les Réglages : vérifie les identifiants puis les garde chiffrés sur le téléphone. */
export async function bamConnect(email: string, password: string): Promise<void> {
  const token = await login(email.trim(), password);
  const s = store();
  await s.setItemAsync(K_EMAIL, email.trim());
  await s.setItemAsync(K_PASSWORD, password);
  await s.setItemAsync(K_TOKEN, token);
}

export async function bamDisconnect(): Promise<void> {
  const s = store();
  await Promise.all([K_EMAIL, K_PASSWORD, K_TOKEN].map((k) => s.deleteItemAsync(k).catch(() => undefined)));
}

/** Jeton valable (reconnexion automatique avec les identifiants gardés quand il expire, tous les 30 jours). */
async function validToken(force = false): Promise<string> {
  const s = store();
  const token = await s.getItemAsync(K_TOKEN);
  if (!force && token && tokenExpiry(token) > Date.now() + 60_000) return token;
  const email = await s.getItemAsync(K_EMAIL);
  const password = await s.getItemAsync(K_PASSWORD);
  if (!email || !password) throw new BamAuthError('Reconnecte ton compte BAM dans les Réglages');
  const fresh = await login(email, password);
  await s.setItemAsync(K_TOKEN, fresh);
  return fresh;
}

export interface BamRead {
  raws: RawPhoneEvent[];
  covered: Set<DayKey>;
}

/** Lit les semaines autour d'aujourd'hui dans les deux salles et renvoie SES créneaux (marqués) et les jours lus. */
export async function bamRead(today: DayKey, back: number, ahead: number): Promise<BamRead> {
  let token = await validToken();
  const employeId = tokenEmployeId(token);
  if (!employeId) throw new BamAuthError('Compte BAM sans fiche salarié');
  const weeks = weeksAround(today, back, ahead);
  const shifts: BamShift[] = [];
  const read: { monday: DayKey; published: boolean }[] = [];
  for (const w of weeks) {
    let published = false;
    for (const site of BAM_SITE_CODES) {
      const url = `${BAM_API}/api/planning/public?semaine=${w.semaine}&annee=${w.annee}&site=${site}`;
      let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        token = await validToken(true); // session coupée côté BAM : une reconnexion, une seule
        res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (res.status === 401) throw new BamAuthError('Session BAM refusée : reconnecte ton compte');
      const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: { shifts?: BamShift[] } } | null;
      if (!res.ok || !json?.ok) throw new Error(`Site BAM : erreur ${res.status}`);
      const list = json.data?.shifts ?? [];
      if (list.length) published = true;
      shifts.push(...list);
    }
    read.push({ monday: w.monday, published });
  }
  return { raws: shiftsToRaws(shifts, employeId), covered: coveredDays(read) };
}
