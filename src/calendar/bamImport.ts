// Planning BAM → vrais créneaux Cerveau Externe (23 nov., demande de Valentin).
// Les créneaux du planning BAM arrivent dans Google Agenda (synchro quotidienne faite par Claude) avec une marque
// dans la description : « bam-shift:<id> » (un créneau de travail) ou « bam-cp:<début>..<fin> » (congés payés).
// Ici, chaque créneau marqué lu dans les agendas du téléphone devient un VRAI événement de l'appli, rangé dans le
// domaine Travail : on peut le cocher, le modifier, le supprimer, et ses heures comptent dans le bilan Travail.
// Fonctions pures, testées dans bamImport.test.ts.
import { toCalendarEvents } from './phoneEvents.ts';
import type { RawPhoneEvent } from './phoneEvents.ts';
import type { DayKey } from './dates.ts';
import type { CalendarEvent, Domain } from './model.ts';

const SHIFT_MARK = /bam-shift:([0-9a-zA-Z-]+)/;
const CP_MARK = /bam-cp:(\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2})/;

/** Identifiant BAM d'un événement du téléphone (« shift:… » ou « cp:… »), ou null s'il ne vient pas du planning BAM. */
export function bamKeyOf(raw: Pick<RawPhoneEvent, 'notes'>): string | null {
  const notes = raw.notes ?? '';
  const s = SHIFT_MARK.exec(notes);
  if (s) return `shift:${s[1]}`;
  const c = CP_MARK.exec(notes);
  return c ? `cp:${c[1]}` : null;
}

export const BAM_WORK_DOMAIN: Domain = { id: 'travail', label: 'Travail', color: '#2F63B0' };

/** Domaine Travail de l'utilisateur : id « travail », sinon un domaine nommé « Travail », sinon à créer. */
export function workDomainOf(domains: Domain[]): Domain | null {
  return domains.find((d) => d.id === 'travail') ?? domains.find((d) => d.label.trim().toLowerCase() === 'travail') ?? null;
}

const eventId = (key: string) => `bam:${key}`;
const PHONE_CAL = { id: 'bam', title: 'Planning BAM', color: BAM_WORK_DOMAIN.color, account: '' };

/** Le créneau BAM tel qu'il doit être dans l'appli (sans ce que l'utilisateur y a ajouté). */
export function bamEventFrom(raw: RawPhoneEvent, key: string, workDomainId: string): CalendarEvent | null {
  const [seg] = toCalendarEvents(raw, PHONE_CAL);
  if (!seg) return null;
  const isCp = key.startsWith('cp:');
  return {
    id: eventId(key),
    title: seg.title,
    date: seg.date,
    start: seg.start,
    durationMin: seg.durationMin,
    endDate: seg.endDate,
    category: workDomainId,
    repeat: 'none',
    kinds: ['rdv'],
    nature: isCp ? 'evenement' : 'rdv',
    reminders: [],
    bam: { key },
  };
}

/** Ce que la synchro a le droit de réécrire sur un créneau importé qui n'a pas été modifié à la main. */
const SYNCED = ['title', 'date', 'start', 'durationMin', 'endDate'] as const;
const sameSynced = (a: CalendarEvent, b: CalendarEvent) => SYNCED.every((k) => (a[k] ?? null) === (b[k] ?? null));

export interface BamImportInput {
  events: CalendarEvent[];
  domains: Domain[];
  /** Créneaux BAM que l'utilisateur a supprimés : jamais recréés. */
  deleted: string[];
  /** Tous les événements lus dans les agendas du téléphone (on ne garde que ceux qui portent une marque BAM). */
  raws: RawPhoneEvent[];
  /** Fenêtre lue : un créneau à venir absent de cette fenêtre a été retiré du planning. */
  today: DayKey;
  readUntil: DayKey;
  /**
   * Jours réellement lus (lecture directe du site BAM : seulement les semaines publiées). Absent = tous les jours
   * jusqu'à `readUntil` (lecture de Google Agenda). Un créneau n'est retiré que si son jour a été lu.
   */
  isCovered?: (day: DayKey) => boolean;
}

export interface BamImportResult {
  changed: boolean;
  events: CalendarEvent[];
  /** Domaine Travail créé parce qu'il n'existait pas (à ajouter à la liste des domaines). */
  addedDomain: Domain | null;
  /** Identifiants des événements du téléphone déjà importés : à ne plus afficher en double en lecture seule. */
  importedRawIds: Set<string>;
}

/**
 * Règles (décision du 23 nov.) :
 * - nouveau créneau BAM → créé dans le domaine Travail ;
 * - créneau déjà importé et jamais modifié à la main → mis à jour si le planning a bougé (heures, jour, titre) ;
 *   ce qui a été coché (doneDays), les notes, check-listes et rappels ajoutés sont toujours gardés ;
 * - créneau modifié à la main (`bam.edited`) → la version de l'utilisateur gagne, le planning n'y touche plus ;
 * - créneau supprimé à la main → jamais recréé (liste `deleted`) ;
 * - créneau à venir (aujourd'hui ou après), jamais modifié ni coché, qui a disparu du planning → retiré ;
 *   le passé n'est jamais retiré (historique).
 */
export function applyBamImport(input: BamImportInput): BamImportResult {
  const { raws, deleted, today, readUntil } = input;
  let addedDomain: Domain | null = null;
  let work = workDomainOf(input.domains);
  if (!work) work = addedDomain = BAM_WORK_DOMAIN;

  const wanted = new Map<string, { raw: RawPhoneEvent; event: CalendarEvent }>();
  const importedRawIds = new Set<string>();
  for (const raw of raws) {
    const key = bamKeyOf(raw);
    if (!key) continue;
    importedRawIds.add(raw.id);
    if (wanted.has(key) || deleted.includes(key)) continue;
    const event = bamEventFrom(raw, key, work.id);
    if (event) wanted.set(key, { raw, event });
  }

  let changed = false;
  const seen = new Set<string>();
  const events: CalendarEvent[] = [];
  for (const e of input.events) {
    const key = e.bam?.key;
    if (!key) {
      events.push(e);
      continue;
    }
    seen.add(key);
    const next = wanted.get(key)?.event;
    if (!next) {
      const untouched = !e.bam?.edited && !(e.doneDays?.length);
      const covered = input.isCovered ? input.isCovered(e.date) : e.date <= readUntil;
      if (untouched && e.date >= today && covered) {
        changed = true; // retiré du planning
        continue;
      }
      events.push(e);
      continue;
    }
    if (e.bam?.edited || sameSynced(e, next)) {
      events.push(e);
      continue;
    }
    const updated: CalendarEvent = { ...e };
    for (const k of SYNCED) (updated as unknown as Record<string, unknown>)[k] = next[k];
    if (updated.endDate === undefined) delete updated.endDate;
    events.push(updated);
    changed = true;
  }
  for (const [key, { event }] of wanted) {
    if (seen.has(key)) continue;
    if (event.endDate === undefined) delete event.endDate;
    events.push(event);
    changed = true;
  }
  return { changed: changed || !!addedDomain, events, addedDomain, importedRawIds };
}

/** À l'enregistrement d'un créneau importé : s'il a été modifié à la main (heure, jour, titre), le planning n'y touche plus. */
export function markBamEdit(previous: CalendarEvent | undefined, next: CalendarEvent): CalendarEvent {
  if (!next.bam || next.bam.edited || !previous || sameSynced(previous, next)) return next;
  return { ...next, bam: { ...next.bam, edited: true } };
}
