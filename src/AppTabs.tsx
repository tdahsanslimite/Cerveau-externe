// Barre d'onglets du bas. Un module = une ligne dans TABS.
// Navigation volontairement simple (sans Expo Router) tant que l'appli n'a que quelques modules.
// Tous les écrans restent affichés en mémoire : on retrouve le jour et la vue là où on les a laissés.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarScreen } from './calendar/CalendarScreen';
import { RoutinesScreen } from './routines/RoutinesScreen';
import { inSas, justCompleted, shouldAdvance } from './tasks/model';
import type { TaskItem } from './tasks/model';
import { AdvanceSheet } from './tasks/priority';
import { SortSheet } from './tasks/SortSheet';
import { TasksScreen } from './tasks/TasksScreen';
import { useTaskItems } from './tasks/useTaskItems';
import { colors } from './theme';
import { Icon, IconName, Txt } from './ui';

type TabId = 'calendrier' | 'taches' | 'routines';

const TABS: { id: TabId; label: string; icon: IconName; screen: () => React.ReactElement }[] = [
  { id: 'calendrier', label: 'Calendrier', icon: 'calendar', screen: () => <CalendarScreen /> },
  { id: 'taches', label: 'Tâches', icon: 'check-square', screen: () => <TasksScreen /> },
  { id: 'routines', label: 'Routines', icon: 'repeat', screen: () => <RoutinesScreen /> },
];

export function AppTabs() {
  const insets = useSafeAreaInsets();
  const items = useTaskItems();
  const [active, setActive] = useState<TabId>('calendrier');
  const sasCount = inSas(items).length;
  const [advance, setAdvance] = useState(false);
  const [sorting, setSorting] = useState(false);
  const previous = useRef<TaskItem[] | null>(null);

  // Dès qu'une tâche est cochée et que la place de « la chose » est libre, on propose de requalifier la matrice.
  useEffect(() => {
    const before = previous.current;
    previous.current = items;
    if (before && justCompleted(before, items).length > 0 && shouldAdvance(items)) setAdvance(true);
  }, [items]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* La barre du bas gère elle-même la zone de sécurité : les écrans n'ont pas à l'ajouter. */}
      <SafeAreaInsetsContext.Provider value={{ ...insets, bottom: 0 }}>
        <View style={{ flex: 1 }}>
          {TABS.map((t) => (
            <View key={t.id} style={[StyleSheet.absoluteFill, active !== t.id && { display: 'none' }]}>
              {t.screen()}
            </View>
          ))}
        </View>
      </SafeAreaInsetsContext.Provider>

      <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
        {TABS.map((t) => {
          const on = active === t.id;
          const badge = t.id === 'taches' && sasCount > 0 ? sasCount : 0;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={badge ? `${t.label}, ${badge} dans le sas` : t.label}
              onPress={() => setActive(t.id)}
              style={({ pressed }) => [st.tab, pressed && { opacity: 0.6 }]}
            >
              <View>
                <Icon name={t.icon} size={22} color={on ? colors.accent : colors.muted} />
                {badge ? (
                  <View style={st.badge}>
                    <Txt bold size={11} color="#FFFFFF">{badge > 99 ? '99+' : badge}</Txt>
                  </View>
                ) : null}
              </View>
              <Txt bold={on} size={12} color={on ? colors.accent : colors.muted}>{t.label}</Txt>
            </Pressable>
          );
        })}
      </View>
      <AdvanceSheet
        visible={advance}
        onClose={() => setAdvance(false)}
        onSort={() => {
          setActive('taches');
          setSorting(true);
        }}
      />
      <SortSheet visible={sorting} onClose={() => setSorting(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card, paddingTop: 6 },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  badge: {
    position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.warn, alignItems: 'center', justifyContent: 'center',
  },
});
