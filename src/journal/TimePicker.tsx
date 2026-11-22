// Choisir une heure (coucher, lever) : avec la roue de l'appli ou avec une horloge qu'on touche.
// Le choix roulette / horloge se fait dans les réglages du Journal ou dans Paramètres › Journal (17 nov., 22 nov.).
import React, { useEffect, useState } from 'react';
import { Button, Sheet } from '../ui';
import { ClockPicker } from '../calendar/ClockPicker';
import { TimeWheel } from '../calendar/TimeWheel';
import type { TimePicker } from './model';

export { ClockPicker };

const pad = (n: number) => String(n).padStart(2, '0');

/** Feuille « Heure de coucher » / « Heure de lever » : roue ou horloge selon les réglages, puis Valider. */
export function TimeSheet({ visible, title, initial, picker, hasValue, onClose, onSave, onClear }: {
  visible: boolean; title: string; initial: number; picker: TimePicker; hasValue: boolean;
  onClose: () => void; onSave: (minutes: number) => void; onClear: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button label={`Valider ${pad(Math.floor(draft / 60))}:${pad(draft % 60)}`} icon="check" onPress={() => onSave(draft)} />
          {hasValue ? <Button kind="ghost" label="Effacer l'heure" onPress={onClear} /> : null}
        </>
      }
    >
      {picker === 'clock' ? <ClockPicker value={draft} onChange={setDraft} /> : <TimeWheel value={draft} onChange={setDraft} />}
    </Sheet>
  );
}
