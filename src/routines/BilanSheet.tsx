// Le bilan des routines. Il n'apparaît jamais tout seul : on vient le chercher
// (bouton « Voir mon bilan »), pour que les séries ne deviennent pas une source de stress.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Card, IconButton, Sheet, Txt } from '../ui';
import { addMonths, labelMonth, todayKey } from '../calendar/dates';
import { useRoutines } from './RoutinesContext';
import { CellState, daysLabel, monthReport, RoutineMonth } from './model';

export function BilanSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { routines, done } = useRoutines();
  const today = todayKey();
  const [month, setMonth] = useState(today);

  useEffect(() => {
    if (visible) setMonth(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const isCurrent = month.slice(0, 7) === today.slice(0, 7);
  const report = monthReport(routines, done, month, today);
  const totalDone = report.reduce((n, m) => n + m.done, 0);
  const totalPlanned = report.reduce((n, m) => n + m.planned, 0);

  return (
    <Sheet visible={visible} onClose={onClose} title="Mon bilan">
      <Txt size={14} color={colors.muted} style={{ lineHeight: 20 }}>
        Ce bilan est là pour comprendre ce qui t'aide, pas pour te juger.
      </Txt>

      <View style={st.monthNav}>
        <IconButton icon="chevron-left" label="Mois précédent" onPress={() => setMonth((m) => addMonths(m, -1))} />
        <Txt bold size={18} style={{ flex: 1, textAlign: 'center' }}>{labelMonth(month)}</Txt>
        <View style={{ opacity: isCurrent ? 0.3 : 1 }}>
          <IconButton icon="chevron-right" label="Mois suivant" onPress={() => !isCurrent && setMonth((m) => addMonths(m, 1))} />
        </View>
      </View>

      {report.length === 0 ? (
        <Card style={{ padding: 18 }}>
          <Txt size={14} color={colors.muted}>Aucune routine ce mois-là.</Txt>
        </Card>
      ) : (
        <>
          <Card style={{ padding: 16, gap: 4 }}>
            <Txt bold size={20}>{totalDone} case{totalDone > 1 ? 's' : ''} cochée{totalDone > 1 ? 's' : ''}</Txt>
            <Txt size={14} color={colors.muted}>
              {totalPlanned > 0 ? `sur ${totalPlanned} prévue${totalPlanned > 1 ? 's' : ''} jusqu'ici` : 'Le mois commence : rien à compter pour l’instant.'}
            </Txt>
          </Card>

          <Legend />

          {report.map((m) => <RoutineMonthCard key={m.routine.id} m={m} />)}
        </>
      )}
    </Sheet>
  );
}

function RoutineMonthCard({ m }: { m: RoutineMonth }) {
  const summary = m.planned > 0 ? `${m.done} sur ${m.planned}` : 'à venir';
  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <Txt bold size={16} style={{ flex: 1 }}>{m.routine.title}</Txt>
        <Txt bold size={14} color={colors.accent}>{summary}</Txt>
      </View>
      <View style={st.grid} accessibilityLabel={`${m.routine.title} : ${summary} ce mois-ci`}>
        {m.cells.map((c) => <Cell key={c.day} state={c.state} />)}
      </View>
      <Txt size={13} color={colors.muted}>
        {daysLabel(m.routine.days)}
        {m.bestRun >= 2 ? ` · meilleure série : ${m.bestRun} jours d’affilée` : ''}
      </Txt>
    </Card>
  );
}

function Cell({ state }: { state: CellState }) {
  return (
    <View style={st.cellWrap}>
      {state === 'off' ? (
        <View style={st.off} />
      ) : (
        <View style={[st.cell, state === 'done' ? st.done : state === 'missed' ? st.missed : st.upcoming]} />
      )}
    </View>
  );
}

function Legend() {
  return (
    <View style={st.legend}>
      <View style={st.legendItem}><View style={[st.cell, st.done]} /><Txt size={13} color={colors.muted}>Fait</Txt></View>
      <View style={st.legendItem}><View style={[st.cell, st.missed]} /><Txt size={13} color={colors.muted}>Pas coché</Txt></View>
      <View style={st.legendItem}><View style={[st.cell, st.upcoming]} /><Txt size={13} color={colors.muted}>À venir</Txt></View>
      <View style={st.legendItem}><View style={st.off} /><Txt size={13} color={colors.muted}>Pas prévu</Txt></View>
    </View>
  );
}

const st = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cellWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  cell: { width: 18, height: 18, borderRadius: 5 },
  done: { backgroundColor: colors.accent },
  missed: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  upcoming: { borderWidth: 1.5, borderColor: colors.lineSoft, backgroundColor: colors.card },
  off: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: colors.line },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 4, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
