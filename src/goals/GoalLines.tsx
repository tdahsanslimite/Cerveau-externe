// Rappels des objectifs dans les autres onglets (lecture seule, tout petit).
import React from 'react';
import { View } from 'react-native';
import type { DayKey } from '../calendar/dates';
import { colors } from '../theme';
import { Icon, Txt } from '../ui';
import { useGoals } from './GoalsContext';
import { annualOneThing, periodWhoByTheme, PeriodKind, themeInfo } from './model';

/**
 * « Qui je suis pour cette période » de chaque thème choisi, en tout petit au-dessus de la vue Semaine / Mois / Trimestre
 * du calendrier. Avec plusieurs thèmes, chaque ligne commence par le nom du thème.
 */
export function PeriodLine({ kind, day }: { kind: PeriodKind; day: DayKey }) {
  const { themePeriods, chosen } = useGoals();
  const lines = periodWhoByTheme(themePeriods, chosen, kind, day);
  if (lines.length === 0) return null;
  return (
    <View style={{ paddingHorizontal: 4, marginTop: -6, gap: 2 }}>
      {lines.map((l) => (
        <Txt key={l.theme} size={12} color={colors.muted} numberOfLines={2}>
          {chosen.length > 1 ? `${themeInfo(l.theme).label} · ${l.text}` : l.text}
        </Txt>
      ))}
    </View>
  );
}

/** Texte du One Thing de l'année (onglet Objectifs), ou null s'il n'est pas rempli. */
export function useAnnualOneThingText(day: DayKey): string | null {
  const { years, chosen } = useGoals();
  return annualOneThing(years, day, chosen)?.text?.trim() || null;
}

/** Le One Thing de l'année (thème en tête), au-dessus de la case « The One Thing » de « Trier mes idées ». */
export function AnnualOneThingLine({ day }: { day: DayKey }) {
  const { years, chosen } = useGoals();
  const one = annualOneThing(years, day, chosen);
  if (!one) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 }}>
      <Icon name="target" size={16} color={colors.accentDark} />
      <View style={{ flex: 1 }}>
        <Txt size={12} color={colors.muted}>{`Ton One Thing de l’année · ${themeInfo(one.theme).label}`}</Txt>
        <Txt bold size={14} numberOfLines={3}>{one.text}</Txt>
      </View>
    </View>
  );
}
