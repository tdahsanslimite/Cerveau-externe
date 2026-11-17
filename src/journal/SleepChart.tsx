// Horaires de sommeil : une barre par nuit, du coucher (en haut) au lever (en bas), sur une échelle d'heures.
// D'un coup d'œil : des barres alignées = des horaires réguliers ; une barre plus courte = une nuit courte.
// Deux traits fins dorés marquent le coucher et le lever moyens. Dessiné avec de simples View, comme LineChart.
import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Txt } from '../ui';
import { DAY_SHORT, DayKey, fromKey, weekdayIndex } from '../calendar/dates';
import { EntryMap, formatClock, formatDuration, isClockTime, nightMinute, sleepDuration, sleepStats } from './model';
import { describeDay } from './LineChart';

export const SLEEP_COLOR = '#6E5AA8';

const PLOT_H = 190;
const PAD_Y = 6;
const AXIS_W = 42;
const BAR_MAX = 14;
const DOT = 8;

/** Durée en très court sous chaque barre (la colonne fait ~20 px) : heures à la demi-heure près, « 7 », « 7,5 ». */
const compact = (min: number) => String(Math.round(min / 30) / 2).replace('.', ',');

/** Échelle : au moins de 23 h à 7 h, élargie à l'heure pleine pour contenir toutes les nuits. */
export function sleepScale(entries: EntryMap, days: DayKey[]): { lo: number; hi: number } {
  const values = days.flatMap((d) => [entries[d]?.bedTime, entries[d]?.wakeTime]).filter(isClockTime).map(nightMinute);
  const lo = Math.floor(Math.min(23 * 60, ...values) / 60) * 60;
  const hi = Math.ceil(Math.max((24 + 7) * 60, ...values) / 60) * 60;
  return { lo, hi };
}

export function SleepChart({ days, entries, selected, onPickDay }: {
  days: DayKey[]; entries: EntryMap; selected: DayKey; onPickDay: (d: DayKey) => void;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const { lo, hi } = sleepScale(entries, days);
  const stats = sleepStats(entries, days);

  const colW = width / days.length;
  const barW = Math.min(BAR_MAX, colW * 0.55);
  const y = (m: number) => PAD_Y + ((m - lo) / (hi - lo)) * (PLOT_H - 2 * PAD_Y);
  const stepH = hi - lo > 10 * 60 ? 120 : 60; // une étiquette toutes les 2 h si la plage est large
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += stepH) ticks.push(t);

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: AXIS_W, height: PLOT_H }}>
          {ticks.map((t) => (
            <Txt key={t} size={11} color={colors.muted} style={[st.axisLabel, { top: y(t) - 8 }]}>{formatClock(t)}</Txt>
          ))}
        </View>
        <View style={{ flex: 1, height: PLOT_H }} onLayout={onLayout}>
          {width > 0 ? (
            <>
              {days.map((d, i) => d === selected ? (
                <View key={`sel-${d}`} style={[st.selected, { left: colW * i, width: colW }]} />
              ) : null)}
              {ticks.map((t) => <View key={t} style={[st.level, { top: y(t) }]} />)}
              {stats.bed !== null ? <View style={[st.avg, { top: y(stats.bed) }]} /> : null}
              {stats.wake !== null ? <View style={[st.avg, { top: y(stats.wake) }]} /> : null}

              {days.map((d, i) => {
                const e = entries[d];
                const cx = colW * (i + 0.5);
                const bed = isClockTime(e?.bedTime) ? nightMinute(e!.bedTime!) : null;
                const wake = isClockTime(e?.wakeTime) ? nightMinute(e!.wakeTime!) : null;
                if (bed !== null && wake !== null && wake > bed) {
                  return (
                    <View
                      key={`bar-${d}`}
                      style={[st.bar, { left: cx - barW / 2, width: barW, top: y(bed), height: Math.max(3, y(wake) - y(bed)) }]}
                    />
                  );
                }
                // Une seule heure notée : un point, pour ne pas inventer la nuit.
                return [bed, wake].map((m, k) => m === null ? null : (
                  <View key={`dot-${d}-${k}`} style={[st.dot, { left: cx - DOT / 2, top: y(m) - DOT / 2 }]} />
                ));
              })}

              {days.map((d, i) => {
                const e = entries[d];
                const dur = sleepDuration(e);
                const label = dur === null
                  ? 'pas d’heures complètes'
                  : `couché à ${formatClock(e!.bedTime!)}, levé à ${formatClock(e!.wakeTime!)}, nuit de ${formatDuration(dur)}`;
                return (
                  <Pressable
                    key={`hit-${d}`}
                    accessibilityRole="button"
                    accessibilityLabel={describeDay(d, label)}
                    onPress={() => onPickDay(d)}
                    style={{ position: 'absolute', left: colW * i, width: colW, top: 0, height: PLOT_H }}
                  />
                );
              })}
            </>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', paddingLeft: AXIS_W }}>
        {days.map((d) => {
          const on = d === selected;
          const dur = sleepDuration(entries[d]);
          return (
            <View key={d} style={{ flex: 1, alignItems: 'center', paddingTop: 4 }}>
              <Txt size={10} bold color={dur === null ? colors.faint : SLEEP_COLOR} numberOfLines={1}>{dur === null ? '·' : compact(dur)}</Txt>
              <Txt size={11} bold={on} color={on ? colors.accent : colors.muted}>{DAY_SHORT[weekdayIndex(d)].charAt(0)}</Txt>
              <Txt size={11} bold={on} color={on ? colors.accent : colors.muted}>{fromKey(d).getDate()}</Txt>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  axisLabel: { position: 'absolute', right: 6, textAlign: 'right' },
  level: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.line },
  avg: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: colors.sand },
  selected: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.accentSoft, borderRadius: radius.s },
  bar: { position: 'absolute', borderRadius: 7, backgroundColor: SLEEP_COLOR },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: SLEEP_COLOR },
});
