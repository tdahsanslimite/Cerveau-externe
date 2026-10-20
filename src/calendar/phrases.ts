// Phrases affichées sur les alarmes. Une est tirée au hasard à chaque programmation,
// sans jamais répéter deux fois de suite la même quand il y en a plusieurs.
// 3 phrases d'essai : à remplacer par celles de Valentin, dans sa voix.
export const ALARM_PHRASES: string[] = [
  'Si tu ne fais pas ça maintenant, tu ne régleras pas ton problème avant 6 mois.',
  'Tu as décidé que c’était important. Fais-le pendant que tu y penses.',
  'Un petit pas maintenant vaut mieux que mille bonnes intentions demain.',
];

/** Tire une phrase au hasard (`random` renvoie un nombre dans [0, 1[), en évitant `previous` si possible. */
export function pickPhrase(list: string[] = ALARM_PHRASES, random: () => number = Math.random, previous?: string): string {
  if (list.length === 0) return '';
  const pool = list.length > 1 && previous !== undefined ? list.filter((p) => p !== previous) : list;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
}
