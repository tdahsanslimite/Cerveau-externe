import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold, useFonts } from '@expo-google-fonts/atkinson-hyperlegible';
import { CalendarProvider, useCalendar } from './src/calendar/CalendarContext';
import { CalendarScreen } from './src/calendar/CalendarScreen';
import { SettingsProvider, useSettings } from './src/settings/SettingsContext';
import { colors } from './src/theme';

function Gate() {
  const { loaded: settingsLoaded } = useSettings();
  const { loaded: calendarLoaded } = useCalendar();
  if (!settingsLoaded || !calendarLoaded) return <Splash />;
  return <CalendarScreen />;
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
            <Gate />
          </CalendarProvider>
        </SettingsProvider>
      ) : (
        <Splash />
      )}
    </SafeAreaProvider>
  );
}
