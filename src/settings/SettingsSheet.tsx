import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { colors, radius, TOUCH } from '../theme';
import { Chip, Sheet, Txt } from '../ui';
import { DomainsEditor } from './DomainsEditor';
import { CalendarView, useSettings } from './SettingsContext';

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
];

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, update } = useSettings();
  const limit = settings.dailyLimit;
  return (
    <Sheet visible={visible} onClose={onClose} title="Réglages">
      <View style={st.group}>
        <View style={st.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt bold>Ma limite par jour</Txt>
            <Txt size={13} color={colors.muted}>Au-delà, la journée est signalée trop chargée.</Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Baisser la limite" onPress={() => update({ dailyLimit: Math.max(1, limit - 1) })} style={st.step}>
              <Txt bold size={20}>−</Txt>
            </Pressable>
            <Txt bold size={18} style={{ width: 28, textAlign: 'center' }}>{limit}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="Augmenter la limite" onPress={() => update({ dailyLimit: Math.min(20, limit + 1) })} style={st.step}>
              <Txt bold size={20}>+</Txt>
            </Pressable>
          </View>
        </View>

        <View style={[st.row, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
          <Txt bold>Vue à l'ouverture</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {VIEWS.map((v) => (
              <Chip key={v.id} label={v.label} selected={settings.startView === v.id} onPress={() => update({ startView: v.id })} />
            ))}
          </View>
        </View>

        <View style={[st.row, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt bold>Afficher les créneaux libres</Txt>
            <Txt size={13} color={colors.muted}>Dans la vue Jour, entre 8 h et 21 h.</Txt>
          </View>
          <Switch
            accessibilityLabel="Afficher les créneaux libres"
            value={settings.showFreeSlots}
            onValueChange={(v) => update({ showFreeSlots: v })}
            trackColor={{ true: colors.accent, false: '#C9C5BB' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 }}>Domaines</Txt>
        <DomainsEditor />
      </View>
      <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4, lineHeight: 19 }}>
        Tes données restent sur ce téléphone.
      </Txt>
    </Sheet>
  );
}

const st = StyleSheet.create({
  group: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  step: { width: TOUCH, height: TOUCH, borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
});
