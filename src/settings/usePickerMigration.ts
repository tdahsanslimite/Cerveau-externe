// Reprise, une seule fois, de l'ancien choix « Horloge » (réglages du Journal, ou un endroit de la v1.0.70)
// dans le réglage unique de l'appli (22 nov.). Sans ancien choix horloge, rien n'est écrit (roulette par défaut).
import { useEffect } from 'react';
import { useJournal } from '../journal/JournalContext';
import { useSettings } from './SettingsContext';
import { legacyPicker } from './timePicker';

export function usePickerMigration() {
  const { settings, update, loaded } = useSettings();
  const { prefs } = useJournal();
  useEffect(() => {
    if (!loaded || settings.timePicker !== undefined) return;
    const legacy = legacyPicker(settings.timePickers, prefs.picker);
    if (legacy) update({ timePicker: legacy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, settings.timePicker, settings.timePickers, prefs.picker]);
}
