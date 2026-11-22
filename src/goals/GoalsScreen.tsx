// Onglet Objectifs : « Blason » (qui je suis) et « Mes thèmes ».
// Toucher un thème = entrer dedans : zoom enchaîné Année → Trimestre → Mois → Semaine (ThemeView, 17 nov.).
// Au premier passage on choisit UN thème ; bouton réglages en haut à gauche pour en ajouter ;
// à chaque entrée dans l'onglet, une fenêtre montre les objectifs de la semaine en cours.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { todayKey } from '../calendar/dates';
import { colors, radius } from '../theme';
import { IconButton, Txt } from '../ui';
import { TutorialButton } from '../tutorials/Tutorials';
import { BlasonView } from './BlasonView';
import { useGoals } from './GoalsContext';
import { BLASON, blasonCount, ThemeId, Zoom, zoomToday, zoomYear } from './model';
import { ThemesList } from './ThemesList';
import { FirstThemeSheet, ThemesSheet, WeekSheet } from './ThemeSheets';
import { Block, ThemeView } from './ThemeView';

type Section = 'blason' | 'themes';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'blason', label: 'Blason' },
  { id: 'themes', label: 'Mes thèmes' },
];

/** `shown` : l'onglet est celui affiché (il reste monté en mémoire quand on va ailleurs). */
export function GoalsScreen({ shown = true }: { shown?: boolean }) {
  const insets = useSafeAreaInsets();
  const { blason, chosen } = useGoals();
  // Blason à remplir d'abord ; une fois complet, on arrive directement sur les thèmes.
  const [section, setSection] = useState<Section>(() => (blasonCount(blason) < BLASON.length ? 'blason' : 'themes'));
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [zoom, setZoom] = useState<Zoom>(() => zoomToday(todayKey()));
  const [open, setOpen] = useState<Set<Block>>(new Set());
  const [settings, setSettings] = useState(false);
  const [week, setWeek] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const firstTime = chosen.length === 0;
  // Un thème retiré dans les réglages pendant qu'on était dedans : retour à la liste.
  const current = theme && chosen.includes(theme) ? theme : null;

  // À chaque entrée dans l'onglet : les objectifs de la semaine (pas pendant le premier choix).
  useEffect(() => {
    if (shown && !firstTime) setWeek(true);
    if (!shown) setWeek(false);
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const top = () => scroll.current?.scrollTo({ y: 0, animated: false });

  const enter = (t: ThemeId, blocks: Block[] = []) => {
    setTheme(t);
    setOpen(new Set(blocks));
    setSection('themes');
    top();
  };

  // Crayon de « Ta semaine » : on entre dans le thème, sur la semaine en cours, bloc Semaine ouvert.
  const editWeek = (t: ThemeId) => {
    setWeek(false);
    setZoom(zoomToday(todayKey()));
    enter(t, ['semaine']);
  };

  const toggle = (b: Block) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <IconButton icon="sliders" label="Mes thèmes" onPress={() => setSettings(true)} />
        <Txt bold size={22} style={{ flex: 1 }}>Objectifs</Txt>
        {!firstTime ? <IconButton icon="calendar" label="Objectifs de la semaine" onPress={() => setWeek(true)} /> : null}
        <TutorialButton id="objectifs" />
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
                onPress={() => {
                  // Retoucher « Mes thèmes » depuis un thème ramène à la liste.
                  if (s.id === 'themes' && section === 'themes') setTheme(null);
                  setSection(s.id);
                  top();
                }}
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
        {section === 'themes' && !firstTime && !current && (
          <ThemesList year={zoom.year} onYear={(y) => setZoom(zoomYear(y, todayKey()))} onOpen={(t) => enter(t)} />
        )}
        {section === 'themes' && current && (
          <ThemeView
            theme={current}
            zoom={zoom}
            onZoom={setZoom}
            open={open}
            onToggle={toggle}
            onBack={() => { setTheme(null); top(); }}
          />
        )}
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
