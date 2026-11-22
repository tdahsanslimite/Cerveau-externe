// Sélecteur d'heure de l'appli : roulette ou horloge selon LE réglage de l'appli (Paramètres › Général).
// Tout nouvel endroit où l'on règle une heure doit passer par ici (et ajouter son `TimePlace`).
import React from 'react';
import { View } from 'react-native';
import { ClockPicker } from '../calendar/ClockPicker';
import { TimeWheel } from '../calendar/TimeWheel';
import { Chip, Field } from '../ui';
import { useSettings } from './SettingsContext';
import { PICKER_HINT, PICKER_LABEL, resolvePicker, TimePicker, TimePlace } from './timePicker';

/** Le sélecteur choisi pour toute l'appli. */
export function useTimePicker(): TimePicker {
  return resolvePicker(useSettings().settings.timePicker);
}

/** `place` : l'endroit (pour s'y retrouver dans le code ; tous suivent le même réglage). */
export function TimeSelector({ value, onChange, step }: {
  place: TimePlace; value: number; onChange: (minutes: number) => void; step?: number;
}) {
  const picker = useTimePicker();
  return picker === 'clock'
    ? <ClockPicker value={value} onChange={onChange} step={step} />
    : <TimeWheel value={value} onChange={onChange} step={step} />;
}

/** Réglage « Pour choisir une heure » : Roulette / Horloge, pour toute l'appli, appliqué tout de suite. */
export function TimePickerChoice() {
  const { settings, update } = useSettings();
  const picker = resolvePicker(settings.timePicker);
  return (
    <Field label="Pour choisir une heure" hint={`${PICKER_HINT[picker]} Partout dans l’appli (calendrier, programmer, journal, réveil).`}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['wheel', 'clock'] as const).map((p) => (
          <Chip key={p} label={PICKER_LABEL[p]} selected={picker === p} onPress={() => update({ timePicker: p })} />
        ))}
      </View>
    </Field>
  );
}
