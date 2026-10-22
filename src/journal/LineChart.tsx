// Graphique en courbes du Journal, tracé avec de simples traits (pas de bibliothèque de dessin).
// Une ligne très fine par repère (ex. 2,5 / 5 / 7,5) pour voir d'un coup d'œil les jours au-dessus ou en dessous.
// Un jour sans valeur coupe la courbe : on ne relie jamais deux points à travers un jour vide.
import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Txt } from '../ui';
import { DAY_SHORT, DayKey, fromKey, labelDayLong, weekdayIndex } from '../calendar/dates';
import { formatScore } from './model';

export interface Series {
  key: string;
  color: string;
  /** Une valeur par jour (dans l'ordre de `days`), null = pas de valeur ce jour-là. */
  values: (number | null)[];
}

const PLOT_H = 132;
const PAD_Y = 9; // marge haut/bas : les points extrêmes ne sont pas coupés
const AXIS_W = 30;
const LINE_W = 2.5;
const DOT = 8;

export function LineChart({ days, series, min, max, levels, selected, onPickDay, describe }: {
  days: DayKey[]; series: Series[]; min: number; max: number; levels: number[];
  selected: DayKey; onPickDay: (d: DayKey) => void;
  /** Texte lu pour un jour (accessibilité). */
  describe: (d: DayKey) => string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const colW = width / days.length;
  const x = (i: number) => colW * (i + 0.5);
  const y = (v: number) => PAD_Y + ((max - v) / (max - min)) * (PLOT_H - 2 * PAD_Y);

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: AXIS_W, height: PLOT_H }}>
          {levels.map((l) => (
            <Txt key={l} size={11} color={colors.muted} style={[st.axisLabel, { top: y(l) - 8 }]}>{formatScore(l)}</Txt>
          ))}
        </View>
        <View style={{ flex: 1, height: PLOT_H }} onLayout={onLayout}>
          {width > 0 ? (
            <>
              {/* Jour affiché : colonne teintée, derrière tout le reste. */}
              {days.map((d, i) => d === selected ? (
                <View key={`sel-${d}`} style={[st.selected, { left: colW * i, width: colW }]} />
              ) : null)}

              {/* Repères très fins. */}
              {levels.map((l) => <View key={l} style={[st.level, { top: y(l) }]} />)}

              {/* Courbes : un trait entre deux jours qui se suivent et qui ont tous deux une valeur. */}
              {series.map((s) => s.values.map((v, i) => {
                const next = s.values[i + 1];
                if (v === null || next === null || next === undefined) return null;
                const x1 = x(i), y1 = y(v), x2 = x(i + 1), y2 = y(next);
                const len = Math.hypot(x2 - x1, y2 - y1);
                return (
                  <View
                    key={`${s.key}-seg-${i}`}
                    style={{
                      position: 'absolute', left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - LINE_W / 2,
                      width: len, height: LINE_W, borderRadius: LINE_W / 2, backgroundColor: s.color,
                      transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
                    }}
                  />
                );
              }))}

              {/* Points (aussi pour un jour isolé, sans voisin à relier). */}
              {series.map((s) => s.values.map((v, i) => v === null ? null : (
                <View
                  key={`${s.key}-dot-${i}`}
                  style={[st.dot, { left: x(i) - DOT / 2, top: y(v) - DOT / 2, backgroundColor: s.color }]}
                />
              )))}

              {/* Toucher une colonne ouvre ce jour. */}
              {days.map((d, i) => (
                <Pressable
                  key={`hit-${d}`}
                  accessibilityRole="button"
                  accessibilityLabel={describe(d)}
                  onPress={() => onPickDay(d)}
                  style={{ position: 'absolute', left: colW * i, width: colW, top: 0, height: PLOT_H }}
                />
              ))}
            </>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', paddingLeft: AXIS_W }}>
        {days.map((d) => {
          const on = d === selected;
          return (
            <View key={d} style={{ flex: 1, alignItems: 'center', paddingTop: 4 }}>
              <Txt size={11} bold={on} color={on ? colors.accent : colors.muted}>{DAY_SHORT[weekdayIndex(d)].charAt(0)}</Txt>
              <Txt size={11} bold={on} color={on ? colors.accent : colors.muted}>{fromKey(d).getDate()}</Txt>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Texte lu pour un jour : « Mercredi 21 octobre : Bonnes journées 7 · … ». */
export function describeDay(d: DayKey, summaryText: string): string {
  return `${labelDayLong(d)}${summaryText ? ` : ${summaryText}` : ''}`;
}

const st = StyleSheet.create({
  axisLabel: { position: 'absolute', right: 6, textAlign: 'right' },
  // Repères : 1 px, très discrets (la courbe doit rester le premier regard).
  level: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.line },
  selected: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.accentSoft, borderRadius: radius.s },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2 },
});
