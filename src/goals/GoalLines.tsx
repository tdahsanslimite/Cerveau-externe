// Rappels des objectifs dans les autres onglets (lecture seule, tout petit).
import React from 'react';
import { View } from 'react-native';
import type { DayKey } from '../calendar/dates';
import { colors } from '../theme';
import { Icon, Txt } from '../ui';
import { useGoals } from './GoalsContext';
import { annualOneThing, periodWho, PeriodKind, themeInfo } from './model';

/** « Qui je suis pour cette période », en tout petit au-dessus de la vue Semaine / Mois / Trimestre du calendrier. */
export function PeriodLine({ kind, day }: { kind: PeriodKind; day: DayKey }) {
  const { periods } = useGoals();
  const who = periodWho(periods, kind, day);
  if (!who) return null;
  return (
    <Txt size={12} color={colors.muted} numberOfLines={2} style={{ paddingHorizontal: 4, marginTop: -6 }}>{who}</Txt>
  );
}

/** Le One Thing de l'année (thème en tête), au-dessus de la case « The One Thing » de « Trier mes idées ». */
export function AnnualOneThingLine({ day }: { day: DayKey }) {
  const { years } = useGoals();
  const one = annualOneThing(years, day);
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
