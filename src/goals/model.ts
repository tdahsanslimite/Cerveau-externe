// Modèle de l'onglet Objectifs + logique pure (aucune dépendance à React) : testé dans model.test.ts.
//
// Trois étages :
//   1. Le blason (qui je suis) : 7 encarts, remplis une fois, modifiables.
//   2. Les objectifs de l'année : 5 thèmes, une fiche chacun ; UN thème peut être « en tête » et son One Thing
//      oriente l'action du jour (il est rappelé au-dessus de la case « The One Thing » de « Trier mes idées »).
//   3. Les objectifs d'une période (semaine, mois, trimestre) : « qui je suis pour cette période » apparaît en tout
//      petit au-dessus de la vue correspondante du calendrier.
// Tout est facultatif et enregistré tel quel ; un champ vidé est retiré (pas de fiches fantômes).
import { addDays, fromKey, weekdayIndex } from '../calendar/dates.ts';
import type { DayKey } from '../calendar/dates.ts';
import { average, recentDays } from '../journal/model.ts';
import type { EntryMap, ScoreField } from '../journal/model.ts';

// ---------------- Le blason ----------------

export type BlasonId = 'devise' | 'reves' | 'obstacles' | 'valeurs' | 'entre' | 'talents' | 'ressources';

/** Ordre de la page 1 du carnet : devise, rêves, puis obstacles / valeurs, « entre moi et… » / talents, ressources. */
export const BLASON: { id: BlasonId; label: string; hint: string; placeholder: string }[] = [
  { id: 'devise', label: 'Ma devise', hint: 'La phrase qui résume ta façon de vivre.', placeholder: 'Ma phrase…' },
  { id: 'reves', label: 'Mes rêves les plus fous !', hint: 'Sans te censurer. Une ligne par rêve.', placeholder: 'Un rêve par ligne' },
  { id: 'obstacles', label: 'Mes obstacles', hint: 'Ce qui te freine, en toi. Une ligne par obstacle.', placeholder: 'Un obstacle par ligne' },
  { id: 'valeurs', label: 'Mes valeurs', hint: 'Ce qui compte vraiment pour toi.', placeholder: 'Une valeur par ligne' },
  { id: 'entre', label: 'Les obstacles se dressent entre moi et…', hint: 'Ce que tes obstacles t’empêchent d’atteindre.', placeholder: 'Une chose par ligne' },
  { id: 'talents', label: 'Mes talents', hint: 'Ce que tu fais naturellement bien.', placeholder: 'Un talent par ligne' },
  { id: 'ressources', label: 'Mes ressources', hint: 'Ce sur quoi tu peux t’appuyer (tes valeurs, tes talents, tes proches…).', placeholder: 'Une ressource par ligne' },
];

export type BlasonMap = Partial<Record<BlasonId, string>>;

export const blasonLabel = (id: BlasonId) => BLASON.find((b) => b.id === id)?.label ?? id;

/** Un encart est « rempli » dès qu'il contient autre chose que des espaces. */
export function isFilled(text: string | undefined): boolean {
  return !!text && text.trim().length > 0;
}

export function blasonCount(b: BlasonMap): number {
  return BLASON.filter((e) => isFilled(b[e.id])).length;
}

export function setBlason(b: BlasonMap, id: BlasonId, text: string): BlasonMap {
  const { [id]: _old, ...others } = b;
  return isFilled(text) ? { ...others, [id]: text } : others;
}

