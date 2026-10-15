import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold, useFonts } from '@expo-google-fonts/atkinson-hyperlegible';
import { CalendarProvider, useCalendar } from './src/calendar/CalendarContext';
import { AppTabs } from './src/AppTabs';
import { SettingsProvider, useSettings } from './src/settings/SettingsContext';
import { TasksProvider, useTasks } from './src/tasks/TasksContext';
import { colors } from './src/theme';

function Gate() {
  const { loaded: settingsLoaded } = useSettings();
  const { loaded: calendarLoaded } = useCalendar();
  const { loaded: tasksLoaded } = useTasks();
  if (!settingsLoaded || !calendarLoaded || !tasksLoaded) return <Splash />;
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
              <Gate />
            </TasksProvider>
          </CalendarProvider>
        </SettingsProvider>
      ) : (
        <Splash />
      )}
    </SafeAreaProvider>
  );
}
