// Android : enregistre l'instantané pour le widget et lui demande de se redessiner.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { todayKey } from '../calendar/dates';
import { DayWidget } from './DayWidget';
import { WIDGET_KEY, WIDGET_NAME, WidgetSnapshot } from './model';

export async function syncWidget(snap: WidgetSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(snap));
    await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => <DayWidget snap={snap} today={todayKey()} /> });
  } catch {
    // Pas de widget posé, ou module absent : rien à faire.
  }
}
