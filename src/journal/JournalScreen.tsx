// Écran du Journal : le jour choisi (2 notes de 1 à 10 + une note libre), puis de quoi comprendre et relativiser :
// moyennes, les 14 derniers jours d'un coup d'œil, et les jours à relire (difficiles / bons moments).
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';
import { Card, Chip, IconButton, SectionLabel, Txt } from '../ui';
import { addDays, DAY_SHORT, DayKey, fromKey, isoWeek, labelDayLong, labelDayShort, relativeLabel, todayKey, weekdayIndex } from '../calendar/dates';
import { useJournal } from './JournalContext';
import {
  average, baseline, FIELD_LABEL, formatScore, historyDays, HistoryKind, isScore, JournalEntry, recentDays, relativeTo, ScoreField,
  SCORE_MAX,
} from './model';

const CHART_DAYS = 14;
const BAR_MAX = 64;

/** Couleur d'une note : basse = orange, milieu = ambre, haute = vert-bleu (le chiffre reste toujours écrit). */
function tone(n: number): string {
  if (n <= 4) return colors.warn;
  if (n <= 7) return colors.amber;
  return colors.accent;
}

const SCORE_ROWS = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];

function ScoreRow({ field, title, hint, low, high, value, base, onPick }: {
  field: ScoreField; title: string; hint: string; low: string; high: string; value: number | undefined; base: number | null; onPick: (n: number) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Txt bold size={17}>{title}</Txt>
        <Txt size={13} color={colors.muted}>{hint}</Txt>
      </View>
      <View style={{ gap: 8 }}>
        {SCORE_ROWS.map((row, i) => (
          <View key={i} style={st.scoreLine}>
            {row.map((n) => {
              const on = value === n;
              return (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`${FIELD_LABEL[field]} ${n} sur ${SCORE_MAX}`}
                  accessibilityState={{ selected: on }}
                  onPress={() => onPick(n)}
                  style={({ pressed }) => [
                    st.scoreBtn,
                    on && { backgroundColor: tone(n), borderColor: tone(n) },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Txt bold size={18} color={on ? '#FFFFFF' : colors.ink}>{n}</Txt>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View style={st.scoreEnds}>
        <Txt size={12} color={colors.muted}>{`1 = ${low}`}</Txt>
        <Txt size={12} color={colors.muted}>{`10 = ${high}`}</Txt>
      </View>
      <Relative value={value} base={base} />
    </View>
  );
}

/** Une phrase qui remet la note du jour en perspective par rapport aux jours d'avant. */
function Relative({ value, base }: { value: number | undefined; base: number | null }) {
  if (!isScore(value)) return null;
  if (base === null) {
    return <Txt size={13} color={colors.faint}>Dès 3 jours notés, je compare à ta moyenne.</Txt>;
  }
  const rel = relativeTo(value, base);
  const avg = formatScore(base);
  const text =
    rel === 'above' ? `Mieux que d'habitude (moyenne ${avg} sur 30 jours). Note ce qui t'a aidé.`
    : rel === 'below' ? `Plus dur que d'habitude (moyenne ${avg} sur 30 jours). Un jour ne fait pas la tendance : note ce qui a pesé.`
    : `Dans ta moyenne (${avg} sur 30 jours).`;
  return <Txt size={13} color={colors.muted} style={{ lineHeight: 19 }}>{text}</Txt>;
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={st.stat}>
      <Txt size={12} color={colors.muted}>{label}</Txt>
      <Txt bold size={26} color={value === null ? colors.faint : tone(Math.round(value))}>
        {value === null ? '–' : formatScore(value)}
      </Txt>
    </View>
  );
}

function Bar({ value, color }: { value: number | undefined; color: string }) {
  return <View style={[st.bar, { height: isScore(value) ? Math.max(4, (value / SCORE_MAX) * BAR_MAX) : 3, backgroundColor: isScore(value) ? color : colors.line }]} />;
}

function summary(e: JournalEntry): string {
  const parts: string[] = [];
  if (isScore(e.mood)) parts.push(`Psy ${e.mood}`);
  if (isScore(e.body)) parts.push(`Physique ${e.body}`);
  return parts.join(' · ');
}

export function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { entries, score, note } = useJournal();
  const [day, setDay] = useState<DayKey>(todayKey());
  const [kind, setKind] = useState<HistoryKind>('all');
  const scroller = useRef<ScrollView>(null);

  const today = todayKey();
  const entry = entries[day] ?? {};
  const week = recentDays(today, 7);
  const chart = recentDays(today, CHART_DAYS);
  const chartHasData = chart.some((d) => entries[d]);
  const history = historyDays(entries, kind, today);
  const anyHistory = historyDays(entries, 'all', today, 1).length > 0;

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

      <ScrollView ref={scroller} contentContainerStyle={[st.content, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        <Card style={{ padding: 16, gap: 22 }}>
          <ScoreRow
            field="mood"
            title="Mon état psychologique"
            hint="Est-ce que j'ai passé une bonne journée ?"
            low="mauvaise journée"
            high="très bonne journée"
            value={entry.mood}
            base={baseline(entries, day, 'mood')}
            onPick={(n) => score(day, 'mood', n)}
          />
          <View style={st.sep} />
          <ScoreRow
            field="body"
            title="Mon état physique"
            hint="Est-ce que je me sens en forme ?"
            low="pas en forme"
            high="en pleine forme"
            value={entry.body}
            base={baseline(entries, day, 'body')}
            onPick={(n) => score(day, 'body', n)}
          />
        </Card>

        <View style={{ gap: 8 }}>
          <SectionLabel>Ma note du jour</SectionLabel>
          <TextInput
            accessibilityLabel="Note libre du jour"
            value={entry.note ?? ''}
            onChangeText={(t) => note(day, t)}
            multiline
            placeholder={"Ce que je pense, ce que je ressens.\nCe que j'ai fait… ou pas fait."}
            placeholderTextColor={colors.faint}
            textAlignVertical="top"
            style={st.noteInput}
          />
          <Txt size={12} color={colors.faint}>Enregistré automatiquement, uniquement sur ce téléphone.</Txt>
        </View>

        {anyHistory ? (
          <View style={{ gap: 8 }}>
            <SectionLabel>7 derniers jours</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Stat label="Psychologique" value={average(entries, week, 'mood')} />
              <Stat label="Physique" value={average(entries, week, 'body')} />
            </View>
          </View>
        ) : null}

        {chartHasData ? (
          <View style={{ gap: 8 }}>
            <SectionLabel>{`Les ${CHART_DAYS} derniers jours`}</SectionLabel>
            <Card style={{ padding: 12, gap: 10 }}>
              <View style={st.chartRow}>
                {chart.map((d) => {
                  const e = entries[d];
                  const selected = d === day;
                  return (
                    <Pressable
                      key={d}
                      accessibilityRole="button"
                      accessibilityLabel={`${labelDayLong(d)}${e && summary(e) ? ` : ${summary(e)}` : ''}`}
                      onPress={() => openDay(d)}
                      style={[st.chartCol, selected && { backgroundColor: colors.accentSoft }]}
                    >
                      <View style={st.bars}>
                        <Bar value={e?.mood} color={colors.accent} />
                        <Bar value={e?.body} color={colors.amber} />
                      </View>
                      <Txt size={11} color={selected ? colors.accent : colors.muted} bold={selected}>
                        {DAY_SHORT[weekdayIndex(d)].charAt(0)}
                      </Txt>
                      <Txt size={11} color={selected ? colors.accent : colors.muted} bold={selected}>{fromKey(d).getDate()}</Txt>
                    </Pressable>
                  );
                })}
              </View>
              <View style={st.legend}>
                <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: colors.accent }]} /><Txt size={12} color={colors.muted}>Psychologique (à gauche)</Txt></View>
                <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: colors.amber }]} /><Txt size={12} color={colors.muted}>Physique (à droite)</Txt></View>
              </View>
            </Card>
          </View>
        ) : null}

        {anyHistory ? (
          <View style={{ gap: 8 }}>
            <SectionLabel>Relire mes jours</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Chip label="Tous" selected={kind === 'all'} onPress={() => setKind('all')} />
              <Chip label="Difficiles" selected={kind === 'hard'} onPress={() => setKind('hard')} color={colors.warn} />
              <Chip label="Bons moments" selected={kind === 'good'} onPress={() => setKind('good')} />
            </View>
            {history.length === 0 ? (
              <Txt size={14} color={colors.muted}>
                {kind === 'hard' ? 'Aucun jour difficile noté (note de 4 ou moins) pour l\'instant.' : 'Aucun bon moment noté (note de 8 ou plus) pour l\'instant.'}
              </Txt>
            ) : (
              <Card>
                {history.map((d) => {
                  const e = entries[d];
                  return (
                    <Pressable
                      key={d}
                      accessibilityRole="button"
                      accessibilityLabel={`Ouvrir ${labelDayLong(d)}`}
                      onPress={() => openDay(d)}
                      style={({ pressed }) => [st.histRow, pressed && { backgroundColor: colors.lineSoft }]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                        <Txt bold size={15}>{labelDayShort(d)}</Txt>
                        <Txt size={13} color={colors.muted}>{summary(e)}</Txt>
                      </View>
                      {e.note ? <Txt size={14} color={colors.muted} numberOfLines={2}>{e.note}</Txt> : null}
                    </Pressable>
                  );
                })}
              </Card>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  todayBtn: { minHeight: 44, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.accentSoft, justifyContent: 'center' },
  content: { paddingHorizontal: 16, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  scoreLine: { flexDirection: 'row', gap: 8 },
  scoreBtn: {
    flex: 1, minHeight: 52, borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  sep: { height: 1, backgroundColor: colors.lineSoft },
  noteInput: {
    minHeight: 150, borderRadius: radius.l, borderWidth: 1, borderColor: colors.paperLine, backgroundColor: colors.paper,
    padding: 14, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.ink,
  },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 2 },
  chartRow: { flexDirection: 'row', gap: 2 },
  chartCol: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4, borderRadius: radius.s },
  bars: { height: BAR_MAX, flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  bar: { width: 6, borderRadius: 3 },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  histRow: { gap: 4, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
});
