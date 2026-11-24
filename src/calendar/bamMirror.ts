// Créneaux BAM de l'appli → Google Agenda (24 nov., demande de Valentin : « pour que ça bloque sur Calendly »).
// LCE est la référence : ce qui est dans le domaine Travail (avec ses modifications à la main) est recopié dans
// l'agenda Google choisi, à partir d'aujourd'hui. Le passé n'est jamais touché. Seuls les événements Google qui portent
// une marque BAM sont modifiés ou supprimés : rien d'autre dans l'agenda.
// Fonctions pures, testées dans bamMirror.test.ts. L'écriture réelle est dans phoneCalendar.ts.
import { addDays } from './dates.ts';
import type { DayKey } from './dates.ts';
import { bamKeyOf } from './bamImport.ts';
import type { CalendarEvent } from './model.ts';
import type { RawPhoneEvent } from './phoneEvents.ts';

export interface MirrorDetails {
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  notes: string;
}

export interface MirrorOps {
  create: MirrorDetails[];
  update: { id: string; details: MirrorDetails }[];
  remove: string[];
}

/** Marque écrite dans la description Google (relue par bamKeyOf). */
export const markOf = (key: string) => (key.startsWith('cp:') ? `bam-cp:${key.slice(3)}` : `bam-shift:${key.slice(6)}`);

/** Ce que doit être l'événement Google d'un créneau BAM de l'appli. */
export function detailsOf(e: CalendarEvent): MirrorDetails | null {
  if (!e.bam) return null;
  const [y, m, d] = e.date.split('-').map(Number);
  const notes = `Planning BAM (recopié par LCE)\n${markOf(e.bam.key)}`;
  if (e.start === null) {
    const last = e.endDate ?? e.date;
    const [ly, lm, ld] = addDays(last, 1).split('-').map(Number);
    // Journée entière : Android l'attend à minuit UTC, fin exclue.
    return { title: e.title, startDate: new Date(Date.UTC(y, m - 1, d)), endDate: new Date(Date.UTC(ly, lm - 1, ld)), allDay: true, notes };
  }
  const startDate = new Date(y, m - 1, d, Math.floor(e.start / 60), e.start % 60);
  const endDate = new Date(startDate.getTime() + e.durationMin * 60000);
  const loc = e.title.startsWith('BAM ') ? e.title.split(' · ')[0] : undefined;
  return { title: e.title, startDate, endDate, allDay: false, location: loc, notes };
}

const sameDetails = (raw: RawPhoneEvent, want: MirrorDetails) =>
  raw.allDay === want.allDay &&
  (raw.title ?? '') === want.title &&
  new Date(raw.startDate).getTime() === want.startDate.getTime() &&
  new Date(raw.endDate).getTime() === want.endDate.getTime();

/**
 * Compare les créneaux BAM de l'appli (à partir d'aujourd'hui) et les événements BAM de l'agenda Google cible
 * (déjà filtrés sur cet agenda) : crée ce qui manque, met à jour ce qui a bougé, supprime ce que l'appli n'a plus
 * (et les doublons). Un événement Google qui commence avant aujourd'hui n'est jamais touché.
 */
export function planMirror(events: CalendarEvent[], googleRaws: RawPhoneEvent[], today: DayKey): MirrorOps {
  const wanted = new Map<string, MirrorDetails>();
  for (const e of events) {
    if (!e.bam || (e.endDate ?? e.date) < today) continue;
    const det = detailsOf(e);
    if (det) wanted.set(e.bam.key, det);
  }
  const ops: MirrorOps = { create: [], update: [], remove: [] };
  const todayStart = (() => {
    const [y, m, d] = today.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  })();
  const matched = new Set<string>();
  for (const raw of googleRaws) {
    const key = bamKeyOf(raw);
    if (!key) continue;
    if (new Date(raw.endDate).getTime() <= todayStart) continue; // passé : on n'y touche pas
    const want = wanted.get(key);
    if (!want || matched.has(key)) {
      // Plus dans l'appli, ou doublon. Un créneau qui a commencé avant aujourd'hui mais finit après (bandeau
      // de congés en cours) n'est retiré que s'il n'existe plus du tout dans l'appli.
      ops.remove.push(raw.id);
      continue;
    }
    matched.add(key);
    if (!sameDetails(raw, want)) ops.update.push({ id: raw.id, details: want });
  }
  for (const [key, det] of wanted) if (!matched.has(key)) ops.create.push(det);
  return ops;
}

export const isEmptyOps = (o: MirrorOps) => !o.create.length && !o.update.length && !o.remove.length;
