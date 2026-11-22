// Écran du Journal : le jour choisi (les notes suivies, de 1 à 10, chacune avec son commentaire), puis de quoi comprendre
// et relativiser : moyennes et les 14 derniers jours en courbes (+ les nuits si le sommeil est suivi).
// Revoir les jours passés se fait dans le « Recap » (bouton flottant). Réglages : bouton en haut à gauche.
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
  asksSleepTimes, average, FIELD_LABEL, formatClock, formatDuration, formatScore, recentDays, ScoreField, SCORE_LEVELS, SCORE_MAX,
  SCORE_MIN, shortSummary, sleepStats, stackedTotals, totalRange, totalScore,
} from './model';
import { JournalSettingsSheet } from './JournalSettings';
import { RecapScreen } from './RecapScreen';
import { TutorialButton } from '../tutorials/Tutorials';
import { SLEEP_COLOR, SleepChart } from './SleepChart';

const CHART_DAYS = 14;
/** Les nuits se lisent sur 30 jours (19 nov., Valentin : « c'est plus juste »). */
const SLEEP_DAYS = 30;

/** Une couleur par courbe (la légende les nomme). */
const FIELD_COLOR: Record<ScoreField, string> = { mood: colors.accent, mind: '#5B6FA8', body: colors.amber, sleep: SLEEP_COLOR };

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

function SleepStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt size={12} color={colors.muted} numberOfLines={1}>{label}</Txt>
      <Txt bold size={18} color={SLEEP_COLOR}>{value}</Txt>
    </View>
  );
}

