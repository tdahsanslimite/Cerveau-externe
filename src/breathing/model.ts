// Exercices de respiration : calcul pur (testé). L'écran ne fait que dessiner ce que renvoie phaseAt / scaleAt.

export type PhaseName = 'Inspire' | 'Retiens' | 'Expire' | 'Pause';

export type Phase = { name: PhaseName; seconds: number };

export type Exercise = {
  id: string;
  label: string;
  description: string;
  phases: Phase[];
  defaultMinutes: number;
};

export const EXERCISES: Exercise[] = [
  {
    id: 'coherence',
    label: 'Cohérence cardiaque',
    description: '5 s pour inspirer, 5 s pour expirer : 6 respirations par minute.',
    phases: [{ name: 'Inspire', seconds: 5 }, { name: 'Expire', seconds: 5 }],
    defaultMinutes: 5,
  },
  {
    id: 'quatre-sept-huit',
    label: '4-7-8',
    description: 'Inspire 4 s, retiens 7 s, expire 8 s. Pour se calmer ou s\'endormir.',
    phases: [{ name: 'Inspire', seconds: 4 }, { name: 'Retiens', seconds: 7 }, { name: 'Expire', seconds: 8 }],
    defaultMinutes: 3,
  },
  {
    id: 'carree',
    label: 'Respiration carrée',
    description: '4 s chaque temps : inspire, retiens, expire, pause. Pour reprendre le contrôle.',
    phases: [
      { name: 'Inspire', seconds: 4 }, { name: 'Retiens', seconds: 4 },
      { name: 'Expire', seconds: 4 }, { name: 'Pause', seconds: 4 },
    ],
    defaultMinutes: 3,
  },
];

export const DURATIONS_MIN = [3, 5, 10];

export function cycleSeconds(ex: Exercise): number {
  return ex.phases.reduce((sum, p) => sum + p.seconds, 0);
}

export type PhaseState = {
  index: number;
  phase: Phase;
  /** Secondes écoulées dans la phase. */
  into: number;
  /** Secondes restantes dans la phase (entières, arrondi au-dessus). */
  remaining: number;
  /** Numéro du cycle, à partir de 0. */
  cycle: number;
};

export function phaseAt(ex: Exercise, elapsed: number): PhaseState {
  const total = cycleSeconds(ex);
  const t = Math.max(0, elapsed);
  const cycle = Math.floor(t / total);
  let rest = t - cycle * total;
  for (let i = 0; i < ex.phases.length; i++) {
    const p = ex.phases[i];
    if (rest < p.seconds) return { index: i, phase: p, into: rest, remaining: Math.ceil(p.seconds - rest), cycle };
    rest -= p.seconds;
  }
  const last = ex.phases.length - 1;
  return { index: last, phase: ex.phases[last], into: ex.phases[last].seconds, remaining: 0, cycle };
}

/** Taille du cercle de 0 (poumons vides) à 1 (pleins) : monte pendant « Inspire », tient pendant « Retiens » après une inspiration. */
export function scaleAt(ex: Exercise, elapsed: number): number {
  const s = phaseAt(ex, elapsed);
  const ratio = s.phase.seconds === 0 ? 1 : Math.min(1, s.into / s.phase.seconds);
  const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
  if (s.phase.name === 'Inspire') return ease(ratio);
  if (s.phase.name === 'Expire') return 1 - ease(ratio);
  // « Retiens » : plein si l'on vient d'inspirer, vide si l'on vient d'expirer (respiration carrée).
  const before = ex.phases[(s.index - 1 + ex.phases.length) % ex.phases.length];
  return before.name === 'Expire' || before.name === 'Pause' ? 0 : 1;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
