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
  /** Deux ou trois phrases sous la vidéo (écrites par Claude, à reformuler par Valentin). */
  summary: string;
}

export const TUTORIALS: Record<ModuleId, Tutorial> = {
  journal: {
    url: '',
    summary: "Chaque jour, 30 secondes à 5 minutes : tes notes de 1 à 10 et, si tu veux, un commentaire pour vider ton sac. Les courbes et le Recap t'aident ensuite à voir ce qui se répète.",
  },
  routines: {
    url: '',
    summary: 'Tes routines du matin, de la journée et du soir. Tu coches ce que tu as fait ; le bouton Bilan montre ton mois d’un coup d’œil.',
  },
  objectifs: {
    url: '',
    summary: 'Qui tu veux devenir, thème par thème, de l’année jusqu’à la semaine.',
  },
  taches: {
    url: '',
    summary: 'Tout ce qui te passe par la tête entre ici : tu le notes, puis tu le classes ou tu le mets au calendrier.',
  },
  calendrier: {
    url: '',
    summary: 'Ta journée, ta semaine, ton mois. Un seul bouton pour ajouter, et la charge du jour pour ne pas trop en prendre.',
  },
  respiration: {
    url: '',
    summary: 'Quelques minutes pour faire redescendre la pression : suis le cercle, inspire quand il grandit, expire quand il rétrécit.',
  },
  meditation: {
    url: '',
    summary: 'Des méditations courtes pour se poser. Elles arrivent bientôt.',
  },
  reveil: {
    url: '',
    summary: 'Tes réveils de la journée, pour ne pas oublier les moments importants.',
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
