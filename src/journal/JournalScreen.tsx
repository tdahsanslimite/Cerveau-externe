// Écran du Journal : le jour choisi (3 notes de 1 à 10, chacune avec son commentaire), puis de quoi comprendre et relativiser :
// moyennes et les 14 derniers jours en courbes. Revoir les jours passés se fait dans le « Recap » (bouton flottant).
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Card, Icon, IconButton, SectionLabel, Txt } from '../ui';
import { addDays, DayKey, isoWeek, labelDayLong, relativeLabel, todayKey } from '../calendar/dates';
import { DayEditor, tone } from './DayEditor';
import { useJournal } from './JournalContext';
import { describeDay, LineChart } from './LineChart';
import {
  average, FIELD_LABEL, FIELDS, formatScore, recentDays, ScoreField, SCORE_LEVELS, SCORE_MAX, SCORE_MIN, shortSummary, totalScore,
  TOTAL_LEVELS, TOTAL_MAX, TOTAL_MIN,
} from './model';
import { RecapScreen } from './RecapScreen';

const CHART_DAYS = 14;

/** Une couleur par courbe (la légende les nomme). */
const FIELD_COLOR: Record<ScoreField, string> = { mood: colors.accent, mind: '#5B6FA8', body: colors.amber };

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={st.stat}>
      <Txt size={12} color={colors.muted} numberOfLines={2}>{label}</Txt>
      <Txt bold size={26} color={value === null ? colors.faint : tone(Math.round(value))}>
        {value === null ? '–' : formatScore(value)}
      </Txt>
    </View>
  );
}

export function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { entries } = useJournal();
  const [day, setDay] = useState<DayKey>(todayKey());
  const [recapOpen, setRecapOpen] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const today = todayKey();
  const week = recentDays(today, 7);
  const chart = recentDays(today, CHART_DAYS);
  const chartHasData = chart.some((d) => entries[d]);
  const totals = chart.map((d) => totalScore(entries[d]));
  const totalDays = totals.filter((t) => t !== null).length;
  const describe = (d: DayKey) => describeDay(d, entries[d] ? shortSummary(entries[d]) : '');
  const anyData = Object.keys(entries).some((d) => d <= today);

  const openDay = (d: DayKey) => {
    setDay(d);
    scroller.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {relativeLabel(day, today) ?? `Semaine ${isoWeek(day)}`}
          </Txt>
          <Txt bold size={24} numberOfLines={1}>{labelDayLong(day)}</Txt>
        </View>
        {day !== today ? (
          <Pressable accessibilityRole="button" onPress={() => setDay(today)} style={st.todayBtn}>
            <Txt bold size={14} color={colors.accent}>Aujourd'hui</Txt>
          </Pressable>
        ) : null}
        <IconButton icon="chevron-left" label="Jour précédent" onPress={() => setDay((d) => addDays(d, -1))} />
        {day < today ? <IconButton icon="chevron-right" label="Jour suivant" onPress={() => setDay((d) => addDays(d, 1))} /> : <View style={{ width: 44 }} />}
      </View>

      <ScrollView ref={scroller} contentContainerStyle={[st.content, { paddingBottom: 110 }]} keyboardShouldPersistTaps="handled">
        <DayEditor day={day} />

        {anyData ? (
          <View style={{ gap: 8 }}>
            <SectionLabel>7 derniers jours</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FIELDS.map((f) => <Stat key={f} label={FIELD_LABEL[f]} value={average(entries, week, f)} />)}
            </View>
          </View>
        ) : null}

        {chartHasData ? (
          <View style={{ gap: 8 }}>
            <SectionLabel>{`Les ${CHART_DAYS} derniers jours`}</SectionLabel>
            <Card style={{ padding: 12, gap: 10 }}>
              <LineChart
                days={chart}
                series={FIELDS.map((f) => ({ key: f, color: FIELD_COLOR[f], values: chart.map((d) => entries[d]?.[f] ?? null) }))}
                min={SCORE_MIN}
                max={SCORE_MAX}
                levels={SCORE_LEVELS}
                selected={day}
                onPickDay={openDay}
                describe={describe}
              />
              <View style={st.legend}>
                {FIELDS.map((f) => (
                  <View key={f} style={st.legendItem}>
                    <View style={[st.legendDot, { backgroundColor: FIELD_COLOR[f] }]} />
                    <Txt size={12} color={colors.muted}>{FIELD_LABEL[f]}</Txt>
                  </View>
                ))}
              </View>
              <Txt size={12} color={colors.faint}>Lignes fines : 2,5 · 5 · 7,5. Un jour sans note coupe la courbe.</Txt>
            </Card>

            <SectionLabel>{`Total des 3 notes (de ${TOTAL_MIN} à ${TOTAL_MAX})`}</SectionLabel>
            <Card style={{ padding: 12, gap: 10 }}>
              {totalDays === 0 ? (
                <Txt size={14} color={colors.muted}>Pose les 3 notes d'une même journée pour voir son total.</Txt>
              ) : (
                <>
                  <LineChart
                    days={chart}
                    series={[{ key: 'total', color: colors.ink, values: totals }]}
                    min={TOTAL_MIN}
                    max={TOTAL_MAX}
                    levels={TOTAL_LEVELS}
                    selected={day}
                    onPickDay={openDay}
                    describe={(d) => {
                      const t = totalScore(entries[d]);
                      return describeDay(d, t === null ? '' : `total ${t} sur ${TOTAL_MAX}`);
                    }}
                  />
                  <Txt size={12} color={colors.faint}>Lignes fines : 5 · 10 · 15 · 20 · 25. Seuls les jours avec les 3 notes comptent.</Txt>
                </>
              )}
            </Card>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le recap de l'année"
        onPress={() => setRecapOpen(true)}
        style={({ pressed }) => [st.fab, pressed && { opacity: 0.85 }]}
      >
        <Icon name="calendar" size={22} color="#FFFFFF" />
        <Txt bold size={15} color="#FFFFFF">Recap</Txt>
      </Pressable>

      <RecapScreen visible={recapOpen} onClose={() => setRecapOpen(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  fab: {
    position: 'absolute', right: 18, bottom: 24, height: 56, paddingHorizontal: 20, borderRadius: 28, backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: colors.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  todayBtn: { minHeight: 44, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.accentSoft, justifyContent: 'center' },
  content: { paddingHorizontal: 16, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 2 },
  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
