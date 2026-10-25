// Lecture des agendas du téléphone (Android : Google Agenda et tout agenda synchronisé, ex. Planning BAM).
// Lecture seule pour l'instant : rien n'est écrit dans Google. Sans effet sur le web.
import { Platform } from 'react-native';
import type { PhoneCalendarInfo, RawPhoneEvent } from './phoneEvents';

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
    }));
}

export async function listPhoneEvents(calendarIds: string[], from: Date, to: Date): Promise<RawPhoneEvent[]> {
  if (calendarIds.length === 0) return [];
  const m = mod();
  const events = await m.listEvents(calendarIds, from, to);
  return events.map((e) => ({
    id: String(e.id),
    calendarId: String(e.calendarId),
    title: e.title,
    startDate: e.startDate,
    endDate: e.endDate,
    allDay: !!e.allDay,
    location: e.location,
  }));
}
