// Calcul pur des rappels à programmer (testé dans dates.test.ts, sans téléphone).
import { addDays, fromKey, minutesToLabel, todayKey } from './dates.ts';
import type { DayKey } from './dates.ts';
import { kindsOf, occursOn, reminderLabel, reminderMinutes } from './model.ts';
import type { AlertKind, CalendarEvent } from './model.ts';

export const HORIZON_DAYS = 30;
export const MAX_SCHEDULED = 400; // Android limite le nombre d'alarmes par appli : on reste large
const ALL_DAY_BASE = 9 * 60; // un événement « journée » est rappelé comme s'il était à 9 h
const EVE_REMINDER = 20 * 60; // rappel « objet à préparer » la veille à 20 h

export interface Planned {
  at: Date;
  alert: AlertKind;
  title: string;
  body: string;
}

function dateAt(day: DayKey, minutes: number): Date {
  const d = fromKey(day);
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + minutes * 60000);
}

/** Liste des rappels à programmer (fonction pure, sans effet). */
export function planReminders(
  events: CalendarEvent[], now = new Date(), today: DayKey = todayKey(), defaultAlert: AlertKind = 'sonnerie',
): Planned[] {
  const out: Planned[] = [];
  const first = addDays(today, -1); // un rappel « 1 jour avant » peut viser demain
  for (let i = 0; i <= HORIZON_DAYS + 7; i++) {
    const day = addDays(first, i);
    for (const e of events) {
      if (!occursOn(e, day)) continue;
      const base = e.start ?? ALL_DAY_BASE;
      const when = e.start === null ? 'Aujourd’hui' : `${minutesToLabel(e.start)} – ${minutesToLabel(base + e.durationMin)}`;
      const kinds = kindsOf(e);
      const item = kinds.includes('objet') && e.item?.trim() ? e.item.trim() : null;
      const lines = [when];
      if (item) lines.push(`Pense à prendre : ${item}`);
      if (kinds.includes('tache')) lines.push('Tâche prévue sur ce créneau');

      for (const r of e.reminders ?? []) {
        out.push({
          alert: e.alert ?? defaultAlert,
          at: dateAt(day, base - reminderMinutes(r)),
          title: `${e.title} · ${reminderLabel(r)}`,
          body: lines.join('\n'),
        });
      }
      if (item && e.itemEveReminder) {
        out.push({
          alert: e.alert ?? defaultAlert,
          at: dateAt(addDays(day, -1), EVE_REMINDER),
          title: `Demain : ${e.title}`,
          body: `Prépare dès ce soir : ${item}`,
        });
      }
    }
  }
  const limit = now.getTime() + HORIZON_DAYS * 86400000;
  return out
    .filter((p) => p.at.getTime() > now.getTime() + 5000 && p.at.getTime() <= limit)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_SCHEDULED);
}


/** Sépare les rappels « alarme » (son en boucle, gérés par calendar/alarm.ts) des autres notifications. */
export function splitByAlarm(plan: Planned[]): { alarms: Planned[]; others: Planned[] } {
  return {
    alarms: plan.filter((p) => p.alert === 'alarme'),
    others: plan.filter((p) => p.alert !== 'alarme'),
  };
}
