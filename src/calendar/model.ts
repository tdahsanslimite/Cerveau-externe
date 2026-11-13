// Modèle de données du calendrier + logique pure (récurrences, charge, chevauchements, bilan).
// Tout ce fichier est testé dans dates.test.ts.
import { addDays, diffDays, weekdayIndex } from './dates.ts';
import type { DayKey } from './dates.ts';

// ---------------- Domaines (personnalisables) ----------------

export interface Domain {
  id: string;
  label: string;
  color: string;
  /** Domaine parent : fait de celui-ci un sous-domaine (Sport › Roller). Un seul niveau ; il prend la couleur du parent. */
  parent?: string;
}

/** Domaines d'un nouvel utilisateur (décision de Valentin, 10 nov. : « juste perso, sport, travail », le reste il le crée). */
export const DEFAULT_DOMAINS: Domain[] = [
  { id: 'perso', label: 'Perso', color: '#6B7178' },
  { id: 'sport', label: 'Sport', color: '#7A4FB0' },
  { id: 'travail', label: 'Travail', color: '#2F63B0' },
];

/** Anciens domaines par défaut : gardés pour un téléphone qui a déjà des données sans liste de domaines enregistrée. */
export const LEGACY_DOMAINS: Domain[] = [
  { id: 'travail', label: 'Travail', color: '#2F63B0' },
  { id: 'famille', label: 'Famille', color: '#C9721F' },
  { id: 'sante', label: 'Santé', color: '#2E8B57' },
  { id: 'sport', label: 'Sport', color: '#7A4FB0' },
  { id: 'perso', label: 'Perso', color: '#6B7178' },
];

/** Couleurs proposées pour un domaine : distinctes, lisibles sur fond clair. */
export const DOMAIN_COLORS = [
  '#2F63B0', '#1F8A9E', '#2E8B57', '#6E8B1F', '#B38A00', '#C9721F',
  '#C2452D', '#B03A6E', '#7A4FB0', '#4F5BB0', '#6B7178', '#8A5A3C',
];

const FALLBACK_DOMAIN: Domain = { id: '_', label: 'Sans domaine', color: '#9AA0A6' };

export function domainOf(domains: Domain[], id: string): Domain {
  const d = domains.find((x) => x.id === id);
  if (!d) return FALLBACK_DOMAIN;
  const parent = d.parent ? domains.find((x) => x.id === d.parent) : undefined;
  return parent ? { ...d, color: parent.color } : d;
}

/** Domaines de premier niveau (un sous-domaine dont le parent n'existe plus en devient un). */
export function topDomains(domains: Domain[]): Domain[] {
  return domains.filter((d) => !d.parent || !domains.some((p) => p.id === d.parent));
}

export function subDomains(domains: Domain[], parentId: string): Domain[] {
  return domains.filter((d) => d.parent === parentId);
}

/** Domaine de premier niveau d'un domaine : lui-même, ou son parent s'il en a un. */
export function rootOf(domains: Domain[], id: string): string {
  const d = domains.find((x) => x.id === id);
  return d?.parent && domains.some((p) => p.id === d.parent) ? d.parent : id;
}

// ---------------- Événements ----------------

export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly';

export const REPEATS: { id: Repeat; label: string }[] = [
  { id: 'none', label: 'Une fois' },
  { id: 'weekly', label: 'Chaque semaine' },
  { id: 'weekdays', label: 'Lun – ven' },
  { id: 'daily', label: 'Chaque jour' },
];

/** Nature d'un événement. Plusieurs possibles : un IRM est un rendez-vous ET un objet à prendre. */
/** 'rappel' (13 nov.) : un rappel de date butoir, créé dans Programmer (voir `isRappel`). */
export type EventKind = 'rdv' | 'tache' | 'objet' | 'rappel';

export const KINDS: { id: EventKind; label: string; hint: string }[] = [
  { id: 'rdv', label: 'Événement', hint: 'Tu y es en personne : deux événements ne peuvent pas se chevaucher.' },
  { id: 'tache', label: 'Tâche', hint: 'Un créneau bloqué pour faire quelque chose, à cocher une fois fait.' },
  { id: 'objet', label: 'Objet à prendre', hint: 'Une chose à ne pas oublier d’emporter.' },
];

/**
 * Nature d'un créneau du calendrier, choisie dans « Programmer » (13 nov.) : Rendez-vous ou Événement.
 * Les anciennes valeurs (déplacement, activité, autre, avant le 13 nov.) sont relues par `natureOf`.
 */
export type Nature = 'rdv' | 'evenement' | 'deplacement' | 'activite' | 'autre';

