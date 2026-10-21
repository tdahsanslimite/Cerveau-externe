import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold, useFonts } from '@expo-google-fonts/atkinson-hyperlegible';
import { CalendarProvider, useCalendar } from './src/calendar/CalendarContext';
import { AppTabs } from './src/AppTabs';
import { JournalProvider, useJournal } from './src/journal/JournalContext';
import { RoutinesProvider, useRoutines } from './src/routines/RoutinesContext';
import { SettingsProvider, useSettings } from './src/settings/SettingsContext';
import { TasksProvider, useTasks } from './src/tasks/TasksContext';
import { colors } from './src/theme';

function Gate() {
  const { loaded: settingsLoaded } = useSettings();
  const { loaded: calendarLoaded } = useCalendar();
  const { loaded: tasksLoaded } = useTasks();
  const { loaded: routinesLoaded } = useRoutines();
  const { loaded: journalLoaded } = useJournal();
  if (!settingsLoaded || !calendarLoaded || !tasksLoaded || !routinesLoaded || !journalLoaded) return <Splash />;
  return <AppTabs />;
}

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {fontsLoaded ? (
        <SettingsProvider>
          <CalendarProvider>
            <TasksProvider>
              <RoutinesProvider>
                <JournalProvider>
                  <Gate />
                </JournalProvider>
              </RoutinesProvider>
            </TasksProvider>
          </CalendarProvider>
        </SettingsProvider>
      ) : (
        <Splash />
      )}
    </SafeAreaProvider>
  );
}
