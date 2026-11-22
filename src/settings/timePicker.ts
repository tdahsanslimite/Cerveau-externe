// Roue ou horloge pour choisir une heure, réglable séparément à chaque endroit de l'appli où l'on règle une heure
// (22 nov., demande de Valentin : « à chaque endroit où on peut programmer de l'heure, on puisse choisir
// dans les paramètres : roulette ou horloge »). Pur, testé.

export type TimePicker = 'wheel' | 'clock';

/** Les endroits de l'appli où l'on choisit une heure. Ajouter un endroit : une ligne ici + `<TimeSelector place=…>`. */
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
 * Le sélecteur à utiliser à un endroit. Sans choix enregistré : `fallback` (pour le Journal, l'ancien réglage
 * « Pour choisir une heure » du 17 nov., gardé dans ses préférences), sinon la roulette (le comportement d'avant).
 */
export function pickerFor(
  map: Partial<Record<TimePlace, TimePicker>> | undefined,
  place: TimePlace,
  fallback: TimePicker = 'wheel',
): TimePicker {
  const v = map?.[place];
  return v === 'wheel' || v === 'clock' ? v : fallback;
}

/** Nouvelle carte des choix, avec un endroit changé (les autres gardent le leur). */
export function setPicker(
  map: Partial<Record<TimePlace, TimePicker>> | undefined,
  place: TimePlace,
  picker: TimePicker,
): Partial<Record<TimePlace, TimePicker>> {
  return { ...(map ?? {}), [place]: picker };
}

/** Minutes de l'horloge : de 5 en 5 sur le cadran ; avec un pas de 1 (réveil), ±1 ajuste à la minute près. */
export function nudgeMinutes(value: number, delta: number): number {
  const h = Math.floor(value / 60);
  const m = ((value % 60) + delta + 60) % 60;
  return h * 60 + m;
}
