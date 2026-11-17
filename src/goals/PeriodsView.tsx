// Les objectifs d'une période (semaine, mois ou trimestre), POUR UN THÈME : qui je suis, à faire, à éviter, bilan.
// Chaque thème choisi a ses propres fiches (17 nov., Valentin : les fiches Business ne doivent pas remplir celles de Santé).
// « Qui je suis pour cette période » est rappelé en tout petit au-dessus de la vue correspondante du calendrier.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { addDays, addMonths, DayKey, isoWeek, labelMonth, labelWeekRange, todayKey } from '../calendar/dates';
import { labelQuarter, quarterOf } from '../calendar/longViews';
import { colors, radius } from '../theme';
import { Card, Chip, Icon, IconButton, Txt } from '../ui';
import { useGoals } from './GoalsContext';
import { TextBlock } from './fields';
import { PERIOD_FIELDS, PERIODS, periodKey, PeriodKind, themeInfo, ThemeId } from './model';

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

/** Ce qui est affiché : géré par l'écran Objectifs (la fenêtre de la semaine peut y renvoyer). */
export interface PeriodFocus { theme: ThemeId; kind: PeriodKind; day: DayKey }

export function PeriodsView({ focus, onFocus }: { focus: PeriodFocus; onFocus: (f: PeriodFocus) => void }) {
  const { themePeriods, chosen, periodText } = useGoals();
  const today = todayKey();
  // Un thème retiré entre-temps : on revient au premier thème choisi.
  const theme = chosen.includes(focus.theme) ? focus.theme : chosen[0];
  const { kind, day } = focus;
  const set = (p: Partial<PeriodFocus>) => onFocus({ theme, kind, day, ...p });

  const periods = themePeriods[theme] ?? {};
  const key = periodKey(kind, day);
  const card = periods[key];
  const [kicker, title] = titleOf(kind, day);
  const isCurrent = key === periodKey(kind, today);
  const filled = (k: PeriodKind) => Object.keys(periods[periodKey(k, day)] ?? {}).length > 0;
  const info = themeInfo(theme);

  return (
    <>
      {chosen.length > 1 ? (
        <View style={{ gap: 6 }}>
          <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4 }}>Thème</Txt>
          <View style={st.chips}>
            {chosen.map((t) => (
              <Chip key={t} label={themeInfo(t).label} selected={t === theme} onPress={() => set({ theme: t })} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={st.chips}>
        {PERIODS.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            selected={kind === p.id}
            dot={filled(p.id) && kind !== p.id ? colors.accent : undefined}
            onPress={() => set({ kind: p.id })}
          />
        ))}
      </View>

      <View style={st.navRow}>
        <IconButton icon="chevron-left" label="Période précédente" onPress={() => set({ day: shiftBy(kind, day, -1) })} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{kicker}</Txt>
          <Txt bold size={20} numberOfLines={1}>{title}</Txt>
        </View>
        <IconButton icon="chevron-right" label="Période suivante" onPress={() => set({ day: shiftBy(kind, day, 1) })} />
      </View>

      {!isCurrent ? (
        <Pressable accessibilityRole="button" onPress={() => set({ day: today })} style={st.todayBtn}>
          <Txt bold size={14} color={colors.accent}>Revenir à cette période</Txt>
        </Pressable>
      ) : null}

      <Card style={{ padding: 16, gap: 16 }}>
        <View style={st.themeHead}>
          <View style={st.iconWrap}><Icon name={info.icon} size={18} color={colors.accentDark} /></View>
          <View style={{ flex: 1 }}>
            <Txt bold size={17}>{info.label}</Txt>
            <Txt size={13} color={colors.muted}>{info.tagline}</Txt>
          </View>
        </View>
        {PERIOD_FIELDS.map((f) => (
          <TextBlock
            key={`${theme}-${key}-${f.id}`}
            label={f.label}
            value={card?.[f.id] ?? ''}
            onChange={(t) => periodText(theme, key, f.id, t)}
            placeholder={f.placeholder}
            lines={f.lines}
          />
        ))}
      </Card>
      <Txt size={12} color={colors.faint} style={{ paddingHorizontal: 4 }}>
        {'« Qui je suis pour cette période » s’affiche en petit dans le Calendrier, au-dessus de la vue '}
        {kind === 'semaine' ? 'Semaine' : kind === 'mois' ? 'Mois' : 'Trimestre'}. Enregistré automatiquement.
      </Txt>
    </>
  );
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBtn: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  themeHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
