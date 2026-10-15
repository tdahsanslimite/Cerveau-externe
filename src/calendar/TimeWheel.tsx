// Roue de sélection heures / minutes (pas de 5 min), en pur JavaScript :
// identique sur Android, iOS et web, et aux couleurs de l'appli.
import React, { useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Txt } from '../ui';

const ITEM_H = 44;
const VISIBLE = 5; // lignes visibles ; celle du milieu est la valeur choisie
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const pad = (n: number) => String(n).padStart(2, '0');

function Column({ values, value, onChange, label }: { values: number[]; value: number; onChange: (v: number) => void; label: string }) {
  const ref = useRef<ScrollView>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const index = Math.max(0, values.indexOf(value));

  // Positionne la roue sur la valeur courante (à l'ouverture et quand ±15 la change).
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 0);
    return () => clearTimeout(t);
  }, [index]);

  const settle = (y: number) => {
    const i = Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM_H)));
    if (values[i] !== value) onChange(values[i]);
    else if (Math.abs(y - i * ITEM_H) > 1) ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
  };

  // onScroll + délai : fonctionne aussi sur le web, où onMomentumScrollEnd n'existe pas.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => settle(y), 140);
  };

  return (
    <View style={st.column} accessibilityLabel={`${label} : ${pad(value)}`}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={32}
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: ITEM_H * Math.floor(VISIBLE / 2) }}
      >
        {values.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${pad(v)}`}
            onPress={() => onChange(v)}
            style={st.item}
          >
            <Txt bold={v === value} size={v === value ? 24 : 18} color={v === value ? colors.ink : colors.faint}>{pad(v)}</Txt>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** `value` en minutes depuis minuit. Les minutes hors pas de 5 sont arrondies à l'affichage de la roue. */
export function TimeWheel({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const h = Math.floor(value / 60);
  const m = Math.round((value % 60) / 5) * 5 % 60;
  return (
    <View style={st.wrap}>
      <View style={st.band} pointerEvents="none" />
      <Column label="Heures" values={HOURS} value={h} onChange={(nh) => onChange(nh * 60 + m)} />
      <Txt bold size={24} style={{ marginHorizontal: 4 }}>:</Txt>
      <Column label="Minutes" values={MINUTES} value={m} onChange={(nm) => onChange(h * 60 + nm)} />
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: ITEM_H * VISIBLE,
    backgroundColor: colors.card, borderRadius: radius.m, borderWidth: 1, borderColor: colors.line, overflow: 'hidden',
  },
  band: {
    position: 'absolute', left: 12, right: 12, top: ITEM_H * Math.floor(VISIBLE / 2), height: ITEM_H,
    borderRadius: radius.s, backgroundColor: colors.accentSoft,
  },
  column: { width: 84, height: ITEM_H * VISIBLE },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
});
