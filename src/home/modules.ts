// Registre des modules de l'appli (pur, testé). Un module = une entrée ici + une ligne d'écran dans AppTabs.
// L'accueil montre des CATÉGORIES (CATEGORIES) ; un clic ouvre un sous-menu avec les modules de la catégorie.
// La barre du bas n'en garde que quelques-uns (BAR_IDS).

export type ModuleId = 'calendrier' | 'taches' | 'routines' | 'journal' | 'objectifs' | 'respiration' | 'meditation';

export type ModuleMeta = {
  id: ModuleId;
  /** Nom complet (tuile d'accueil, accessibilité). */
  label: string;
  /** Nom court pour la barre du bas. */
  barLabel: string;
  /** Une ligne sous le nom, sur la tuile. */
  hint: string;
  /** Nom d'icône Feather. */
  icon: string;
};

/** Ordre = ordre des tuiles sur l'accueil. Ajouter un module : une ligne ici. */
export const MODULES: ModuleMeta[] = [
  { id: 'calendrier', label: 'Calendrier', barLabel: 'Calendrier', hint: 'Ta journée, ta semaine', icon: 'calendar' },
  { id: 'taches', label: 'Trier mes idées', barLabel: 'Idées', hint: 'Vider ta tête, choisir', icon: 'check-square' },
  { id: 'routines', label: 'Routines', barLabel: 'Routines', hint: 'Matin, journée, soir', icon: 'repeat' },
  { id: 'journal', label: 'Journal', barLabel: 'Journal', hint: 'Comprendre tes journées', icon: 'book-open' },
  { id: 'objectifs', label: 'Objectifs', barLabel: 'Objectifs', hint: 'Qui tu veux devenir', icon: 'target' },
  { id: 'respiration', label: 'Respiration', barLabel: 'Respiration', hint: 'Cohérence cardiaque, apaisement', icon: 'wind' },
  { id: 'meditation', label: 'Méditation', barLabel: 'Méditation', hint: 'Se poser quelques minutes', icon: 'moon' },
];

/** Les usages de tous les jours, gardés dans la barre du bas (dans cet ordre). */
export const BAR_IDS: ModuleId[] = ['calendrier', 'routines', 'taches'];

export function moduleById(id: ModuleId): ModuleMeta {
  const m = MODULES.find((x) => x.id === id);
  if (!m) throw new Error(`Module inconnu : ${id}`);
  return m;
}

export function barModules(): ModuleMeta[] {
  return BAR_IDS.map(moduleById);
}

/** Largeur d'une tuile en grille à 2 colonnes : la dernière, seule sur sa ligne, prend toute la largeur. */
export function tileSpan(index: number, count: number): 1 | 2 {
  return count % 2 === 1 && index === count - 1 ? 2 : 1;
}

// ── Catégories de l'accueil ──────────────────────────────────────────────────────────────────────────
export type CategoryId = 'tdah' | 'organiser' | 'detendre';

export type CategoryMeta = {
  id: CategoryId;
  label: string;
  hint: string;
  /** Nom d'icône Feather. */
  icon: string;
  /** Modules du sous-menu, dans l'ordre d'affichage. */
  items: ModuleId[];
};

/** Ordre = ordre des tuiles sur l'accueil. Chaque module appartient à UNE catégorie (vérifié par les tests). */
export const CATEGORIES: CategoryMeta[] = [
  { id: 'tdah', label: 'Mieux vivre avec mon TDAH', hint: 'Objectifs, routines, journal', icon: 'compass', items: ['objectifs', 'routines', 'journal'] },
  { id: 'organiser', label: 'Organiser et planifier', hint: 'Idées, calendrier', icon: 'layout', items: ['taches', 'calendrier'] },
  { id: 'detendre', label: 'Se détendre', hint: 'Respiration, méditation', icon: 'feather', items: ['respiration', 'meditation'] },
];

export function categoryById(id: CategoryId): CategoryMeta {
  const c = CATEGORIES.find((x) => x.id === id);
  if (!c) throw new Error(`Catégorie inconnue : ${id}`);
  return c;
}

export function categoryOf(id: ModuleId): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.items.includes(id));
}

export function categoryModules(id: CategoryId): ModuleMeta[] {
  return categoryById(id).items.map(moduleById);
}

/** Pastille d'un module : nombre à classer et / ou point « à remplir ». */
export type TileInfo = { badge?: number; dot?: boolean };

/** Ce que la tuile d'une catégorie doit montrer : la somme des nombres et un point si l'un de ses modules en a un. */
export function categoryInfo(id: CategoryId, info: Partial<Record<ModuleId, TileInfo>>): TileInfo {
  let badge = 0;
  let dot = false;
  for (const m of categoryById(id).items) {
    badge += info[m]?.badge ?? 0;
    dot = dot || !!info[m]?.dot;
  }
  return { badge: badge > 0 ? badge : undefined, dot: dot || undefined };
}
