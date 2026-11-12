// Réveil (12 nov., demande de Valentin : remplacer l'appli réveil du téléphone).
// Plusieurs réveils par jour, chacun avec un titre (à quoi il sert), ses jours et son son.
// Pas de snooze (décision de Valentin) : un réveil sonne jusqu'à « J'arrête ».
// Logique pure et testée ; la programmation sur le téléphone est dans native.ts (module modules/reveil).

/** 0 = lundi … 6 = dimanche (même convention que les routines). */
export type Weekday = number;

export type WakeAlarm = {
  id: string;
  /** Heure en minutes depuis minuit (à la minute près). */
  minutes: number;
  /** Jours de la semaine ; vide = une seule fois (à la prochaine heure indiquée). */
  days: Weekday[];
  /** À quoi il sert (« Réveil », « Médicament »…). */
  title: string;
  /** « app:<nom> » = son de l'appli, « uri:<adresse> » = sonnerie du téléphone. */
  sound: string;
  /** Nom affiché d'une sonnerie du téléphone (les sons de l'appli ont leur nom dans APP_SOUNDS). */
  soundLabel?: string;
  on: boolean;
};

export type ReveilData = { alarms: WakeAlarm[] };
export const STORAGE_KEY = 'ce.reveil.v1';
export const EMPTY: ReveilData = { alarms: [] };

/** Plafond de sécurité (Valentin parle d'une dizaine par jour). */
export const MAX_ALARMS = 40;

export const APP_SOUNDS: { id: string; label: string }[] = [
  { id: 'app:douceur', label: 'Douceur' },
  { id: 'app:marimba', label: 'Marimba' },
  { id: 'app:cloche', label: 'Cloche' },
  { id: 'app:montee', label: 'Montée' },
  { id: 'app:bip', label: 'Bip' },
  { id: 'app:mecanique', label: 'Réveil mécanique' },
];
export const DEFAULT_SOUND = 'app:douceur';

/** Titres proposés en un toucher (le champ reste libre). */
export const TITLE_IDEAS = ['Réveil', 'Médicament', 'Partir', 'Manger', 'Sport', 'Se coucher'];

export const ALL_WEEK: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const WORK_WEEK: Weekday[] = [0, 1, 2, 3, 4];
const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function soundLabel(a: Pick<WakeAlarm, 'sound' | 'soundLabel'>): string {
  const own = APP_SOUNDS.find((s) => s.id === a.sound);
  if (own) return own.label;
  if (a.sound.startsWith('uri:')) return a.soundLabel || 'Sonnerie du téléphone';
  return APP_SOUNDS[0].label;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** « 06:45 » */
export function formatTime(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

/** Jours d'un réveil en clair. */
export function daysText(days: Weekday[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return 'Une fois';
  if (sorted.length === 7) return 'Tous les jours';
  if (sorted.length === 5 && sorted.every((d, i) => d === i)) return 'Lun – ven';
  if (sorted.length === 2 && sorted[0] === 5 && sorted[1] === 6) return 'Week-end';
  return sorted.map((d) => DAY_SHORT[d]).join(', ');
}

/** Jour de la semaine d'une date (0 = lundi). */
export function weekdayOf(d: Date): Weekday {
  return (d.getDay() + 6) % 7;
}

/** Prochaine sonnerie strictement après `now`, ou null si le réveil est éteint. Même calcul que le téléphone. */
export function nextRing(a: WakeAlarm, now: Date): Date | null {
  if (!a.on) return null;
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, Math.floor(a.minutes / 60), a.minutes % 60, 0, 0);
    if (d.getTime() > now.getTime() && (a.days.length === 0 || a.days.includes(weekdayOf(d)))) return d;
  }
  return null;
}

/** Le réveil qui sonnera en premier. */
export function nextOverall(alarms: WakeAlarm[], now: Date): { alarm: WakeAlarm; at: Date } | null {
  let best: { alarm: WakeAlarm; at: Date } | null = null;
  for (const a of alarms) {
    const at = nextRing(a, now);
    if (at && (!best || at.getTime() < best.at.getTime())) best = { alarm: a, at };
  }
  return best;
}

/** « dans 7 h 05 », « dans 12 min », « dans moins d'une minute ». */
export function untilText(at: Date, now: Date): string {
  const total = Math.ceil((at.getTime() - now.getTime()) / 60000);
  if (total <= 1) return 'dans moins d’une minute';
  if (total < 60) return `dans ${total} min`;
  const days = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (days > 0) return `dans ${days} j ${h} h`;
  return m === 0 ? `dans ${h} h` : `dans ${h} h ${pad2(m)}`;
}

/** « aujourd'hui à 06:45 », « demain à 06:45 », « lundi à 06:45 ». */
export function whenText(at: Date, now: Date): string {
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayAt = new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
  const diff = Math.round((dayAt - day0) / 86400000);
  const time = formatTime(at.getHours() * 60 + at.getMinutes());
  if (diff === 0) return `aujourd’hui à ${time}`;
  if (diff === 1) return `demain à ${time}`;
  const names = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  return `${names[weekdayOf(at)]} à ${time}`;
}

/** Réveils triés par heure (puis titre) pour la liste. */
export function sortAlarms(alarms: WakeAlarm[]): WakeAlarm[] {
  return [...alarms].sort((a, b) => a.minutes - b.minutes || a.title.localeCompare(b.title, 'fr'));
}

/** Nombre de réveils allumés qui sonnent un jour de la semaine donné (les « une fois » comptent pour leur jour). */
export function countOn(alarms: WakeAlarm[], day: Date, now: Date): number {
  const wd = weekdayOf(day);
  const sameDay = (d: Date) => d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
  return alarms.filter((a) => {
    if (!a.on) return false;
    if (a.days.length > 0) return a.days.includes(wd);
    const at = nextRing(a, now);
    return !!at && sameDay(at);
  }).length;
}

/** Ce que le téléphone doit programmer : les seuls réveils allumés. */
export type NativeSpec = { id: string; hour: number; minute: number; days: Weekday[]; title: string; sound: string };
export function toNative(alarms: WakeAlarm[]): NativeSpec[] {
  return alarms
    .filter((a) => a.on)
    .map((a) => ({
      id: a.id,
      hour: Math.floor(a.minutes / 60),
      minute: a.minutes % 60,
      days: [...new Set(a.days)].sort((x, y) => x - y),
      title: a.title.trim() || 'Réveil',
      sound: a.sound || DEFAULT_SOUND,
    }));
}

/** Les réveils « une fois » qui ont sonné s'éteignent (ils restent dans la liste pour être rallumés). */
export function turnOffFired(alarms: WakeAlarm[], firedIds: string[]): WakeAlarm[] {
  if (firedIds.length === 0) return alarms;
  return alarms.map((a) => (firedIds.includes(a.id) && a.days.length === 0 ? { ...a, on: false } : a));
}

export function newAlarm(now: Date, id: string): WakeAlarm {
  // Par défaut : demain matin 7:00 si on est le soir, sinon dans une heure arrondie.
  const m = now.getHours() * 60 + now.getMinutes();
  const minutes = m >= 18 * 60 || m < 5 * 60 ? 7 * 60 : Math.min(23 * 60 + 55, Math.ceil((m + 60) / 5) * 5);
  return { id, minutes, days: [], title: 'Réveil', sound: DEFAULT_SOUND, on: true };
}
