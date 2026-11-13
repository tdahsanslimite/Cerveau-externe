// Appelé par Android, appli fermée ou non : ajout du widget, mise à jour (toutes les 30 min), redimensionnement, toucher.
// Il relit l'instantané préparé par l'appli (ce.widget.v1) et dessine le jour courant.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { todayKey } from '../calendar/dates';
import { DayWidget } from './DayWidget';
import { WIDGET_KEY, WidgetSnapshot } from './model';

async function readSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_KEY);
    return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
  } catch {
    return null;
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  // Un toucher ouvre l'appli (clickAction OPEN_APP, géré par Android) : on redessine quand même.
  props.renderWidget(<DayWidget snap={await readSnapshot()} today={todayKey()} />);
}