export const NATURES: { id: Nature; label: string; hint: string }[] = [
  { id: 'rdv', label: 'Rendez-vous', hint: 'Médecin, coiffeur… Rien d’autre ne peut se faire à la même heure.' },
  { id: 'evenement', label: 'Événement', hint: 'Soirée, vacances… Sur toute la journée, il ne bloque rien : c’est un bandeau.' },
];

export const natureLabel = (n: Nature) => NATURES.find((x) => x.id === n)?.label ?? 'Rendez-vous';

export type ReminderUnit = 'min' | 'h' | 'j';

export interface Reminder {
  amount: number;
  unit: ReminderUnit;
}

export const MAX_REMINDERS = 3;

/** Comment le téléphone se manifeste au moment du rappel. */
export type AlertKind = 'sonnerie' | 'vibreur' | 'silencieux' | 'carillon' | 'cloche' | 'alarme';

export const ALERTS: { id: AlertKind; label: string }[] = [
  { id: 'sonnerie', label: 'Sonnerie' },
  { id: 'carillon', label: 'Carillon' },
  { id: 'cloche', label: 'Cloche' },
  { id: 'vibreur', label: 'Vibreur' },
  { id: 'silencieux', label: 'Silencieux' },
  // Comme un réveil : le son recommence jusqu'à ce qu'on touche « Je m'en occupe » (voir calendar/alarm.ts).
  { id: 'alarme', label: 'Alarme (jusqu’à éteindre)' },
];
export const REMINDER_UNITS: { id: ReminderUnit; label: string; minutes: number }[] = [
  { id: 'min', label: 'min', minutes: 1 },
  { id: 'h', label: 'heures', minutes: 60 },
  { id: 'j', label: 'jours', minutes: 1440 },
];

export interface CalendarEvent {
  id: string;
  title: string;
  /** Jour de la (première) occurrence. */
  date: DayKey;
  /** Minutes depuis minuit, ou null pour « toute la journée ». */
  start: number | null;
  durationMin: number;
  /** Identifiant du domaine (Travail, Sport…). */
  category: string;
  repeat: Repeat;
  /** Lu depuis un agenda du téléphone (Google Agenda, Planning BAM…) : affiché, jamais enregistré ni modifié ici. */
  phone?: { calendarId: string; calendarTitle: string; location?: string };
  /** Dernier jour d'un événement « toute la journée » sur plusieurs jours (vacances…). Absent = un seul jour. */
  endDate?: DayKey;
  /** Absent sur les événements créés avant la v1.1 : traité comme ['rdv']. */
  kinds?: EventKind[];
  /** Nature d'un rendez-vous (rendez-vous, déplacement, activité, autre). Absent = rendez-vous. */
  nature?: Nature;
  /** Ce qu'il faut emporter (type « objet »). */
  /** Ancien champ texte (avant le 10 nov.) : relu comme premier objet de la liste. */
  item?: string;
  /** Liste d'objets à prendre / acheter, cochables un par un (comme une liste de courses). */
  items?: ItemLine[];
  /** Rappel la veille à 20 h pour préparer l'objet. */
  itemEveReminder?: boolean;
  reminders?: Reminder[];
  /** Type d'alerte de ses rappels ; absent = celui choisi dans les réglages. */
  alert?: AlertKind;
  /** Jours où la tâche a été faite (une série peut être cochée jour par jour). */
  doneDays?: DayKey[];
  /**
   * Priorité d'un événement « Tâche » ponctuel, pour le sas et la matrice d'Eisenhower du module Tâches.
   * Absent ou null = pas encore trié (l'événement apparaît alors dans le sas).
   */
  important?: boolean | null;
  urgent?: boolean | null;
  /** Place dans sa liste d'idées (0 = tout en haut). */
  rank?: number;
  /** Placé dans « The One Thing » des idées. */
  oneThing?: boolean;
  /** Tâche pas cochée le jour prévu : le créneau reste (historique) et une nouvelle tâche est repartie dans le sas. */
  sentToSas?: boolean;
  /** Rappel : date butoir (« Impôts avant le 15 juin »). Facultative. */
  butoir?: DayKey;
  /** Rappel traité : la tâche a été programmée (ou c'était déjà fait). Le pop-up ne revient plus. */
  handled?: boolean;
  /** Rappel : premier jour où il a été vu dans le pop-up « ta journée ». Dès le lendemain, il propose de programmer la tâche. */
  firstSeen?: DayKey;
  /** Jours passés vus au ménage de la veille sans être cochés (reprogrammés ailleurs, ou qui n'ont pas eu lieu). */
  reviewedDays?: DayKey[];
  /** Jours où une occurrence d'une série a été supprimée. */
  skipped?: DayKey[];
  note?: string;
}

