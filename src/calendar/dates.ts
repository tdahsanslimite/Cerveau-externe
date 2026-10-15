// Utilitaires de dates purs (sans dépendance), testés dans dates.test.ts.
// Un jour est toujours manipulé sous forme de clé locale "YYYY-MM-DD",
// jamais en UTC, pour éviter les décalages de fuseau horaire.

export type DayKey = string; // "2026-10-13"

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // midi : à l'abri des changements d'heure
}

export function todayKey(): DayKey {
  return toKey(new Date());
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function addMonths(key: DayKey, n: number): DayKey {
  const d = fromKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toKey(d);
}

/** 0 = lundi … 6 = dimanche (semaine à la française). */
export function weekdayIndex(key: DayKey): number {
  return (fromKey(key).getDay() + 6) % 7;
}

export function startOfWeek(key: DayKey): DayKey {
  return addDays(key, -weekdayIndex(key));
}

export function weekDays(key: DayKey): DayKey[] {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Nombre de jours entre deux clés (b - a). */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}

/** Numéro de semaine ISO 8601. */
export function isoWeek(key: DayKey): number {
  const d = fromKey(key);
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - weekdayIndex(key) + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4, 12);
  const firstWeekStart = new Date(firstThursday);
  firstWeekStart.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((thursday.getTime() - firstWeekStart.getTime()) / (7 * 86400000));
}

/** Tous les jours du mois contenant `key`, du 1er au dernier. */
export function monthDays(key: DayKey): DayKey[] {
  const d = fromKey(key);
  const count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const prefix = key.slice(0, 7);
  return Array.from({ length: count }, (_, i) => `${prefix}-${pad(i + 1)}`);
}

/** Grille du mois : semaines complètes du lundi au dimanche (35 ou 42 cases). */
export function monthGrid(key: DayKey): { key: DayKey; inMonth: boolean }[] {
  const d = fromKey(key);
  const first = toKey(new Date(d.getFullYear(), d.getMonth(), 1, 12));
  const start = startOfWeek(first);
  const month = d.getMonth();
  const cells: { key: DayKey; inMonth: boolean }[] = [];
  let cur = start;
  do {
    for (let i = 0; i < 7; i++) {
      cells.push({ key: cur, inMonth: fromKey(cur).getMonth() === month });
      cur = addDays(cur, 1);
    }
  } while (fromKey(cur).getMonth() === month);
  return cells;
}

// ---- Libellés français ----

export const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const DAY_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function labelDayLong(key: DayKey): string {
  const d = fromKey(key);
  return `${DAY_LONG[weekdayIndex(key)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function labelDayShort(key: DayKey): string {
  const d = fromKey(key);
  return `${DAY_SHORT[weekdayIndex(key)]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function labelMonth(key: DayKey): string {
  const d = fromKey(key);
  const m = MONTHS[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

export function labelWeekRange(key: DayKey): string {
  const days = weekDays(key);
  const a = fromKey(days[0]);
  const b = fromKey(days[6]);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`;
  return `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`;
}

/** "Aujourd'hui", "Demain", "Hier" ou rien. */
export function relativeLabel(key: DayKey, today: DayKey = todayKey()): string | null {
  const n = diffDays(today, key);
  if (n === 0) return 'Aujourd’hui';
  if (n === 1) return 'Demain';
  if (n === -1) return 'Hier';
  return null;
}

// ---- Heures, en minutes depuis minuit ----

export function minutesToLabel(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${pad(r)}` : `${h} h`;
}
