// Registre des modules de l'appli (pur, testé). Un module = une entrée ici + une ligne d'écran dans AppTabs.
// L'accueil montre des CATÉGORIES (CATEGORIES) ; un clic ouvre un sous-menu avec les modules de la catégorie.
// Dans un module, la barre du bas montre « Accueil » + les modules de SA catégorie (barModulesFor).

export type ModuleId = 'calendrier' | 'taches' | 'routines' | 'journal' | 'objectifs' | 'respiration' | 'meditation' | 'reveil';

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
  { id: 'taches', label: 'Trier mes idées', barLabel: 'Trier', hint: 'Vider ta tête, choisir', icon: 'check-square' },
  { id: 'routines', label: 'Routines', barLabel: 'Routines', hint: 'Matin, journée, soir', icon: 'repeat' },
  { id: 'journal', label: 'Journal', barLabel: 'Journal', hint: 'Comprendre tes journées', icon: 'book-open' },
  { id: 'objectifs', label: 'Objectifs', barLabel: 'Objectifs', hint: 'Qui tu veux devenir', icon: 'target' },
  { id: 'respiration', label: 'Respiration', barLabel: 'Respiration', hint: 'Cohérence cardiaque, apaisement', icon: 'wind' },
  { id: 'meditation', label: 'Méditation', barLabel: 'Méditation', hint: 'Se poser quelques minutes', icon: 'moon' },
  { id: 'reveil', label: 'Réveil', barLabel: 'Réveil', hint: 'Tes réveils de la journée', icon: 'bell' },
];

export function moduleById(id: ModuleId): ModuleMeta {
  const m = MODULES.find((x) => x.id === id);
  if (!m) throw new Error(`Module inconnu : ${id}`);
  return m;
}

/** Largeur d'une tuile en grille à 2 colonnes : la dernière, seule sur sa ligne, prend toute la largeur. */
export function tileSpan(index: number, count: number): 1 | 2 {
  return count % 2 === 1 && index === count - 1 ? 2 : 1;
}

// ── Catégories de l'accueil ──────────────────────────────────────────────────────────────────────────
export type CategoryId = 'tdah' | 'organiser' | 'detendre' | 'reveil';

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
  { id: 'tdah', label: 'Mon TDAH au quotidien', hint: 'Journal, routines, objectifs', icon: 'compass', items: ['journal', 'routines', 'objectifs'] },
  { id: 'organiser', label: 'Organiser et planifier', hint: 'Idées, calendrier', icon: 'layout', items: ['taches', 'calendrier'] },
  { id: 'detendre', label: 'Se détendre', hint: 'Respiration, méditation', icon: 'feather', items: ['respiration', 'meditation'] },
  // 12 nov. : le réveil est un domaine à part pour l'instant (décision de Valentin). Catégorie d'un seul module :
  // la tuile ouvre directement le module (directModule).
  { id: 'reveil', label: 'Réveil', hint: 'Tes réveils de la journée', icon: 'bell', items: ['reveil'] },
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

/** Pastille d'un module : nombre à classer et / ou point « à remplir » ; `hint` remplace le sous-titre (ex. prochain réveil). */
export type TileInfo = { badge?: number; dot?: boolean; hint?: string };

/** Catégorie d'un seul module : la tuile de l'accueil ouvre directement ce module, sans sous-menu. */
export function directModule(id: CategoryId): ModuleId | null {
  const c = categoryById(id);
  return c.items.length === 1 ? c.items[0] : null;
}

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

/** Onglets de la barre du bas dans un module : les modules de sa catégorie, dans l'ordre du sous-menu. */
export function barModulesFor(id: ModuleId): ModuleMeta[] {
  const c = categoryOf(id);
  return c ? categoryModules(c.id) : [moduleById(id)];
}