/** `shown` : le Journal est l'écran affiché (il reste monté en mémoire quand on va ailleurs). */
export function JournalScreen({ shown = true }: { shown?: boolean }) {
  const insets = useSafeAreaInsets();
  const { entries, prefs, prefsChosen, loaded } = useJournal();
  const [day, setDay] = useState<DayKey>(todayKey());
  const [recapOpen, setRecapOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scroller = useRef<ScrollView>(null);

  // Première ouverture du Journal depuis la mise à jour : on demande d'abord ce que la personne veut suivre.
  // Pas dès le lancement de l'appli : elle s'empilerait sur le pop-up « Ta journée ».
  const firstTime = loaded && !prefsChosen && shown;
  const fields = prefs.fields;
  const today = todayKey();
  const week = recentDays(today, 7);
  const chart = recentDays(today, CHART_DAYS);
  const chartHasData = chart.some((d) => entries[d]);
  const range = totalRange(fields.length);
  const totals = chart.map((d) => totalScore(entries[d], fields));
  const totalDays = totals.filter((t) => t !== null).length;
  const stacked = stackedTotals(entries, chart, fields);
  const sleepTimes = asksSleepTimes(prefs);
  const sleepDays = recentDays(today, SLEEP_DAYS);
  const nights = sleepStats(entries, sleepDays);
  const describe = (d: DayKey) => describeDay(d, entries[d] ? shortSummary(entries[d], fields) : '');
  const anyData = Object.keys(entries).some((d) => d <= today);

  const openDay = (d: DayKey) => {
    setDay(d);
    scroller.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <IconButton icon="settings" label="Réglages Journal" onPress={() => setSettingsOpen(true)} />
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
        <TutorialButton id="journal" />
      </View>

      <ScrollView ref={scroller} contentContainerStyle={[st.content, { paddingBottom: 110 }]} keyboardShouldPersistTaps="handled">
        <DayEditor day={day} />

        {anyData ? (
          <View style={{ gap: 8 }}>
            <SectionLabel>7 derniers jours</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {fields.map((f) => <Stat key={f} label={FIELD_LABEL[f]} value={average(entries, week, f)} />)}
            </View>
          </View>
        ) : null}

        {chartHasData ? (
          <View style={{ gap: 8 }}>
            <SectionLabel>{`Les ${CHART_DAYS} derniers jours`}</SectionLabel>
            <Card style={{ padding: 12, gap: 10 }}>
              <LineChart
                days={chart}
                series={fields.map((f) => ({ key: f, color: FIELD_COLOR[f], values: chart.map((d) => entries[d]?.[f] ?? null) }))}
                min={SCORE_MIN}
                max={SCORE_MAX}
                levels={SCORE_LEVELS}
                selected={day}
                onPickDay={openDay}
                describe={describe}
              />
              <View style={st.legend}>
                {fields.map((f) => (
                  <View key={f} style={st.legendItem}>
                    <View style={[st.legendDot, { backgroundColor: FIELD_COLOR[f] }]} />
                    <Txt size={12} color={colors.muted}>{FIELD_LABEL[f]}</Txt>
                  </View>
                ))}
              </View>
              <Txt size={12} color={colors.faint}>Lignes fines : 2,5 · 5 · 7,5. Un jour sans note coupe la courbe.</Txt>
            </Card>

            {fields.length >= 2 ? (
              <>
                <SectionLabel>Total des notes</SectionLabel>
                <Card style={{ padding: 12, gap: 10 }}>
                  {totalDays === 0 ? (
                    <Txt size={14} color={colors.muted}>Pose une note pour voir le total de ta journée.</Txt>
                  ) : (
                    <>
                      <LineChart
                        days={chart}
                        series={stacked.map((values, k) => ({
                          key: fields[k],
                          // La dernière ligne (le haut de la pile) = le total, en noir.
                          color: k === fields.length - 1 ? colors.ink : FIELD_COLOR[fields[k]],
                          values,
                        }))}
                        min={range.min}
                        max={range.max}
                        levels={range.levels}
                        selected={day}
                        onPickDay={openDay}
                        describe={(d) => {
                          const t = totalScore(entries[d], fields);
                          return describeDay(d, t === null ? '' : `total des notes : ${t}`);
                        }}
                      />
                      <View style={st.legend}>
                        {fields.map((f, k) => (
                          <View key={f} style={st.legendItem}>
                            <View style={[st.legendDot, { backgroundColor: k === fields.length - 1 ? colors.ink : FIELD_COLOR[f] }]} />
                            <Txt size={12} color={colors.muted}>{`${k === 0 ? '' : '+ '}${FIELD_LABEL[f]}${k === fields.length - 1 ? ' = total' : ''}`}</Txt>
                          </View>
                        ))}
                      </View>
                      <Txt size={12} color={colors.faint}>
                        {`Les notes s'empilent : chaque ligne ajoute la sienne, la ligne noire du haut est le total. Lignes fines : ${range.levels.map(formatScore).join(' · ')}.`}
                      </Txt>
                    </>
                  )}
                </Card>
              </>
            ) : null}
          </View>
        ) : null}

        {sleepTimes ? (
          <View style={{ gap: 8 }}>
            <SectionLabel>{`Mes nuits (${SLEEP_DAYS} derniers jours)`}</SectionLabel>
            <Card style={{ padding: 12, gap: 10 }}>
              {nights.bed === null && nights.wake === null ? (
                <Txt size={14} color={colors.muted}>Note ton heure de coucher et de lever (dans « Bien dormi ») pour voir tes nuits ici.</Txt>
              ) : (
                <>
                  <View style={st.sleepStats}>
                    <SleepStat label="Coucher moyen" value={nights.bed === null ? '–' : formatClock(nights.bed)} />
                    <SleepStat label="Lever moyen" value={nights.wake === null ? '–' : formatClock(nights.wake)} />
                    <SleepStat label="Nuit moyenne" value={nights.duration === null ? '–' : formatDuration(nights.duration)} />
                  </View>
                  <SleepChart days={sleepDays} entries={entries} selected={day} onPickDay={openDay} />
                  <Txt size={12} color={colors.faint}>
                    Une barre = une nuit, du coucher (en haut) au lever (en bas). Traits dorés : tes horaires moyens sur 30 jours. Des barres alignées = un rythme régulier.
                  </Txt>
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
      <JournalSettingsSheet visible={settingsOpen || firstTime} firstTime={firstTime} onClose={() => setSettingsOpen(false)} />
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
  sleepStats: { flexDirection: 'row', gap: 8 },
  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
