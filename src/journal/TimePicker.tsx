// Choisir une heure (coucher, lever) : avec la roue de l'appli ou avec une horloge qu'on touche.
// Le choix roue / horloge se fait dans les réglages du Journal (demande de Valentin, 17 nov.).
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Button, Sheet, Txt } from '../ui';
import { TimeWheel } from '../calendar/TimeWheel';
import type { TimePicker } from './model';

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

/** Horloge : on touche l'heure (cercle extérieur 1-12, intérieur 13-00), puis les minutes (de 5 en 5). */
export function ClockPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const h = Math.floor(value / 60);
  const m = (Math.round((value % 60) / 5) * 5) % 60;

  const hourPos = (hour: number) => {
    const outer = OUTER_HOURS.indexOf(hour);
    return outer >= 0 ? at(outer, R_OUT) : at(INNER_HOURS.indexOf(hour), R_IN);
  };
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
      <Txt size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        {mode === 'hours' ? 'Extérieur : de 1 h à 12 h. Intérieur : de 13 h à minuit (00).' : 'Touche les minutes, ou l’heure en haut pour revenir.'}
      </Txt>
    </View>
  );
}

/** Feuille « Heure de coucher » / « Heure de lever » : roue ou horloge selon les réglages, puis Valider. */
export function TimeSheet({ visible, title, initial, picker, hasValue, onClose, onSave, onClear }: {
  visible: boolean; title: string; initial: number; picker: TimePicker; hasValue: boolean;
  onClose: () => void; onSave: (minutes: number) => void; onClear: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button label={`Valider ${pad(Math.floor(draft / 60))}:${pad(draft % 60)}`} icon="check" onPress={() => onSave(draft)} />
          {hasValue ? <Button kind="ghost" label="Effacer l'heure" onPress={onClear} /> : null}
        </>
      }
    >
      {picker === 'clock' ? <ClockPicker value={draft} onChange={setDraft} /> : <TimeWheel value={draft} onChange={setDraft} />}
    </Sheet>
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
});
