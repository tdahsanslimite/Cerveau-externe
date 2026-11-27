// Modèles de notification (27 nov., demande de Valentin) : on crée une notification une fois
// (moments, son, couleur), on l'enregistre, et la fois suivante on la reprend d'un geste.
// Un événement garde une COPIE des réglages : modifier ou supprimer un modèle ne touche pas
// aux notifications déjà posées.
import { ALERTS, MAX_REMINDERS, reminderLabel } from './model.ts';
import type { AlertKind, CalendarEvent, Reminder } from './model.ts';

export interface NotifModel {
  id: string;
  name: string;
  reminders: Reminder[];
  alert: AlertKind;
  /** Couleur de la notification (petite icône et nom de l'appli sur Android). */
  color: string;
}

/** Couleurs proposées (palette de l'appli) : chaud = à ne pas rater, froid = à faire au calme. */
export const NOTIF_COLORS: { id: string; label: string }[] = [
  { id: '#D92D20', label: 'Rouge' },
  { id: '#9E2B19', label: 'Brique' },
  { id: '#B4541A', label: 'Orange' },
  { id: '#9A6A00', label: 'Ambre' },
  { id: '#2E8B57', label: 'Vert (apaisant)' },
  { id: '#14606E', label: 'Bleu (concentration)' },
  { id: '#6E5BA8', label: 'Lavande' },
  { id: '#52616A', label: 'Gris' },
];

export const DEFAULT_COLOR = NOTIF_COLORS[0].id;

export function colorLabel(color: string | undefined): string {
  return NOTIF_COLORS.find((c) => c.id === color)?.label ?? 'Sans couleur';
}

/** Moments + son, sur une ligne : « 30 min avant, 1 jour avant · Sonnerie ». */
export function modelSummary(m: Pick<NotifModel, 'reminders' | 'alert'>): string {
  const when = m.reminders.map(reminderLabel).join(', ') || 'Aucun moment';
  const sound = ALERTS.find((a) => a.id === m.alert)?.label ?? m.alert;
  return `${when} · ${sound}`;
}

/** Nom proposé quand on enregistre un nouveau modèle (modifiable). */
export function suggestName(m: Pick<NotifModel, 'reminders' | 'alert' | 'color'>): string {
  const first = m.reminders[0] ? reminderLabel(m.reminders[0]) : 'Notification';
  const sound = ALERTS.find((a) => a.id === m.alert)?.label ?? '';
  return `${first} · ${sound}`.trim();
}

/** Garde au plus 3 moments, valeurs entre 1 et 999, sans doublon. */
export function cleanReminders(list: Reminder[]): Reminder[] {
  const seen = new Set<string>();
  const out: Reminder[] = [];
  for (const r of list) {
    const amount = Math.max(1, Math.min(999, Math.round(r.amount) || 1));
    const key = `${amount}${r.unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ amount, unit: r.unit });
    if (out.length === MAX_REMINDERS) break;
  }
  return out;
}

/** Pose les réglages d'un modèle sur un événement (copie). */
export function applyModel(e: CalendarEvent, m: Pick<NotifModel, 'reminders' | 'alert' | 'color'>): CalendarEvent {
  return { ...e, reminders: cleanReminders(m.reminders), alert: m.alert, color: m.color };
}

/** Ajoute un modèle (le plus récent en premier) ; un nom déjà pris est numéroté « (2) ». */
export function addModel(list: NotifModel[], m: NotifModel): NotifModel[] {
  const base = m.name.trim() || suggestName(m);
  const taken = new Set(list.map((x) => x.name.toLowerCase()));
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (${n})`;
  return [{ ...m, name, reminders: cleanReminders(m.reminders) }, ...list];
}

export function removeModel(list: NotifModel[], id: string): NotifModel[] {
  return list.filter((m) => m.id !== id);
}

/** Faut-il proposer une notification après une création ? Seulement si le créneau n'en a aucune. */
export function needsPrompt(e: CalendarEvent | undefined): boolean {
  return !!e && (e.reminders?.length ?? 0) === 0 && !e.itemEveReminder && !(e.kinds ?? []).includes('rappel');
}
