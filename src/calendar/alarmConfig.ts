// Réglages de l'alarme qui ne dépendent pas du téléphone (testables sans lui).

/**
 * Vibration de l'alarme, en millisecondes : « vibre, pause, vibre, pause ».
 * La bibliothèque d'alarme exige un nombre PAIR de valeurs toutes POSITIVES : un motif qui commence
 * par 0 (habituel avec expo-notifications) est refusé, et l'alarme n'est alors jamais programmée.
 */
export const ALARM_VIBRATION = [600, 300, 600, 300];

export function isValidVibrationPattern(pattern: number[]): boolean {
  return pattern.length > 0 && pattern.length % 2 === 0 && pattern.every((v) => Number.isFinite(v) && v > 0);
}
