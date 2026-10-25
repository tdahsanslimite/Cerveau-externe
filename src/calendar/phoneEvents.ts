// Agendas du téléphone (Google Agenda, Planning BAM…) → événements Cerveau Externe, en LECTURE SEULE.
// Fonctions pures, testées dans phoneEvents.test.ts. La lecture réelle est dans phoneCalendar.ts.
import { addDays, toKey } from './dates.ts';
import type { DayKey } from './dates.ts';
import type { CalendarEvent, Domain } from './model.ts';

export interface PhoneCalendarInfo {
  id: string;
  title: string;
  color: string;
  account: string;
}

export interface RawPhoneEvent {
  id: string;
  calendarId: string;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  allDay: boolean;
  location?: string | null;
}

/** Préfixe des domaines virtuels : un domaine par agenda du téléphone (pour la couleur et le bilan des heures). */
export const PHONE_DOMAIN_PREFIX = 'phone:';
export const isPhoneDomain = (id: string) => id.startsWith(PHONE_DOMAIN_PREFIX);

export function phoneDomain(cal: PhoneCalendarInfo): Domain {
  return { id: `${PHONE_DOMAIN_PREFIX}${cal.id}`, label: cal.title, color: cal.color || '#5F6B7A' };
}

const utcKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/**
 * Un événement du téléphone devient un (ou plusieurs) événements « Événement » en lecture seule :
 * - journée entière : Android les range à minuit UTC, fin exclue → on lit les dates en UTC ;
 * - sur plusieurs jours avec heures (ex. nuit 22 h → 6 h) : découpé jour par jour.
 */
export function toCalendarEvents(raw: RawPhoneEvent, cal: PhoneCalendarInfo): CalendarEvent[] {
  const start = new Date(raw.startDate);
  const end = new Date(raw.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return [];
  const base = {
    title: raw.title?.trim() || '(sans titre)',
    category: `${PHONE_DOMAIN_PREFIX}${cal.id}`,
    repeat: 'none' as const,
    kinds: ['rdv' as const],
    reminders: [],
    phone: { calendarId: cal.id, calendarTitle: cal.title, location: raw.location || undefined },
  };
  const key = `phone:${raw.id}:${start.getTime()}`;

  if (raw.allDay) {
    const first = utcKey(start);
    const last = addDays(utcKey(end), -1);
    return [{ ...base, id: key, date: first, start: null, durationMin: 0, endDate: last > first ? last : undefined }];
  }

  const out: CalendarEvent[] = [];
  let dayStart = new Date(start);
  let i = 0;
  while (dayStart < end && i < 31) {
    const day: DayKey = toKey(dayStart);
    const midnight = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1);
    const segEnd = end < midnight ? end : midnight;
    const startMin = dayStart.getHours() * 60 + dayStart.getMinutes();
    const dur = Math.max(5, Math.round((segEnd.getTime() - dayStart.getTime()) / 60000));
    out.push({ ...base, id: i === 0 ? key : `${key}:${i}`, date: day, start: startMin, durationMin: Math.min(dur, 24 * 60 - startMin) });
    dayStart = midnight;
    i++;
  }
  return out;
}

export function phoneEventsToCalendar(raws: RawPhoneEvent[], cals: PhoneCalendarInfo[]): CalendarEvent[] {
  const byId = new Map(cals.map((c) => [c.id, c]));
  return raws.flatMap((r) => {
    const cal = byId.get(r.calendarId);
    return cal ? toCalendarEvents(r, cal) : [];
  });
}