export interface ItemLine {
  id: string;
  text: string;
  done?: boolean;
}

/** Liste d'objets d'un événement ; l'ancien champ texte `item` devient une ligne. */
export function itemsOf(e: CalendarEvent): ItemLine[] {
  if (e.items) return e.items;
  const old = e.item?.trim();
  return old ? [{ id: 'old', text: old }] : [];
}

/** Objets encore à prendre (non cochés), sans les lignes vides. */
export const pendingItems = (e: CalendarEvent) => itemsOf(e).filter((i) => !i.done && i.text.trim());

export const kindsOf = (e: CalendarEvent): EventKind[] => (e.kinds && e.kinds.length ? e.kinds : ['rdv']);
/** Rendez-vous ou Événement. Ancien « déplacement » ou « activité » = événement ; ancien « autre » = rendez-vous. */
export const natureOf = (e: CalendarEvent): 'rdv' | 'evenement' =>
  e.nature === 'evenement' || e.nature === 'deplacement' || e.nature === 'activite' ? 'evenement' : 'rdv';
export const isTask = (e: CalendarEvent) => kindsOf(e).includes('tache');

// ---------------- Rappels de date butoir (13 nov., Valentin) ----------------
// 5ᵉ choix de Programmer : ni rendez-vous, ni événement, ni tâche. Un jour (sans heure) et une date butoir facultative.
// Au calendrier : un bandeau « toute la journée », le jour du rappel seulement (il ne bloque rien).
// Dans le pop-up « ta journée » (à l'ouverture de l'appli), à partir de ce jour et tant que la tâche n'est pas programmée :
// la première fois on le voit simplement ; dès le lendemain, il propose de programmer la tâche.

export const isRappel = (e: CalendarEvent) => kindsOf(e).includes('rappel');

