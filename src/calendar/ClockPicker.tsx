// Horloge : on touche ou on fait glisser le doigt sur le cadran.
// 1) l'heure (cercle extérieur 1-12, intérieur 13-00), puis 2) les minutes, À LA MINUTE PRÈS partout dans l'appli
// (22 nov., demande de Valentin : plus de boutons −1 / +1 min, « l'horloge propose minute par minute »).
// Créée le 17 nov. pour le Journal, partagée par tous les endroits où l'on règle une heure (TimeSelector).
import React, { useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Txt } from '../ui';
import { pickFromDial } from './clockMath';

const pad = (n: number) => String(n).padStart(2, '0');

const SIZE = 264;
const C = SIZE / 2;
const R_OUT = 104;
const R_IN = 66;
const R_TICK = 125;
const BTN = 38;
const OUTER_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const INNER_HOURS = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const MINUTE_LABELS = Array.from({ length: 12 }, (_, i) => i * 5);

/** Position sur le cadran : i = 0 en haut, puis dans le sens des aiguilles (12 crans par tour). */
function at(i: number, r: number) {
  const a = (i * Math.PI) / 6;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

/** `step` est gardé pour compatibilité : l'horloge règle toujours à la minute près. */
export function ClockPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void; step?: number }) {
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [dragging, setDragging] = useState(false);
  const face = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const h = Math.floor(value / 60);
  const m = value % 60;

  const hourPos = (hour: number) => {
    const outer = OUTER_HOURS.indexOf(hour);
    return outer >= 0 ? at(outer, R_OUT) : at(INNER_HOURS.indexOf(hour), R_IN);
  };
  const target = mode === 'hours' ? hourPos(h) : at(m / 5, R_OUT);
  const len = Math.hypot(target.x - C, target.y - C);

  const apply = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.pageX - origin.current.x - C;
    const y = e.nativeEvent.pageY - origin.current.y - C;
    const picked = pickFromDial(mode, x, y, (R_OUT + R_IN) / 2);
    if (picked === null) return;
    const next = mode === 'hours' ? picked * 60 + m : h * 60 + picked;
    if (next !== value) onChange(next);
  };

  const labels = (list: number[], r: number, selected: number, small = false) =>
    list.map((v, i) => {
      const p = at(i, r);
      const on = v === selected;
      return (
        <View key={`${r}-${v}`} pointerEvents="none" style={[st.num, { left: p.x - BTN / 2, top: p.y - BTN / 2 }, on && st.numOn]}>
          <Txt bold={on} size={small ? 13 : 16} color={on ? '#FFFFFF' : small ? colors.muted : colors.ink}>{pad(v)}</Txt>
        </View>
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

      <View
        ref={face}
        style={st.face}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={mode === 'hours' ? `Heure : ${h} heures` : `Minutes : ${m}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const d = e.nativeEvent.actionName === 'increment' ? 1 : -1;
          onChange(mode === 'hours' ? (((h + d + 24) % 24) * 60 + m) : h * 60 + ((m + d + 60) % 60));
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onStartShouldSetResponderCapture={() => true}
        onMoveShouldSetResponderCapture={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          setDragging(true);
          // Position du cadran à l'écran = point touché − position dans le cadran (les chiffres ne captent pas le doigt).
          const { pageX, pageY, locationX, locationY } = e.nativeEvent;
          origin.current = { x: pageX - locationX, y: pageY - locationY };
          apply(e);
        }}
        onResponderMove={apply}
        onResponderRelease={(e) => {
          apply(e);
          setDragging(false);
          if (mode === 'hours') setMode('minutes');
        }}
        onResponderTerminate={() => setDragging(false)}
      >
        {/* Graduations : un trait par minute, plus marqué toutes les 5 minutes. */}
        {mode === 'minutes'
          ? Array.from({ length: 60 }, (_, i) => {
            const p = at(i / 5, R_TICK);
            const big = i % 5 === 0;
            const on = i === m;
            const s = on ? 8 : big ? 4 : 3;
            return (
              <View
                key={`t${i}`}
                pointerEvents="none"
                style={{
                  position: 'absolute', left: p.x - s / 2, top: p.y - s / 2, width: s, height: s, borderRadius: s / 2,
                  backgroundColor: on ? colors.accent : big ? colors.muted : colors.faint,
                }}
              />
            );
          })
          : null}
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
            {labels(OUTER_HOURS, R_OUT, h)}
            {labels(INNER_HOURS, R_IN, h, true)}
          </>
        ) : (
          <>
            {labels(MINUTE_LABELS, R_OUT, m)}
            {/* Minute entre deux repères : une bulle au bout de l'aiguille. */}
            {m % 5 !== 0 ? (
              <View pointerEvents="none" style={[st.num, st.numOn, { left: target.x - BTN / 2, top: target.y - BTN / 2 }]}>
                <Txt bold size={16} color="#FFFFFF">{pad(m)}</Txt>
              </View>
            ) : null}
          </>
        )}
      </View>

      <Txt size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        {mode === 'hours'
          ? 'Extérieur : de 1 h à 12 h. Intérieur : de 13 h à minuit (00).'
          : dragging ? 'Relâche sur la bonne minute.' : 'Fais glisser le doigt sur le cadran : chaque petit trait est une minute.'}
      </Txt>
    </View>
  );
}

const st = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  part: { paddingHorizontal: 12, paddingVertical: 2, borderRadius: radius.m },
  partOn: { backgroundColor: colors.accentSoft },
  // userSelect : sur la version web, glisser le doigt ne doit pas sélectionner les chiffres.
  face: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.lineSoft, userSelect: 'none' } as object,
  center: { position: 'absolute', left: C - 4, top: C - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  num: { position: 'absolute', width: BTN, height: BTN, borderRadius: BTN / 2, alignItems: 'center', justifyContent: 'center' },
  numOn: { backgroundColor: colors.accent },
});
