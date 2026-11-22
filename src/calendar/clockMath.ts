// Calcul pur de l'horloge (testé) : quel chiffre est sous le doigt.
// x, y = position du doigt par rapport au centre du cadran (y vers le bas, comme à l'écran).

const OUTER_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const INNER_HOURS = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

/** Angle en degrés depuis midi, dans le sens des aiguilles d'une montre (0 à 360). */
export function dialAngle(x: number, y: number): number {
  const a = (Math.atan2(x, -y) * 180) / Math.PI;
  return (a + 360) % 360;
}

/**
 * Heures : 12 crans, cercle extérieur (1-12) ou intérieur (13-00) selon la distance au centre.
 * Minutes : 60 crans, une minute par cran.
 * null si le doigt est trop près du centre pour savoir où il pointe.
 */
export function pickFromDial(mode: 'hours' | 'minutes', x: number, y: number, innerLimit: number): number | null {
  const dist = Math.hypot(x, y);
  if (dist < 14) return null;
  const angle = dialAngle(x, y);
  if (mode === 'minutes') return Math.round(angle / 6) % 60;
  const i = Math.round(angle / 30) % 12;
  return dist < innerLimit ? INNER_HOURS[i] : OUTER_HOURS[i];
}
