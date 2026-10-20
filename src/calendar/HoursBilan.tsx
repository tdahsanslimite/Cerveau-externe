// Bilan du calendrier : combien d'heures dans chaque domaine, par semaine, mois ou année.
// On vient le chercher (bouton dans l'en-tête), il ne s'affiche jamais tout seul.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Chip, IconButton, Sheet, Txt } from '../ui';
import { useCalendar } from './CalendarContext';
import { addDays, addMonths, DayKey, fromKey, isoWeek, labelMonth, labelWeekRange, monthDays, startOfWeek, todayKey } from './dates';
import { BilanPeriod, hoursByDomain } from './model';

const PERIODS: { id: BilanPeriod; label: string }[] = [
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
  { id: 'annee', label: 'Année' },
];

/** Bornes de la période qui contient `day`. */
export function periodRange(period: BilanPeriod, day: DayKey): { from: DayKey; to: DayKey } {
  if (period === 'semaine') {
    const from = startOfWeek(day);
    return { from, to: addDays(from, 6) };
  }
  if (period === 'mois') {
    const days = monthDays(day);
    return { from: days[0], to: days[days.length - 1] };
  }
  const y = day.slice(0, 4);
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function periodLabel(period: BilanPeriod, day: DayKey): string {
  if (period === 'semaine') return `Semaine ${isoWeek(day)} · ${labelWeekRange(day)}`;
  if (period === 'mois') return labelMonth(day);
  return String(fromKey(day).getFullYear());
}

function shift(period: BilanPeriod, day: DayKey, dir: 1 | -1): DayKey {
  if (period === 'semaine') return addDays(day, 7 * dir);
  if (period === 'mois') return addMonths(day, dir);
  return addMonths(day, 12 * dir);
}

/** « 12 h 30 », « 45 min », « 0 h ». */
export function hoursLabel(min: number): string {
  if (min === 0) return '0 h';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

export function HoursBilan({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { events, domains, domain } = useCalendar();
  const today = todayKey();
  const [period, setPeriod] = useState<BilanPeriod>('mois');
  const [day, setDay] = useState<DayKey>(today);

  useEffect(() => {
    if (visible) setDay(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const { from, to } = periodRange(period, day);
  const report = hoursByDomain(events, from, to, today);
  const isFuture = from > today;
  // Ordre : domaines de l'utilisateur d'abord (dans son ordre), puis un éventuel domaine supprimé.
  const ids = [...domains.map((d) => d.id), ...Object.keys(report).filter((id) => !domains.some((d) => d.id === id))];
  const rows = ids
    .map((id) => ({ id, ...(report[id] ?? { done: 0, planned: 0 }) }))
    .filter((r) => r.done + r.planned > 0)
    .sort((a, b) => b.done - a.done || b.planned - a.planned);
  const max = Math.max(1, ...rows.map((r) => r.done + r.planned));
  const totalDone = rows.reduce((s, r) => s + r.done, 0);
  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0);
  const isCurrent = from <= today && today <= to;

  return (
    <Sheet visible={visible} onClose={onClose} title="Bilan des heures">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {PERIODS.map((p) => (
          <Chip key={p.id} label={p.label} selected={period === p.id} onPress={() => setPeriod(p.id)} />
        ))}
      </View>

      <View style={st.nav}>
        <IconButton icon="chevron-left" label="Période précédente" onPress={() => setDay((d) => shift(period, d, -1))} />
        <Pressable accessibilityRole="button" accessibilityLabel="Revenir à la période en cours" onPress={() => setDay(today)} style={{ flex: 1, alignItems: 'center' }}>
          <Txt bold size={16} style={{ textAlign: 'center' }}>{periodLabel(period, day)}</Txt>
          {!isCurrent ? <Txt size={12} color={colors.accent}>Revenir à aujourd'hui</Txt> : null}
        </Pressable>
        <IconButton icon="chevron-right" label="Période suivante" onPress={() => setDay((d) => shift(period, d, 1))} />
      </View>

      <View style={st.total}>
        <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {isFuture ? 'Prévu' : 'Temps passé'}
        </Txt>
        <Txt bold size={30}>{hoursLabel(isFuture ? totalPlanned : totalDone)}</Txt>
        {!isFuture && totalPlanned > 0 ? (
          <Txt size={14} color={colors.muted}>+ {hoursLabel(totalPlanned)} encore prévues</Txt>
        ) : null}
      </View>

      {rows.length === 0 ? (
        <Txt size={14} color={colors.muted} style={{ paddingHorizontal: 4, lineHeight: 20 }}>
          Aucun créneau avec une heure sur cette période. Les événements « toute la journée » ne comptent pas.
        </Txt>
      ) : (
        <View style={st.list}>
          {rows.map((r) => {
            const d = domain(r.id);
            const doneW = `${(r.done / max) * 100}%` as const;
            const planW = `${(r.planned / max) * 100}%` as const;
            return (
              <View key={r.id} style={st.row} accessibilityLabel={`${d.label} : ${hoursLabel(r.done)} passées${r.planned ? `, ${hoursLabel(r.planned)} prévues` : ''}`}>
                <View style={st.rowHead}>
                  <View style={[st.dot, { backgroundColor: d.color }]} />
                  <Txt bold style={{ flex: 1 }}>{d.label}</Txt>
                  <Txt bold size={16}>{hoursLabel(isFuture ? r.planned : r.done)}</Txt>
                </View>
                <View style={st.track}>
                  {!isFuture ? <View style={[st.bar, { width: doneW, backgroundColor: d.color }]} /> : null}
                  {r.planned > 0 ? <View style={[st.bar, st.planned, { width: planW, borderColor: d.color }]} /> : null}
                </View>
                {!isFuture && r.planned > 0 ? (
                  <Txt size={13} color={colors.muted}>+ {hoursLabel(r.planned)} prévues</Txt>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4, lineHeight: 19 }}>
        Une tâche du calendrier compte quand elle est cochée. Pas cochée un jour passé, elle n'est pas comptée.
      </Txt>
    </Sheet>
  );
}

const st = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  total: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 2 },
  list: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 18 },
  row: { gap: 6 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  track: { flexDirection: 'row', height: 10, borderRadius: 5, backgroundColor: colors.lineSoft, overflow: 'hidden' },
  bar: { height: 10 },
  planned: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 5, backgroundColor: 'transparent' },
});
