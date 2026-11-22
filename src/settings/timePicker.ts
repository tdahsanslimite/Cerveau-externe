// Roulette ou horloge pour choisir une heure : UN SEUL réglage pour toute l'appli (22 nov., Valentin), qui s'applique
// à tous les endroits où l'on règle une heure (TIME_PLACES). Pur, testé.

export type TimePicker = 'wheel' | 'clock';

/** Les endroits de l'appli où l'on choisit une heure (tous suivent le même réglage). Nouvel endroit : une ligne ici + `<TimeSelector place=…>`. */
export type TimePlace = 'calendrier' | 'taches' | 'journal' | 'reveil';

export const TIME_PLACES: { id: TimePlace; where: string }[] = [
  { id: 'calendrier', where: 'Début et fin d’un événement' },
  { id: 'taches', where: 'Heure quand on met une idée au calendrier' },
  { id: 'journal', where: 'Heure de coucher et de lever' },
  { id: 'reveil', where: 'Heure du réveil' },
];

export const PICKER_LABEL: Record<TimePicker, string> = { wheel: 'Roulette', clock: 'Horloge' };

export const PICKER_HINT: Record<TimePicker, string> = {
  wheel: 'Les heures et les minutes défilent.',
  clock: 'Tu touches l’heure sur le cadran, puis les minutes.',
};

/**
 * UN SEUL choix roulette / horloge pour toute l'appli (22 nov., Valentin : « quand tu as un style d'utilisation,
 * tu veux le même sur toutes tes apps »). Absent ou abîmé = roulette (le comportement d'avant).
 */
export function resolvePicker(global: TimePicker | undefined): TimePicker {
  return global === 'wheel' || global === 'clock' ? global : 'wheel';
}

/**
 * Reprise des anciens choix, une seule fois, tant que le réglage unique n'existe pas : si l'horloge avait été
 * choisie quelque part (réglages du Journal depuis le 17 nov., ou un endroit de la version du 22 nov. matin),
 * elle devient le choix de toute l'appli. Sinon rien n'est écrit (roulette par défaut).
 */
export function legacyPicker(
  perPlace: Partial<Record<TimePlace, TimePicker>> | undefined,
  journalPicker: TimePicker | undefined,
): TimePicker | undefined {
  if (journalPicker === 'clock') return 'clock';
  return Object.values(perPlace ?? {}).includes('clock') ? 'clock' : undefined;
}

