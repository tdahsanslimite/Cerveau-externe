// Tutoriels vidéo des modules (22 nov., demande de Valentin) — registre + logique pure, testés dans registry.test.ts.
//
// AJOUTER UNE VIDÉO : coller son lien dans `url` du module ci-dessous (lien YouTube : youtu.be/…, youtube.com/watch?v=…,
// youtube.com/shorts/… ; vidéo « non répertoriée » conseillée). C'est tout : à la mise à jour suivante, la vidéo s'ouvre
// toute seule à la première visite du module, et le bouton (?) en haut à droite permet de la revoir.
// Un autre lien que YouTube marche aussi, mais il s'ouvre hors de l'appli (bouton « Ouvrir la vidéo »).
import type { ModuleId } from '../home/modules.ts';

export interface Tutorial {
  /** Lien de la vidéo ; vide = pas encore tournée (le bouton (?) montre alors seulement le texte). */
  url: string;
  /** Texte facultatif sous la vidéo (vide = rien d'affiché ; textes de Claude retirés le 23 nov. à la demande de Valentin). */
  summary: string;
}

export const TUTORIALS: Record<ModuleId, Tutorial> = {
  journal: {
    url: '',
    summary: '',
  },
  routines: {
    url: '',
    summary: '',
  },
  objectifs: {
    url: '',
    summary: '',
  },
  taches: {
    url: 'https://youtu.be/WkIte4bAl7c',
    summary: '',
  },
  calendrier: {
    url: '',
    summary: '',
  },
  respiration: {
    url: '',
    summary: '',
  },
  meditation: {
    url: '',
    summary: '',
  },
  reveil: {
    url: '',
    summary: '',
  },
};

/** Identifiant YouTube d'un lien (youtu.be, watch?v=, shorts, embed), sinon null. */
export function youtubeId(url: string): string | null {
  const m = url.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function hasVideo(t: Tutorial): boolean {
  return t.url.trim() !== '';
}

/**
 * La vidéo s'ouvre toute seule à la première visite du module seulement s'il y a une vidéo, que l'utilisateur ne l'a
 * pas encore vue s'ouvrir, et qu'il n'a pas masqué les tutoriels. Sans vidéo, rien ne s'ouvre (et le module n'est pas
 * marqué « vu » : quand la vidéo arrivera, elle s'ouvrira à la visite suivante).
 */
export function shouldAutoOpen(t: Tutorial, id: string, seen: string[] | undefined, hidden: boolean | undefined): boolean {
  return hasVideo(t) && !hidden && !(seen ?? []).includes(id);
}
