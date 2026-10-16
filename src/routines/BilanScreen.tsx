// Le bilan des routines : UN seul tableau pour tout le mois (routines en colonnes, jours en lignes).
// Il n'apparaît jamais tout seul : on vient le chercher avec le bouton « Bilan ».
// Plein écran, pour que les 28 à 31 jours tiennent d'un coup d'œil.
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, DAY_SHORT, DayKey, fromKey, labelMonth, monthDays, todayKey, weekdayIndex } from '../calendar/dates';
import { colors } from '../theme';
import { Card, Icon, IconButton, Txt } from '../ui';
import { useRoutines } from './RoutinesContext';
import { CellState, monthReport, RoutineMonth } from './model';
import { fitColWidth, fitRowHeight } from './tableLayout';

const DAY_COL = 46; // colonne des jours, toujours visible à gauche
const HEADER_H = 60; // en-tête : nom de la routine + « fait / prévu »
const MIN_COL = 50; // plus étroit, ce n'est plus lisible : le tableau défile alors horizontalement
const MIN_ROW = 18; // en dessous, le tableau défile verticalement
const MAX_ROW = 40;

export function BilanScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { routines, done } = useRoutines();
  const today = todayKey();
  const [month, setMonth] = useState<DayKey>(today);
  const [area, setArea] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (visible) setMonth(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const isCurrent = month.slice(0, 7) === today.slice(0, 7);
  const days = monthDays(month);
  const report = monthReport(routines, done, month, today);
  // Les écrans reçoivent un bas de zone de sécurité à 0 (la barre d'onglets le gère) : on le retrouve ici.
  const bottom = Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0, 12);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea((a) => (a.w === width && a.h === height ? a : { w: width, h: height }));
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[st.root, { paddingTop: insets.top, paddingBottom: bottom }]}>
        <View style={st.head}>
          <IconButton icon="chevron-left" label="Mois précédent" onPress={() => setMonth((m) => addMonths(m, -1))} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Txt size={12} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Mon bilan</Txt>
            <Txt bold size={20} numberOfLines={1}>{labelMonth(month)}</Txt>
          </View>
          <View style={{ opacity: isCurrent ? 0.3 : 1 }}>
            <IconButton icon="chevron-right" label="Mois suivant" onPress={() => !isCurrent && setMonth((m) => addMonths(m, 1))} />
          </View>
          <IconButton icon="x" label="Fermer" onPress={onClose} bordered={false} />
        </View>

        <View style={st.body}>
          <View style={{ flex: 1 }} onLayout={onLayout}>
            {report.length === 0 ? (
              <Card style={{ padding: 18 }}>
                <Txt size={14} color={colors.muted}>Aucune routine ce mois-là.</Txt>
              </Card>
            ) : area.h > 0 ? (
              <Table days={days} report={report} today={today} width={area.w} height={area.h} />
            ) : null}
          </View>
        </View>

        <Legend />
      </View>
    </Modal>
  );
}

function Table({ days, report, today, width, height }: {
  days: DayKey[]; report: RoutineMonth[]; today: DayKey; width: number; height: number;
}) {
  const rowH = fitRowHeight(height - 2, HEADER_H, days.length, MIN_ROW, MAX_ROW);
  const colW = fitColWidth(width - 2 - DAY_COL, report.length, MIN_COL);
  const mark = Math.min(16, rowH - 6);

  const rowStyle = (d: DayKey) => {
    if (d === today) return st.rowToday;
    return weekdayIndex(d) >= 5 ? st.rowWeekend : null;
  };

  return (
    <Card style={{ maxHeight: height }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row' }}>
          {/* Colonne des jours */}
          <View style={{ width: DAY_COL }}>
            <View style={{ height: HEADER_H, borderBottomWidth: 1, borderBottomColor: colors.line }} />
            {days.map((d) => {
              const wd = weekdayIndex(d);
              return (
                <View key={d} style={[st.dayCell, { height: rowH }, rowStyle(d)]}>
                  <Txt size={11} color={colors.muted} style={{ width: 12, textAlign: 'center' }}>{DAY_SHORT[wd].charAt(0)}</Txt>
                  <Txt bold={d === today} size={12} style={{ width: 20, textAlign: 'right' }}>{fromKey(d).getDate()}</Txt>
                </View>
              );
            })}
          </View>

          {/* Une colonne par routine : défile à l'horizontale seulement s'il y en a beaucoup */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View>
              <View style={{ flexDirection: 'row' }}>
                {report.map((m) => (
                  <View
                    key={m.routine.id}
                    accessibilityLabel={`${m.routine.title} : ${m.planned > 0 ? `${m.done} sur ${m.planned}` : 'rien à compter pour l’instant'}`}
                    style={[st.headCell, { width: colW, height: HEADER_H }]}
                  >
                    <Txt bold size={10} numberOfLines={3} style={{ textAlign: 'center', lineHeight: 12 }}>{m.routine.title}</Txt>
                    <Txt bold size={11} color={colors.accent}>{m.planned > 0 ? `${m.done}/${m.planned}` : '–'}</Txt>
                  </View>
                ))}
              </View>
              {days.map((d, i) => (
                <View key={d} style={[{ flexDirection: 'row', height: rowH }, st.bodyRow, rowStyle(d)]}>
                  {report.map((m) => (
                    <View key={m.routine.id} style={{ width: colW, alignItems: 'center', justifyContent: 'center' }}>
                      <Mark state={m.cells[i].state} isToday={d === today} size={mark} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </Card>
  );
}

function Mark({ state, isToday, size }: { state: CellState; isToday: boolean; size: number }) {
  const box = { width: size, height: size };
  if (state === 'done') {
    return (
      <View style={[st.mark, st.markDone, box]}>
        <Icon name="check" size={Math.max(8, size - 5)} color="#FFFFFF" />
      </View>
    );
  }
  if (state === 'missed') return <View style={[st.mark, st.markMissed, box]} />;
  // À venir : on n'affiche rien, sauf aujourd'hui (la case à remplir).
  if (state === 'upcoming') return isToday ? <View style={[st.mark, st.markToday, box]} /> : null;
  return <View style={st.off} />;
}

function Legend() {
  return (
    <View style={st.legend}>
      <View style={st.legendItem}>
        <View style={[st.mark, st.markDone, { width: 14, height: 14 }]}><Icon name="check" size={9} color="#FFFFFF" /></View>
        <Txt size={13} color={colors.muted}>Fait</Txt>
      </View>
      <View style={st.legendItem}>
        <View style={[st.mark, st.markMissed, { width: 14, height: 14 }]} />
        <Txt size={13} color={colors.muted}>Pas coché</Txt>
      </View>
      <View style={st.legendItem}>
        <View style={st.off} />
        <Txt size={13} color={colors.muted}>Pas prévu</Txt>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  body: { flex: 1, paddingHorizontal: 8, paddingBottom: 8 },
  dayCell: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line,
  },
  headCell: {
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  bodyRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowToday: { backgroundColor: colors.accentSoft },
  rowWeekend: { backgroundColor: '#F7F5F0' },
  mark: { borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  markDone: { backgroundColor: colors.accent },
  markMissed: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  markToday: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.card },
  off: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingHorizontal: 16, paddingTop: 4, minHeight: 28, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
