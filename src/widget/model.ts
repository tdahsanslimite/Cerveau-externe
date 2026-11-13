// Ce que le widget « Ma journée » affiche (13 nov., Valentin : « comme le calendrier Google »).
// Le widget tourne sans l'appli ouverte : il ne peut pas relire les agendas du téléphone ni recalculer les séries.
// L'appli lui prépare donc un « instantané » des 8 prochains jours (clé ce.widget.v1), et le widget y prend le jour courant.
// Testé dans model.test.ts. Les imports gardent l'extension .ts pour `npm test`.
import { addDays, minutesToLabel } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';
import { endOf, isCheckable, isDoneOn, isRappel, occurrencesOn, pendingRappels } from '../calendar/model.ts';
import type { CalendarEvent } from '../calendar/model.ts';

export const WIDGET_NAME = 'Journee';
export const WIDGET_KEY = 'ce.widget.v1';
export const WIDGET_DAYS = 8;

export interface WidgetLine {
  /** « 09:00 » ou null (toute la journée). */
  time: string | null;
  end: string | null;
  title: string;
  color: string;
  done: boolean;
}

export interface WidgetRappel {
  title: string;
  /** Jour du rappel : il s'affiche à partir de ce jour. */
  from: DayKey;
  butoir?: DayKey;
}

export interface WidgetSnapshot {
  /** Lignes de chaque jour, de `start` à start + 7. */
  days: Record<DayKey, WidgetLine[]>;
  oneThing?: string;
  rappels: WidgetRappel[];
  /** Moment où l'appli l'a écrit (ms). */
  at: number;
}

/** Instantané des 8 prochains jours. `color(category)` : couleur du domaine (ou de l'agenda du téléphone). */
export function buildSnapshot(events: CalendarEvent[], start: DayKey, color: (category: string) => string, oneThing?: string, now = Date.now()): WidgetSnapshot {
  const days: Record<DayKey, WidgetLine[]> = {};
  const shown = events.filter((e) => !isRappel(e));
  for (let i = 0; i < WIDGET_DAYS; i++) {
    const day = addDays(start, i);
    days[day] = occurrencesOn(shown, day).map((o) => ({
      time: o.event.start === null ? null : minutesToLabel(o.event.start),
      end: o.event.start === null ? null : minutesToLabel(endOf(o.event)),
      title: o.event.title,
      color: color(o.event.category),
      done: isCheckable(o.event) && isDoneOn(o.event, day),
    }));
  }
  // Rappels pas encore traités, y compris ceux qui arriveront dans la semaine.
  const rappels = pendingRappels(events, addDays(start, WIDGET_DAYS - 1)).map((r) => ({ title: r.title, from: r.date, butoir: r.butoir }));
  return { days, oneThing, rappels, at: now };
}

/** Ce qu'il faut afficher aujourd'hui. Un jour hors de l'instantané (appli pas ouverte depuis 8 jours) : rien, et on le dit. */
export function widgetToday(snap: WidgetSnapshot | null, today: DayKey): { lines: WidgetLine[]; rappels: WidgetRappel[]; oneThing?: string; stale: boolean } {
  if (!snap || !snap.days[today]) return { lines: [], rappels: [], stale: true };
  return {
    lines: snap.days[today],
    rappels: snap.rappels.filter((r) => r.from <= today),
    oneThing: snap.oneThing,
    stale: false,
  };
}
