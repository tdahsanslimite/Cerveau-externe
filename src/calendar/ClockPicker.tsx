// Horloge : on touche l'heure sur le cadran (cercle extérieur 1-12, intérieur 13-00), puis les minutes (de 5 en 5).
// Avec `step={1}` (réveil), deux boutons −1 / +1 ajustent à la minute près.
// Créée le 17 nov. pour le Journal, partagée le 22 nov. par tous les endroits où l'on règle une heure (TimeSelector).
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Txt } from '../ui';
import { nudgeMinutes } from '../settings/timePicker';

const pad = (n: number) => String(n).padStart(2, '0');

const SIZE = 264;
const C = SIZE / 2;
const R_OUT = 104;
const R_IN = 66;
const BTN = 38;
const OUTER_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const INNER_HOURS = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/** Position sur le cadran : i = 0 en haut, puis dans le sens des aiguilles d'une montre. */
function at(i: number, r: number) {
  const a = (i * Math.PI) / 6;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

export function ClockPicker({ value, onChange, step = 5 }: { value: number; onChange: (minutes: number) => void; step?: number }) {
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const h = Math.floor(value / 60);
  const m = step === 1 ? value % 60 : (Math.round((value % 60) / 5) * 5) % 60;

  const hourPos = (hour: number) => {
    const outer = OUTER_HOURS.indexOf(hour);
    return outer >= 0 ? at(outer, R_OUT) : at(INNER_HOURS.indexOf(hour), R_IN);
  };
  // Aiguille des minutes : position exacte, même entre deux repères (réveil à la minute près).
  const target = mode === 'hours' ? hourPos(h) : at(m / 5, R_OUT);
  const len = Math.hypot(target.x - C, target.y - C);

  const dial = (labels: number[], r: number, selected: number, onPick: (v: number) => void, small = false) =>
    labels.map((v, i) => {
      const p = at(i, r);
      const on = v === selected;
      return (
        <Pressable
          key={`${r}-${v}`}
          accessibilityRole="button"
          accessibilityLabel={mode === 'hours' ? `${v} heures` : `${v} minutes`}
          accessibilityState={{ selected: on }}
          onPress={() => onPick(v)}
          style={[st.num, { left: p.x - BTN / 2, top: p.y - BTN / 2 }, on && st.numOn]}
        >
          <Txt bold={on} size={small ? 13 : 16} color={on ? '#FFFFFF' : small ? colors.muted : colors.ink}>{pad(v)}</Txt>
        </Pressable>
      );
    });

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <View style={st.readout}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choisir l'heure" onPress={() => setMode('hours')} style={[st.part, mode === 'hours' && st.partOn]}>
          <Txt bold size={34} color={mode === 'hours' ? colors.accent : colors.ink}>{pad(h)}</Txt>
        </Pressable>
        <Txt bold size={34}>:</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Choisir les minutes" onPress={() => setMode('minutes')} style={[st.part, mode === 'minutes' && st.partOn]}>
          <Txt bold size={34} color={mode === 'minutes' ? colors.accent : colors.ink}>{pad(m)}</Txt>
        </Pressable>
      </View>

      <View style={st.face}>
        {/* Aiguille : du centre jusqu'à la valeur choisie. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: (C + target.x) / 2 - len / 2, top: (C + target.y) / 2 - 1,
            width: len, height: 2, backgroundColor: colors.accent,
            transform: [{ rotate: `${Math.atan2(target.y - C, target.x - C)}rad` }],
          }}
        />
        <View pointerEvents="none" style={st.center} />
        {mode === 'hours' ? (
          <>
            {dial(OUTER_HOURS, R_OUT, h, (v) => { onChange(v * 60 + m); setMode('minutes'); })}
            {dial(INNER_HOURS, R_IN, h, (v) => { onChange(v * 60 + m); setMode('minutes'); }, true)}
          </>
        ) : (
          dial(MINUTES, R_OUT, m, (v) => onChange(h * 60 + v))
        )}
      </View>

      {mode === 'minutes' && step === 1 ? (
        <View style={st.nudges}>
          <Pressable accessibilityRole="button" accessibilityLabel="Une minute de moins" onPress={() => onChange(nudgeMinutes(h * 60 + m, -1))} style={({ pressed }) => [st.nudge, pressed && { opacity: 0.6 }]}>
            <Txt bold size={16}>− 1 min</Txt>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Une minute de plus" onPress={() => onChange(nudgeMinutes(h * 60 + m, 1))} style={({ pressed }) => [st.nudge, pressed && { opacity: 0.6 }]}>
            <Txt bold size={16}>+ 1 min</Txt>
          </Pressable>
        </View>
      ) : null}

      <Txt size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        {mode === 'hours' ? 'Extérieur : de 1 h à 12 h. Intérieur : de 13 h à minuit (00).' : 'Touche les minutes, ou l’heure en haut pour revenir.'}
      </Txt>
    </View>
  );
}

const st = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  part: { paddingHorizontal: 12, paddingVertical: 2, borderRadius: radius.m },
  partOn: { backgroundColor: colors.accentSoft },
  face: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.lineSoft },
  center: { position: 'absolute', left: C - 4, top: C - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  num: { position: 'absolute', width: BTN, height: BTN, borderRadius: BTN / 2, alignItems: 'center', justifyContent: 'center' },
  numOn: { backgroundColor: colors.accent },
  nudges: { flexDirection: 'row', gap: 12 },
  nudge: {
    minHeight: 44, paddingHorizontal: 16, borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
});
