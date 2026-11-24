// Lecture des agendas du téléphone (Android : Google Agenda et tout agenda synchronisé, ex. Planning BAM).
// Écriture (24 nov.) : SEULEMENT les créneaux du planning BAM, recopiés dans l'agenda Google choisi pour bloquer
// Calendly (voir bamMirror.ts). Rien d'autre n'est jamais écrit. Sans effet sur le web.
import { Platform } from 'react-native';
import type { PhoneCalendarInfo, RawPhoneEvent } from './phoneEvents';
import type { MirrorDetails, MirrorOps } from './bamMirror';

export const phoneCalendarsSupported = Platform.OS === 'android' || Platform.OS === 'ios';

type Mod = typeof import('expo-calendar');
// Chargé à la demande : le module natif n'existe pas sur le web.
const mod = (): Mod => require('expo-calendar') as Mod; // eslint-disable-line @typescript-eslint/no-require-imports

export type PhonePermission = 'granted' | 'denied' | 'undetermined';

export async function phonePermission(ask: boolean): Promise<PhonePermission> {
  if (!phoneCalendarsSupported) return 'denied';
  const m = mod();
  const current = await m.getCalendarPermissions();
  if (current.status === 'granted' || !ask) return current.status as PhonePermission;
  const asked = await m.requestCalendarPermissions();
  return asked.status as PhonePermission;
}

export async function listPhoneCalendars(): Promise<PhoneCalendarInfo[]> {
  const m = mod();
  const cals = await m.getCalendars(m.EntityTypes.EVENT);
  return cals
    .filter((c) => c.isVisible !== false)
    .map((c) => ({
      id: String(c.id),
      title: c.title || c.name || 'Agenda',
      color: c.color || '#5F6B7A',
      account: c.ownerAccount || c.source?.name || '',
      writable: !!c.allowsModifications,
    }));
}

export async function listPhoneEvents(calendarIds: string[], from: Date, to: Date): Promise<RawPhoneEvent[]> {
  if (calendarIds.length === 0) return [];
  const m = mod();
  const events = await m.listEvents(calendarIds, from, to);
  lastListed.clear();
  for (const e of events) lastListed.set(String(e.id), e);
  return events.map((e) => ({
    id: String(e.id),
    calendarId: String(e.calendarId),
    title: e.title,
    startDate: e.startDate,
    endDate: e.endDate,
    allDay: !!e.allDay,
    location: e.location,
    notes: e.notes,
  }));
}

/** Derniers événements lus (objets natifs) : pour modifier / supprimer un créneau BAM recopié. */
const lastListed = new Map<string, { update: (d: object) => Promise<void>; delete: () => Promise<void> }>();

const zone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  } catch {
    return 'Europe/Paris';
  }
};

const toNative = (d: MirrorDetails) => ({
  title: d.title,
  startDate: d.startDate,
  endDate: d.endDate,
  allDay: d.allDay,
  timeZone: d.allDay ? 'UTC' : zone(),
  location: d.location ?? '',
  notes: d.notes,
  alarms: [], // les rappels sont ceux de LCE, pas de notification Google en plus
});

/** Applique les changements prévus par planMirror dans l'agenda `calendarId`. Renvoie le nombre de changements faits. */
export async function applyMirror(calendarId: string, ops: MirrorOps): Promise<number> {
  const m = mod();
  let done = 0;
  if (ops.create.length) {
    const cal = await m.ExpoCalendar.get(calendarId);
    for (const d of ops.create) {
      await cal.createEvent(toNative(d));
      done++;
    }
  }
  for (const u of ops.update) {
    const ev = lastListed.get(u.id);
    if (!ev) continue;
    await ev.update(toNative(u.details));
    done++;
  }
  for (const id of ops.remove) {
    const ev = lastListed.get(id);
    if (!ev) continue;
    await ev.delete();
    done++;
  }
  return done;
}
