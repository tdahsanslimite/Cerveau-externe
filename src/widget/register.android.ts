// Android : enregistre le gestionnaire du widget (doit être fait dans index.ts, avant tout rendu).
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './handler';

export function registerWidget() {
  registerWidgetTaskHandler(widgetTaskHandler);
}
