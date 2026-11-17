// Onglet Objectifs : « Blason » (qui je suis), « Année » (les thèmes choisis, un One Thing en tête),
// « Périodes » (semaine, mois, trimestre, une fiche par thème).
// 17 nov. (Valentin) : au premier passage on choisit UN thème ; bouton réglages en haut à gauche pour en ajouter ;
// à chaque entrée dans l'onglet, une fenêtre montre les objectifs de la semaine en cours.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { todayKey } from '../calendar/dates';
import { colors, radius } from '../theme';
import { IconButton, Txt } from '../ui';
import { BlasonView } from './BlasonView';
import { useGoals } from './GoalsContext';
import { BLASON, blasonCount } from './model';
import { PeriodFocus, PeriodsView } from './PeriodsView';
import { FirstThemeSheet, ThemesSheet, WeekSheet } from './ThemeSheets';
import { YearView } from './YearView';

type Section = 'blason' | 'annee' | 'periodes';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'blason', label: 'Blason' },
  { id: 'annee', label: 'Année' },
  { id: 'periodes', label: 'Périodes' },
];

/** `shown` : l'onglet est celui affiché (il reste monté en mémoire quand on va ailleurs). */
export function GoalsScreen({ shown = true }: { shown?: boolean }) {
  const insets = useSafeAreaInsets();
  const { blason, chosen } = useGoals();
  // Blason à remplir d'abord ; une fois complet, on arrive directement sur les objectifs de l'année.
  const [section, setSection] = useState<Section>(() => (blasonCount(blason) < BLASON.length ? 'blason' : 'annee'));
  const [focus, setFocus] = useState<PeriodFocus>(() => ({ theme: chosen[0] ?? 'business', kind: 'semaine', day: todayKey() }));
  const [settings, setSettings] = useState(false);
  const [week, setWeek] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const firstTime = chosen.length === 0;

  // À chaque entrée dans l'onglet : les objectifs de la semaine (pas pendant le premier choix).
  useEffect(() => {
    if (shown && !firstTime) setWeek(true);
    if (!shown) setWeek(false);
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const editWeek = (theme: PeriodFocus['theme']) => {
    setWeek(false);
    setFocus({ theme, kind: 'semaine', day: todayKey() });
    setSection('periodes');
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <IconButton icon="sliders" label="Mes thèmes" onPress={() => setSettings(true)} />
        <Txt bold size={22} style={{ flex: 1 }}>Objectifs</Txt>
        {!firstTime ? <IconButton icon="calendar" label="Objectifs de la semaine" onPress={() => setWeek(true)} /> : null}
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

      <ScrollView ref={scroll} contentContainerStyle={[st.content, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {section === 'blason' && <BlasonView />}
        {section === 'annee' && !firstTime && <YearView />}
        {section === 'periodes' && !firstTime && <PeriodsView focus={focus} onFocus={setFocus} />}
      </ScrollView>

      <FirstThemeSheet visible={shown && firstTime} />
      <ThemesSheet visible={settings && !firstTime} onClose={() => setSettings(false)} />
      <WeekSheet visible={week && shown && !firstTime && !settings} onClose={() => setWeek(false)} onEdit={editWeek} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  navRow: { paddingHorizontal: 16, paddingBottom: 12 },
  segmented: { flexDirection: 'row', backgroundColor: '#EAE7E0', borderRadius: radius.m, padding: 3, gap: 2 },
  segment: { flex: 1, minHeight: 44, paddingHorizontal: 2, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  content: { paddingHorizontal: 16, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
});