/** Les lignes non vides d'un encart (pour l'aperçu). */
export function linesOf(text: string | undefined): string[] {
  return (text ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
}

// ---------------- Les thèmes de l'année ----------------

export type ThemeId = 'mindset' | 'sante' | 'relation' | 'business' | 'loisirs';

export const THEMES: {
  id: ThemeId; label: string; tagline: string; icon: 'smile' | 'heart' | 'users' | 'briefcase' | 'sun';
  /** Note du Journal qui sert d'indicateur (Mindset = « Bien dans ma tête », Santé = « Bien dans mon corps »). */
  journal?: ScoreField;
}[] = [
  { id: 'mindset', label: 'Mindset', tagline: 'Bien dans ta tête', icon: 'smile', journal: 'mind' },
  { id: 'sante', label: 'Santé', tagline: 'Bien dans ton corps', icon: 'heart', journal: 'body' },
  { id: 'relation', label: 'Relation', tagline: 'Bien avec les autres', icon: 'users' },
  { id: 'business', label: 'Business', tagline: 'Bien au travail', icon: 'briefcase' },
  { id: 'loisirs', label: 'Loisirs / passions', tagline: 'Bien à côté', icon: 'sun' },
];

export const themeInfo = (id: ThemeId) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Les 6 champs d'une fiche de thème, dans l'ordre d'écriture. */
export type ThemeField = 'goal' | 'oneThing' | 'identity' | 'todo' | 'avoid' | 'review';

export const THEME_FIELDS: { id: ThemeField; label: string; hint: string; placeholder: string; lines: number }[] = [
  { id: 'goal', label: 'Objectif annuel', hint: 'La vision, la direction : où veux-tu en être dans un an ?', placeholder: 'D’ici un an, je…', lines: 3 },
  { id: 'oneThing', label: 'The One Thing', hint: 'La chose la plus importante à faire et à maintenir toute l’année pour t’en rapprocher.', placeholder: 'La chose qui compte le plus…', lines: 3 },
  { id: 'identity', label: 'Identité', hint: 'Qui je suis, et ce que je fais chaque jour pour m’en rapprocher.', placeholder: 'Je suis quelqu’un qui…', lines: 3 },
  { id: 'todo', label: 'Ce que je dois faire', hint: 'Comportements, actions, indicateurs, stratégie : note libre.', placeholder: 'Mes comportements, mes actions…', lines: 5 },
  { id: 'avoid', label: 'Ce que je dois éviter', hint: 'Souvent plus important que ce qu’il faut faire.', placeholder: 'Ce que je ne fais pas, ce que je m’interdis…', lines: 5 },
  { id: 'review', label: 'Bilan de la période', hint: 'Reviens sur ce que tu as vécu.', placeholder: 'Ce que j’ai vécu, appris, ajusté…', lines: 5 },
];

export type ThemeCard = Partial<Record<ThemeField, string>>;

export interface YearGoals {
  /** Le thème « en tête » : son One Thing oriente l'action du jour. Un seul à la fois. */
  leading?: ThemeId;
  themes: Partial<Record<ThemeId, ThemeCard>>;
}

export const yearKey = (day: DayKey): string => day.slice(0, 4);

export function setThemeField(years: Record<string, YearGoals>, year: string, theme: ThemeId, field: ThemeField, text: string): Record<string, YearGoals> {
  const current = years[year] ?? { themes: {} };
  const card: ThemeCard = { ...(current.themes[theme] ?? {}) };
  if (isFilled(text)) card[field] = text;
  else delete card[field];
  const themes = { ...current.themes };
  if (Object.keys(card).length === 0) delete themes[theme];
  else themes[theme] = card;
  return withYear(years, year, { ...current, themes });
}

/** Met un thème en tête ; le retoucher le retire. Un seul thème en tête à la fois. */
export function toggleLeading(years: Record<string, YearGoals>, year: string, theme: ThemeId): Record<string, YearGoals> {
  const current = years[year] ?? { themes: {} };
  const next: YearGoals = { ...current };
  if (current.leading === theme) delete next.leading;
  else next.leading = theme;
  return withYear(years, year, next);
}

function withYear(years: Record<string, YearGoals>, year: string, goals: YearGoals): Record<string, YearGoals> {
  const { [year]: _old, ...others } = years;
  return goals.leading || Object.keys(goals.themes).length > 0 ? { ...others, [year]: goals } : others;
}

/** Combien de champs d'un thème sont remplis (sur 6). */
export function themeProgress(card: ThemeCard | undefined): number {
  return THEME_FIELDS.filter((f) => isFilled(card?.[f.id])).length;
}

export interface AnnualOneThing { theme: ThemeId; text: string }

/**
 * Le One Thing annuel à rappeler au quotidien : celui du thème en tête, s'il est écrit.
 * Rien si aucun thème n'est en tête ou si son One Thing est vide.
 */
export function annualOneThing(years: Record<string, YearGoals>, day: DayKey): AnnualOneThing | null {
  const goals = years[yearKey(day)];
  if (!goals?.leading) return null;
  const text = goals.themes[goals.leading]?.oneThing;
  return isFilled(text) ? { theme: goals.leading, text: text!.trim() } : null;
}

export interface ThemeIndicator { label: string; avg7: number | null; avg30: number | null }

/**
 * Indicateur des thèmes Mindset et Santé : les moyennes des notes du Journal (7 et 30 derniers jours, jusqu'à `today`).
 * Aucune saisie en plus. Les autres thèmes n'ont pas d'indicateur automatique (null).
 */
export function themeIndicator(entries: EntryMap, theme: ThemeId, today: DayKey): ThemeIndicator | null {
  const field = themeInfo(theme).journal;
  if (!field) return null;
  return {
    label: field === 'mind' ? 'Bien dans ma tête' : 'Bien dans mon corps',
    avg7: average(entries, recentDays(today, 7), field),
    avg30: average(entries, recentDays(today, 30), field),
  };
}

// ---------------- Les périodes ----------------

export type PeriodKind = 'semaine' | 'mois' | 'trimestre';

export const PERIODS: { id: PeriodKind; label: string }[] = [
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
  { id: 'trimestre', label: 'Trimestre' },
];

/** La page 4 du carnet : qui je suis pour cette période, à faire, à éviter, bilan. */
export type PeriodField = 'who' | 'todo' | 'avoid' | 'review';

export const PERIOD_FIELDS: { id: PeriodField; label: string; placeholder: string; lines: number }[] = [
  { id: 'who', label: 'Objectifs · qui je suis pour cette période', placeholder: 'Pour cette période, je suis quelqu’un qui…', lines: 3 },
  { id: 'todo', label: 'Ce que je dois faire', placeholder: 'Mes actions, mes comportements…', lines: 4 },
  { id: 'avoid', label: 'Ce que je dois éviter', placeholder: 'Ce que je m’interdis…', lines: 4 },
  { id: 'review', label: 'Bilan de la période', placeholder: 'Ce que j’ai vécu, appris…', lines: 4 },
];

export type PeriodCard = Partial<Record<PeriodField, string>>;
export type PeriodMap = Record<string, PeriodCard>;

/** Année ISO d'un jour (le 1er janvier peut appartenir à la semaine 52/53 de l'année d'avant). */
export function isoYear(day: DayKey): number {
  return fromKey(addDays(day, 3 - weekdayIndex(day))).getFullYear();
}

function isoWeekNumber(day: DayKey): number {
  const thursday = fromKey(addDays(day, 3 - weekdayIndex(day)));
  const jan1 = new Date(thursday.getFullYear(), 0, 1, 12);
  return 1 + Math.floor(Math.round((thursday.getTime() - jan1.getTime()) / 86400000) / 7);
}

/** Clé stable d'une période : S2026-W43, M2026-10, T2026-Q4. */
export function periodKey(kind: PeriodKind, day: DayKey): string {
  if (kind === 'semaine') return `S${isoYear(day)}-W${String(isoWeekNumber(day)).padStart(2, '0')}`;
  if (kind === 'mois') return `M${day.slice(0, 7)}`;
  return `T${day.slice(0, 4)}-Q${Math.floor((fromKey(day).getMonth()) / 3) + 1}`;
}

export function setPeriodField(periods: PeriodMap, key: string, field: PeriodField, text: string): PeriodMap {
  const card: PeriodCard = { ...(periods[key] ?? {}) };
  if (isFilled(text)) card[field] = text;
  else delete card[field];
  const { [key]: _old, ...others } = periods;
  return Object.keys(card).length === 0 ? others : { ...others, [key]: card };
}

/** « Qui je suis pour cette période » de la période qui contient `day`, ou null. Affiché en petit dans le calendrier. */
export function periodWho(periods: PeriodMap, kind: PeriodKind, day: DayKey): string | null {
  const text = periods[periodKey(kind, day)]?.who;
  return isFilled(text) ? text!.trim() : null;
}
