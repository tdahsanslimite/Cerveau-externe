// Planning BAM lu directement sur le site du travail (24 nov., demande de Valentin : « le PC est éteint 5 jours sur 7 »).
// L'appli se connecte à l'API de planning.bam-freesports.com avec le compte BAM de l'utilisateur (identifiants gardés
// chiffrés sur le téléphone, voir bamClient.ts) et transforme SES créneaux en événements « bruts », marqués comme ceux
// de Google Agenda (`bam-shift:<id>` / `bam-cp:<début>..<fin>`) : bamImport.ts les range ensuite dans Travail.
// Fonctions pures, testées dans bamPlanning.test.ts.
import { addDays } from './dates.ts';
import type { DayKey } from './dates.ts';
import type { RawPhoneEvent } from './phoneEvents.ts';

/** Un créneau tel que l'API BAM le renvoie (/api/planning/public). */
export interface BamShift {
  id: string;
  employe_id: string;
  /** « 2026-11-24T00:00:00.000Z » : seuls les 10 premiers caractères comptent. */
  date: string;
  heure_debut: string | null;
  heure_fin: string | null;
  /** 'W' = travail ; 'CP' et autres codes = absences (sans heure). */
  type: string;
  zone?: string | null;
  site: string;
  is_draft?: boolean;
}

/** Salles connues (réglages du site BAM). Une salle inconnue s'affiche « BAM <code> ». */
export const BAM_SITES: Record<string, string> = { BAM73: 'Chambéry', BAM74: 'Annecy' };

const ABSENCE_LABEL: Record<string, string> = { CP: 'Congés payés' };

/** Semaine ISO (celle du site BAM : la semaine 48 de 2026 va du lundi 23 au dimanche 29 nov.). */
export function isoWeek(day: DayKey): { annee: number; semaine: number; monday: DayKey } {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = (date.getUTCDay() + 6) % 7; // lundi = 0
  const monday = addDays(day, -dow);
  const thursday = new Date(date.getTime() + (3 - dow) * 86400000);
  const annee = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(annee, 0, 4));
  const week1Monday = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86400000;
  const semaine = Math.round((thursday.getTime() - 3 * 86400000 - week1Monday) / (7 * 86400000)) + 1;
  return { annee, semaine, monday };
}

/** Semaines à lire : de `back` semaines avant celle de `today` à `ahead` semaines après. */
export function weeksAround(today: DayKey, back: number, ahead: number) {
  const out: { annee: number; semaine: number; monday: DayKey }[] = [];
  const thisMonday = isoWeek(today).monday;
  for (let i = -back; i <= ahead; i++) out.push(isoWeek(addDays(thisMonday, i * 7)));
  return out;
}

/** Les 7 jours d'une semaine à partir de son lundi. */
export const weekDays = (monday: DayKey): DayKey[] => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

const hm = (s: string) => {
  const [h, m] = s.slice(0, 5).split(':').map(Number);
  return { h, m };
};
const dateParts = (day: DayKey) => day.split('-').map(Number) as [number, number, number];

/**
 * Créneaux de l'API → événements bruts marqués (comme ceux de Google Agenda), pour l'employé `employeId` seulement.
 * - travail avec heures → un créneau « BAM Chambéry · Salle » (`bam-shift:<id>`), heure locale du téléphone ;
 * - absences (CP…) → regroupées en blocs de jours consécutifs, un bandeau journée entière (`bam-cp:<début>..<fin>`) ;
 *   un même jour peut venir des deux salles : compté une fois ;
 * - brouillons ignorés.
 */
export function shiftsToRaws(shifts: BamShift[], employeId: string): RawPhoneEvent[] {
  const mine = shifts.filter((s) => s.employe_id === employeId && !s.is_draft);
  const out: RawPhoneEvent[] = [];
  const seen = new Set<string>();
  for (const s of mine) {
    if (s.type !== 'W' || !s.heure_debut || !s.heure_fin || seen.has(s.id)) continue;
    seen.add(s.id);
    const day = s.date.slice(0, 10);
    const [y, mo, d] = dateParts(day);
    const a = hm(s.heure_debut);
    const b = hm(s.heure_fin);
    const start = new Date(y, mo - 1, d, a.h, a.m);
    let end = new Date(y, mo - 1, d, b.h, b.m);
    if (end <= start) end = new Date(y, mo - 1, d + 1, b.h, b.m); // fin après minuit
    const site = BAM_SITES[s.site] ?? s.site;
    const zone = s.zone?.trim();
    out.push({
      id: `bamapi:${s.id}`,
      calendarId: 'bam',
      title: `BAM ${site}${zone ? ` · ${zone}` : ''}`,
      startDate: start,
      endDate: end,
      allDay: false,
      location: `BAM ${site}`,
      notes: `Planning BAM (lu dans LCE)\nbam-shift:${s.id}`,
    });
  }

  // Absences : un bloc par suite de jours consécutifs du même type.
  const absences = new Map<string, Set<DayKey>>();
  for (const s of mine) {
    if (s.type === 'W') continue;
    const set = absences.get(s.type) ?? new Set<DayKey>();
    set.add(s.date.slice(0, 10));
    absences.set(s.type, set);
  }
  for (const [type, set] of absences) {
    const days = [...set].sort();
    let i = 0;
    while (i < days.length) {
      let j = i;
      while (j + 1 < days.length && addDays(days[j], 1) === days[j + 1]) j++;
      const first = days[i];
      const last = days[j];
      const label = ABSENCE_LABEL[type] ?? `Absence (${type})`;
      out.push({
        id: `bamapi:${type}:${first}`,
        calendarId: 'bam',
        title: `BAM · ${label}`,
        startDate: `${first}T00:00:00.000Z`,
        endDate: `${addDays(last, 1)}T00:00:00.000Z`,
        allDay: true,
        // Même marque que la synchro Google pour les congés payés ; les autres absences gardent leur type.
        notes: `Planning BAM (lu dans LCE)\nbam-cp:${first}..${last}${type === 'CP' ? '' : ` ${type}`}`,
      });
      i = j + 1;
    }
  }
  return out;
}

/** Jours « couverts » par une lecture : semaines publiées (au moins un créneau, tous employés confondus). */
export function coveredDays(weeks: { monday: DayKey; published: boolean }[]): Set<DayKey> {
  const out = new Set<DayKey>();
  for (const w of weeks) if (w.published) for (const d of weekDays(w.monday)) out.add(d);
  return out;
}

/** Date d'expiration (ms) d'un jeton BAM (JWT), ou 0 s'il est illisible. */
export function tokenExpiry(token: string): number {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(decodeBase64(part)) as { exp?: number };
    return (json.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

/** Identifiant d'employé contenu dans le jeton BAM. */
export function tokenEmployeId(token: string): string | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return (JSON.parse(decodeBase64(part)) as { employeId?: string }).employeId ?? null;
  } catch {
    return null;
  }
}

/** Base64 sans dépendance (atob n'existe pas partout). */
function decodeBase64(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const str = input.replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const c of str) {
    const v = chars.indexOf(c);
    if (v < 0) continue;
    value = (value << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  return decodeURIComponent(bytes.map((b) => `%${b.toString(16).padStart(2, '0')}`).join(''));
}
