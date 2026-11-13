// Navigation : une page d'accueil (tuiles) + la barre du bas, réduite aux usages de tous les jours.
// Un module = une entrée dans MODULES (home/modules.ts) + une ligne d'écran dans SCREENS ci-dessous.
// Navigation volontairement simple (sans Expo Router) tant que l'appli n'a que quelques modules.
// Les écrans de données restent affichés en mémoire : on retrouve le jour et la vue là où on les a laissés.
// Respiration et Méditation ne sont montés que lorsqu'ils sont affichés (l'exercice s'arrête en quittant).
import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BreathingScreen } from './breathing/BreathingScreen';
import { CalendarScreen } from './calendar/CalendarScreen';
import { GoalsScreen } from './goals/GoalsScreen';
import { HomeScreen } from './home/HomeScreen';
import { barModulesFor, categoryOf, CategoryId, ModuleId, TileInfo } from './home/modules';
import { JournalScreen } from './journal/JournalScreen';
import { MeditationScreen } from './meditation/MeditationScreen';
import { nextOverall, whenText } from './reveil/model';
import { useReveil } from './reveil/ReveilContext';
import { ReveilScreen } from './reveil/ReveilScreen';
import { RoutinesScreen } from './routines/RoutinesScreen';
import { useRoutineAlert } from './routines/useRoutineAlert';
import { toSortCount } from './tasks/model';
import { TasksScreen } from './tasks/TasksScreen';
import { useNightlyReset } from './tasks/useNightlyReset';
import { useWidgetSync } from './widget/useWidgetSync';
import { CleanupHost } from './tasks/CleanupHost';
import { DayHost } from './tasks/DayHost';
import { useTaskItems } from './tasks/useTaskItems';
import { colors } from './theme';
import { Icon, IconName, Txt } from './ui';

type Where = 'accueil' | ModuleId;

/** Écrans gardés en mémoire une fois ouverts. */
const KEPT: { id: ModuleId; screen: () => React.ReactElement }[] = [
  { id: 'calendrier', screen: () => <CalendarScreen /> },
  { id: 'taches', screen: () => <TasksScreen /> },
  { id: 'routines', screen: () => <RoutinesScreen /> },
  { id: 'journal', screen: () => <JournalScreen /> },
  { id: 'objectifs', screen: () => <GoalsScreen /> },
  { id: 'reveil', screen: () => <ReveilScreen /> },
];

/** Écrans montés seulement quand ils sont affichés. */
const LIVE: { id: ModuleId; screen: () => React.ReactElement }[] = [
  { id: 'respiration', screen: () => <BreathingScreen /> },
  { id: 'meditation', screen: () => <MeditationScreen /> },
];

export function AppTabs() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<Where>('accueil');
  // Sous-menu ouvert sur l'accueil (null = les 3 catégories). Il reste ouvert quand on entre dans un module,
  // pour que « retour » ramène à la liste d'où l'on vient ; la barre « Accueil » repart des catégories.
  const [menu, setMenu] = useState<CategoryId | null>(null);
  const toSortToday = toSortCount(useTaskItems());
  const routinesAlert = useRoutineAlert();
  const { alarms } = useReveil();
  const nextAlarm = active === 'accueil' ? nextOverall(alarms, new Date()) : null;
  useNightlyReset();
  useWidgetSync();

  // Le bouton retour d'Android remonte d'un niveau : module → sous-menu (ou accueil) → accueil → quitter l'appli.
  useEffect(() => {
    if (active === 'accueil' && menu === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (active === 'accueil') setMenu(null);
      else setActive('accueil');
      return true;
    });
    return () => sub.remove();
  }, [active, menu]);

  const goHome = () => {
    setMenu(null);
    setActive('accueil');
  };

  const info: Partial<Record<ModuleId, TileInfo>> = {
    taches: { badge: toSortToday > 0 ? toSortToday : undefined },
    routines: { dot: routinesAlert },
    reveil: nextAlarm
      ? { hint: `Prochain : ${nextAlarm.alarm.title} ${whenText(nextAlarm.at, new Date())}` }
      : alarms.length > 0 ? { hint: 'Aucun réveil allumé' } : undefined,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={active === 'accueil' ? 'light' : 'dark'} />
      {/* La barre du bas gère elle-même la zone de sécurité : les écrans n'ont pas à l'ajouter. */}
      <SafeAreaInsetsContext.Provider value={{ ...insets, bottom: active === 'accueil' ? insets.bottom : 0 }}>
        <View style={{ flex: 1 }}>
          {KEPT.map((t) => (
            <View key={t.id} style={[StyleSheet.absoluteFill, active !== t.id && { display: 'none' }]}>
              {t.screen()}
            </View>
          ))}
          {LIVE.map((t) =>
            active === t.id ? (
              <View key={t.id} style={StyleSheet.absoluteFill}>{t.screen()}</View>
            ) : null,
          )}
          {active === 'accueil' ? (
            <View style={StyleSheet.absoluteFill}>
              <HomeScreen menu={menu} onMenu={setMenu} onOpen={setActive} info={info} />
            </View>
          ) : null}
        </View>
      </SafeAreaInsetsContext.Provider>
      {/* À l'ouverture : ta journée (et les rappels). En entrant dans Organiser et planifier : le ménage de la veille. */}
      <DayHost />
      <CleanupHost
        active={menu === 'organiser' || (active !== 'accueil' && categoryOf(active)?.id === 'organiser')}
        onLeave={() => { setActive('accueil'); setMenu(null); }}
      />

      {active !== 'accueil' ? (
        <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Accueil"
            onPress={goHome}
            style={({ pressed }) => [st.tab, pressed && { opacity: 0.6 }]}
          >
            <Icon name="home" size={24} color={colors.muted} />
            <Txt size={12} color={colors.muted}>Accueil</Txt>
          </Pressable>
          {barModulesFor(active).map((m) => {
            const on = active === m.id;
            const badge = m.id === 'taches' ? toSortToday : 0;
            const dot = m.id === 'routines' && routinesAlert;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={badge ? `${m.label}, ${badge} à trier` : dot ? `${m.label}, à remplir` : m.label}
                onPress={() => setActive(m.id)}
                style={({ pressed }) => [st.tab, on && st.tabOn, pressed && { opacity: 0.6 }]}
              >
                <View>
                  <Icon name={m.icon as IconName} size={24} color={on ? colors.accent : colors.muted} />
                  {badge ? (
                    <View style={st.badge}>
                      <Txt bold size={11} color="#FFFFFF">{badge > 99 ? '99+' : badge}</Txt>
                    </View>
                  ) : null}
                </View>
                <View style={st.labelRow}>
                  <Txt bold={on} size={12} color={on ? colors.accent : colors.muted}>{m.barLabel}</Txt>
                  {dot ? <View testID="routines-dot" style={st.dot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.alert },
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card, paddingTop: 6 },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabOn: { borderTopWidth: 3, borderTopColor: colors.sand, marginTop: -6, paddingTop: 6 },
  badge: {
    position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.warn, alignItems: 'center', justifyContent: 'center',
  },
});
