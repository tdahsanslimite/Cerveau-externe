// Calculs de taille du tableau de bilan (purs, testés). Objectif : tout le mois visible
// d'un coup d'œil, sans défiler, tant que les lignes restent lisibles.

/** Hauteur d'une ligne de jour : le mois entier tient dans `available`, entre `min` et `max`. */
export function fitRowHeight(available: number, headerH: number, rows: number, min: number, max: number): number {
  if (rows <= 0) return max;
  const raw = Math.floor((available - headerH) / rows);
  return Math.min(max, Math.max(min, raw));
}

/**
 * Largeur d'une colonne de routine.
 * - Si toutes les colonnes tiennent (chacune au moins `min`), on se partage la place.
 * - Sinon le tableau défile, et on règle la largeur pour qu'une demi-colonne dépasse :
 *   c'est le signe visible qu'il y a d'autres routines à droite.
 */
export function fitColWidth(available: number, cols: number, min: number): number {
  if (cols <= 0) return min;
  const even = Math.floor(available / cols);
  if (even >= min) return even;
  const full = Math.max(2, Math.floor(available / min));
  return Math.floor(available / (full - 0.5));
}
