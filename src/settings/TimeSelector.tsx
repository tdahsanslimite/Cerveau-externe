// Sélecteur d'heure de l'appli : roulette ou horloge selon le réglage de l'endroit (Paramètres › … › Pour choisir une heure).
// Tout nouvel endroit où l'on règle une heure doit passer par ici (et ajouter son `TimePlace`).
import React from 'react';
import { View } from 'react-native';
import { ClockPicker } from '../calendar/ClockPicker';
import { TimeWheel } from '../calendar/TimeWheel';
import { Chip, Field } from '../ui';
import { useSettings } from './SettingsContext';
import { PICKER_HINT, PICKER_LABEL, pickerFor, setPicker, TimePicker, TimePlace } from './timePicker';

/** Le sélecteur choisi pour cet endroit (`fallback` : ancien réglage du Journal). */
export function useTimePicker(place: TimePlace, fallback?: TimePicker): TimePicker {
  const { settings } = useSettings();
  return pickerFor(settings.timePickers, place, fallback);
}

export function TimeSelector({ place, value, onChange, step, fallback }: {
  place: TimePlace; value: number; onChange: (minutes: number) => void; step?: number; fallback?: TimePicker;
}) {
  const picker = useTimePicker(place, fallback);
  return picker === 'clock'
    ? <ClockPicker value={value} onChange={onChange} step={step} />
    : <TimeWheel value={value} onChange={onChange} step={step} />;
}

/** Réglage « Pour choisir une heure » d'un endroit : Roulette / Horloge, appliqué tout de suite. */
export function TimePickerChoice({ place, label = 'Pour choisir une heure', fallback }: { place: TimePlace; label?: string; fallback?: TimePicker }) {
  const { settings, update } = useSettings();
  const picker = pickerFor(settings.timePickers, place, fallback);
  const choose = (p: TimePicker) => update({ timePickers: setPicker(settings.timePickers, place, p) });
  return (
    <Field label={label} hint={PICKER_HINT[picker]}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['wheel', 'clock'] as const).map((p) => (
          <Chip key={p} label={PICKER_LABEL[p]} selected={picker === p} onPress={() => choose(p)} />
        ))}
      </View>
    </Field>
  );
}
