// Onglet Objectifs : « Blason » (qui je suis), « Année » (5 thèmes, un One Thing en tête), « Périodes » (semaine, mois, trimestre).
// Tout est ouvert dès le départ (pas de quête ni de cadenas pour l'instant).
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Txt } from '../ui';
import { BlasonView } from './BlasonView';
import { useGoals } from './GoalsContext';
import { BLASON, blasonCount } from './model';
import { PeriodsView } from './PeriodsView';
import { YearView } from './YearView';

type Section = 'blason' | 'annee' | 'periodes';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'blason', label: 'Blason' },
  { id: 'annee', label: 'Année' },
  { id: 'periodes', label: 'Périodes' },
];

export function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { blason } = useGoals();
  // Blason à remplir d'abord ; une fois complet, on arrive directement sur les objectifs de l'année.
  const [section, setSection] = useState<Section>(() => (blasonCount(blason) < BLASON.length ? 'blason' : 'annee'));

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <Txt bold size={22} style={{ flex: 1 }}>Objectifs</Txt>
      </View>
      <View style={st.navRow}>
        <View style={st.segmented} accessibilityRole="tablist">
          {SECTIONS.map((s) => {
            const on = section === s.id;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setSection(s.id)}
                style={[st.segment, on && st.segmentOn]}
              >
                <Txt bold={on} size={14} color={on ? colors.ink : colors.muted} numberOfLines={1}>{s.label}</Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {section === 'blason' && <BlasonView />}
        {section === 'annee' && <YearView />}
        {section === 'periodes' && <PeriodsView />}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  navRow: { paddingHorizontal: 16, paddingBottom: 12 },
  segmented: { flexDirection: 'row', backgroundColor: '#EAE7E0', borderRadius: radius.m, padding: 3, gap: 2 },
  segment: { flex: 1, minHeight: 44, paddingHorizontal: 2, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  content: { paddingHorizontal: 16, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
});