/** Rappels à montrer dans le pop-up du jour : arrivés (jour du rappel passé ou aujourd'hui) et pas encore traités, le plus ancien d'abord. */
export function pendingRappels(events: CalendarEvent[], today: DayKey): CalendarEvent[] {
  return events
    .filter((e) => isRappel(e) && !e.handled && !e.phone && e.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/** Déjà vu un jour précédent : il propose maintenant de programmer la tâche. */
export const rappelActionable = (e: CalendarEvent, today: DayKey) => !!e.firstSeen && e.firstSeen < today;

// ---------------- Ménage de la veille (13 nov., Valentin) ----------------
// En entrant dans « Organiser et planifier » : tout ce qui avait une heure les jours passés et n'a été ni coché,
// ni vu au ménage, revient un par un (le plus ancien d'abord). Fait / Reprogrammer / N'a pas eu lieu.

/** Se coche dans le calendrier : tout ce qui a une heure et vient de l'appli (pas les agendas du téléphone, pas les rappels). */
export const isCheckable = (e: CalendarEvent) => !e.phone && !isRappel(e) && e.start !== null && !e.sentToSas;

/** Combien de jours en arrière le ménage remonte au plus. */
export const REVIEW_DAYS = 7;

/** Prochaine occurrence passée à revoir, ou null. `from` = premier jour pris en compte. */
export function nextToReview(events: CalendarEvent[], today: DayKey, from?: DayKey): Occurrence | null {
  let start = addDays(today, -REVIEW_DAYS);
  if (from && from > start) start = from;
  const mine = events.filter(isCheckable);
  for (let day = start; day < today; day = addDays(day, 1)) {
    const hit = occurrencesOn(mine, day).find((o) => !isDoneOn(o.event, day) && !o.event.reviewedDays?.includes(day));
    if (hit) return hit;
  }
  return null;
}

/** Copie à reprogrammer d'une occurrence passée : un créneau neuf, une seule fois, proposé aujourd'hui à la même heure. */
export function reprogramCopy(e: CalendarEvent, today: DayKey): CalendarEvent {
  return {
    ...e, id: newId(), date: today, repeat: 'none', endDate: undefined, doneDays: undefined, skipped: undefined,
    reviewedDays: undefined, sentToSas: undefined, oneThing: undefined, rank: undefined,
    items: e.items?.map((i) => ({ ...i })),
  };
}

export function blankRappel(day: DayKey, category: string): CalendarEvent {
  return { id: newId(), title: '', date: day, start: null, durationMin: 0, category, repeat: 'none', kinds: ['rappel'], reminders: [] };
}
export const isDoneOn = (e: CalendarEvent, day: DayKey) => !!e.doneDays?.includes(day);
export const endOf = (e: CalendarEvent) => (e.start ?? 0) + e.durationMin;

export function reminderMinutes(r: Reminder): number {
  return r.amount * (REMINDER_UNITS.find((u) => u.id === r.unit)?.minutes ?? 1);
}

export function reminderLabel(r: Reminder): string {
  const unit = r.unit === 'min' ? 'min' : r.unit === 'h' ? (r.amount > 1 ? 'heures' : 'heure') : r.amount > 1 ? 'jours' : 'jour';
  return `${r.amount} ${unit} avant`;
}

/** Une occurrence affichable d'un événement, sur un jour précis. */
export interface Occurrence {
  event: CalendarEvent;
  day: DayKey;
}

export function occursOn(e: CalendarEvent, day: DayKey): boolean {
  if (e.skipped?.includes(day)) return false;
  const n = diffDays(e.date, day);
  if (n < 0) return false;
  switch (e.repeat) {
    case 'none':
      return n === 0 || (!!e.endDate && diffDays(day, e.endDate) >= 0);
    case 'daily':
      return true;
    case 'weekdays':
      return weekdayIndex(day) < 5;
    case 'weekly':
      return n % 7 === 0;
  }
}

/** Occurrences d'un jour, triées : journée entière d'abord, puis par heure. */
export function occurrencesOn(events: CalendarEvent[], day: DayKey): Occurrence[] {
  return events
    .filter((e) => occursOn(e, day))
    .map((event) => ({ event, day }))
    .sort((a, b) => (a.event.start ?? -1) - (b.event.start ?? -1) || a.event.title.localeCompare(b.event.title));
}

// ---------------- Charge du jour ----------------

export type LoadLevel = 'vide' | 'legere' | 'equilibree' | 'chargee' | 'trop';

export const LOAD_LABEL: Record<LoadLevel, string> = {
  vide: 'Journée libre',
  legere: 'Légère',
  equilibree: 'Équilibrée',
  chargee: 'Au maximum',
  trop: 'Trop chargée',
};

/** Charge d'une journée par rapport à la limite choisie par l'utilisateur. */
export function loadLevel(count: number, limit: number): LoadLevel {
  if (count === 0) return 'vide';
  if (count > limit) return 'trop';
  if (count === limit) return 'chargee';
  if (count / limit > 0.6) return 'equilibree';
  return 'legere';
}

// ---------------- Créneaux et chevauchements ----------------

/**
 * Créneaux libres d'au moins `minGap` minutes entre `dayStart` et `dayEnd`,
 * en tenant compte des chevauchements. Les événements « journée » sont ignorés.
 */
export function freeSlots(occs: Occurrence[], dayStart = 8 * 60, dayEnd = 21 * 60, minGap = 60): { from: number; to: number }[] {
  const busy = occs
    .filter((o) => o.event.start !== null)
    .map((o) => ({ from: o.event.start as number, to: endOf(o.event) }))
    .sort((a, b) => a.from - b.from);
  const slots: { from: number; to: number }[] = [];
  let cursor = dayStart;
  for (const b of busy) {
    if (b.from - cursor >= minGap && b.from <= dayEnd) slots.push({ from: cursor, to: Math.min(b.from, dayEnd) });
    cursor = Math.max(cursor, b.to);
  }
  if (dayEnd - cursor >= minGap) slots.push({ from: cursor, to: dayEnd });
  return slots;
}

const overlaps = (a: CalendarEvent, b: CalendarEvent) =>
  a.start !== null && b.start !== null && a.start < endOf(b) && b.start < endOf(a);

/** « Événement » = on y est en personne (ex-Rendez-vous). Tâches et objets seuls ne réservent pas le créneau. */
export const isPresence = (e: CalendarEvent) => kindsOf(e).includes('rdv');

/** Jours occupés par `e` à vérifier : la période d'un événement sur plusieurs jours, ou les prochaines semaines d'une série. */
function daysToCheck(e: CalendarEvent, horizonDays: number): DayKey[] {
  const count = e.repeat === 'none' ? (e.endDate ? Math.max(0, diffDays(e.date, e.endDate)) + 1 : 1) : horizonDays;
  return Array.from({ length: count }, (_, i) => addDays(e.date, i)).filter((d) => occursOn(e, d));
}

/**
 * Est-ce que `existing` empêche `cand` d'avoir lieu en même temps ? (règle de Valentin, 13 nov.)
 * Tout ce qui a une heure bloque tout ce qui a une heure : deux rendez-vous, un rendez-vous et un événement,
 * deux tâches, une tâche et un rendez-vous ou un événement. Une liste est une tâche ou un rendez-vous avec sa check-liste.
 * Ce qui dure toute la journée (vacances, anniversaire, plusieurs jours) ne bloque rien et n'est jamais bloqué :
 * c'est un bandeau, on peut poser des tâches et des rendez-vous dedans.
 * Une tâche sans heure n'est pas au calendrier (seulement dans la matrice).
 */
function blocks(existing: CalendarEvent, cand: CalendarEvent): boolean {
  return existing.start !== null && cand.start !== null;
}

/** Premier événement déjà prévu qui bloque `candidate` (voir `blocks`). */
export function findConflict(events: CalendarEvent[], candidate: CalendarEvent, horizonDays = 56): Occurrence | null {
  const others = events.filter((e) => e.id !== candidate.id && blocks(e, candidate));
  if (!others.length) return null;
  for (const day of daysToCheck(candidate, horizonDays)) {
    const hit = others.find((o) => occursOn(o, day) && overlaps(candidate, o));
    if (hit) return { event: hit, day };
  }
  return null;
}

/** Première heure de début ≥ `from` où un événement de `duration` minutes tient ce jour-là. */
export function nextFreeStart(events: CalendarEvent[], candidate: CalendarEvent, from: number): number | null {
  for (let s = from; s + candidate.durationMin <= 24 * 60; s += 5) {
    const moved = { ...candidate, start: s, repeat: 'none' as Repeat };
    if (!findConflict(events, moved)) return s;
  }
  return null;
}

// ---------------- Bilan : heures par domaine ----------------

/** Minutes passées par domaine sur [from, to] inclus (événements à heure précise uniquement). */
export function minutesByDomain(events: CalendarEvent[], from: DayKey, to: DayKey): Record<string, number> {
  const out: Record<string, number> = {};
  for (let day = from; diffDays(day, to) >= 0; day = addDays(day, 1)) {
    for (const o of occurrencesOn(events, day)) {
      if (o.event.start === null) continue;
      out[o.event.category] = (out[o.event.category] ?? 0) + o.event.durationMin;
    }
  }
  return out;
}

export type BilanPeriod = 'semaine' | 'mois' | 'annee';

export interface DomainHours {
  /** Minutes déjà passées (jours écoulés et aujourd'hui). */
  done: number;
  /** Minutes encore prévues d'ici la fin de la période. */
  planned: number;
}

/**
 * Bilan des heures par domaine sur [from, to].
 * Jours passés (et aujourd'hui) → « passé » ; jours à venir → « prévu ».
 * Une tâche du calendrier non cochée un jour passé n'a pas eu lieu : elle n'est pas comptée.
 * Les événements « toute la journée » n'ont pas de durée : ignorés.
 */
export function hoursByDomain(events: CalendarEvent[], from: DayKey, to: DayKey, today: DayKey): Record<string, DomainHours> {
  const out: Record<string, DomainHours> = {};
  for (let day = from; diffDays(day, to) >= 0; day = addDays(day, 1)) {
    const past = diffDays(day, today) >= 0;
    for (const o of occurrencesOn(events, day)) {
      const e = o.event;
      if (e.start === null) continue;
      if (past && isTask(e) && !isDoneOn(e, day) && diffDays(day, today) > 0) continue;
      const slot = (out[e.category] ??= { done: 0, planned: 0 });
      if (past) slot.done += e.durationMin;
      else slot.planned += e.durationMin;
    }
  }
  return out;
}

export interface HoursGroup {
  /** Domaine de premier niveau. */
  id: string;
  done: number;
  planned: number;
  /** Détail par sous-domaine. L'entrée dont l'id est celui du groupe = heures « sans précision ». Vide si le domaine n'a pas de sous-domaine utilisé. */
  subs: { id: string; done: number; planned: number }[];
}

/** Regroupe les heures par domaine de premier niveau, avec le détail des sous-domaines. */
export function groupHours(report: Record<string, DomainHours>, domains: Domain[]): HoursGroup[] {
  const groups = new Map<string, HoursGroup>();
  const own = new Map<string, DomainHours>();
  for (const [id, h] of Object.entries(report)) {
    const root = rootOf(domains, id);
    const g = groups.get(root) ?? { id: root, done: 0, planned: 0, subs: [] };
    g.done += h.done;
    g.planned += h.planned;
    if (id === root) own.set(root, h);
    else g.subs.push({ id, done: h.done, planned: h.planned });
    groups.set(root, g);
  }
  for (const g of groups.values()) {
    g.subs.sort((a, b) => b.done - a.done || b.planned - a.planned);
    const o = own.get(g.id);
    if (g.subs.length && o) g.subs.push({ id: g.id, done: o.done, planned: o.planned });
  }
  return [...groups.values()];
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
