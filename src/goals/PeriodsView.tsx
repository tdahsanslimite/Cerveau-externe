// Les objectifs d'une période (semaine, mois ou trimestre) : qui je suis, à faire, à éviter, bilan.
// « Qui je suis pour cette période » est rappelé en tout petit au-dessus de la vue correspondante du calendrier.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { addDays, addMonths, DayKey, isoWeek, labelMonth, labelWeekRange, todayKey } from '../calendar/dates';
import { labelQuarter, quarterOf } from '../calendar/longViews';
import { colors, radius } from '../theme';
import { Card, Chip, IconButton, Txt } from '../ui';
import { useGoals } from './GoalsContext';
import { TextBlock } from './fields';
import { PERIOD_FIELDS, PERIODS, periodKey, PeriodKind } from './model';

function titleOf(kind: PeriodKind, day: DayKey): [string, string] {
  if (kind === 'semaine') return [`Semaine ${isoWeek(day)}`, labelWeekRange(day)];
  if (kind === 'mois') return ['Mois', labelMonth(day)];
  return [`Trimestre ${quarterOf(day)}`, labelQuarter(day)];
}

function shiftBy(kind: PeriodKind, day: DayKey, dir: 1 | -1): DayKey {
  if (kind === 'semaine') return addDays(day, 7 * dir);
  if (kind === 'mois') return addMonths(day, dir);
  return addMonths(day, 3 * dir);
}

export function PeriodsView() {
  const { periods, periodText } = useGoals();
  const today = todayKey();
  const [kind, setKind] = useState<PeriodKind>('semaine');
  const [day, setDay] = useState<DayKey>(today);

  const key = periodKey(kind, day);
  const card = periods[key];
  const [kicker, title] = titleOf(kind, day);
  const isCurrent = key === periodKey(kind, today);
  // Jours déjà remplis : un point sur le sélecteur aide à voir où l'on a écrit quelque chose.
  const filled = (k: PeriodKind) => !!periods[periodKey(k, day)] && Object.keys(periods[periodKey(k, day)]).length > 0;

  return (
    <>
      <View style={st.chips}>
        {PERIODS.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            selected={kind === p.id}
            dot={filled(p.id) && kind !== p.id ? colors.accent : undefined}
            onPress={() => setKind(p.id)}
          />
        ))}
      </View>

      <View style={st.navRow}>
        <IconButton icon="chevron-left" label="Période précédente" onPress={() => setDay((d) => shiftBy(kind, d, -1))} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{kicker}</Txt>
          <Txt bold size={20} numberOfLines={1}>{title}</Txt>
        </View>
        <IconButton icon="chevron-right" label="Période suivante" onPress={() => setDay((d) => shiftBy(kind, d, 1))} />
      </View>

      {!isCurrent ? (
        <Pressable accessibilityRole="button" onPress={() => setDay(today)} style={st.todayBtn}>
          <Txt bold size={14} color={colors.accent}>Revenir à cette période</Txt>
        </Pressable>
      ) : null}

      <Card style={{ padding: 16, gap: 16 }}>
        {PERIOD_FIELDS.map((f) => (
          <TextBlock
            key={`${key}-${f.id}`}
            label={f.label}
            value={card?.[f.id] ?? ''}
            onChange={(t) => periodText(key, f.id, t)}
            placeholder={f.placeholder}
            lines={f.lines}
          />
        ))}
      </Card>
      <Txt size={12} color={colors.faint} style={{ paddingHorizontal: 4 }}>
        {'Ce que tu écris dans « Objectifs » s’affiche en petit dans le Calendrier, au-dessus de la vue '}
        {kind === 'semaine' ? 'Semaine' : kind === 'mois' ? 'Mois' : 'Trimestre'}. Enregistré automatiquement.
      </Txt>
    </>
  );
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBtn: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
