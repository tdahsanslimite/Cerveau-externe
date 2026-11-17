// Réglages du Journal : ce que chacun veut suivre chaque jour (17 nov., demande de Valentin :
// « tout le monde n'a pas des problèmes de sommeil, ou des douleurs dues au sport », « éviter que tout le monde
// se sente oppressé par trop de choix »). Demandés une fois à la première ouverture, modifiables ensuite
// avec le bouton en haut à gauche du Journal.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Button, Chip, Field, Icon, Sheet, Txt } from '../ui';
import { useJournal } from './JournalContext';
import { FIELD_LABEL, FIELDS, JournalPrefs, toggleField } from './model';
import type { ScoreField } from './model';

const FIELD_HINT: Record<ScoreField, string> = {
  mood: "Est-ce que j'ai passé une bonne journée ?",
  mind: 'Est-ce que je me sens bien dans ma tête ?',
  body: 'Est-ce que je me sens en forme ? (fatigue, douleurs du sport…)',
  sleep: "Est-ce que j'ai bien dormi ?",
};

function CheckRow({ label, hint, on, onPress, disabled }: { label: string; hint?: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [st.row, on && st.rowOn, pressed && { opacity: 0.7 }]}
    >
      <View style={[st.box, on && st.boxOn]}>{on ? <Icon name="check" size={16} color="#FFFFFF" /> : null}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt bold size={16}>{label}</Txt>
        {hint ? <Txt size={13} color={colors.muted}>{hint}</Txt> : null}
      </View>
    </Pressable>
  );
}

export function JournalSettingsSheet({ visible, onClose, firstTime }: { visible: boolean; onClose: () => void; firstTime: boolean }) {
  const { prefs, setPrefs } = useJournal();
  const [draft, setDraft] = useState<JournalPrefs>(prefs);
  useEffect(() => {
    if (visible) setDraft(prefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = () => {
    setPrefs(draft);
    onClose();
  };
  const sleepOn = draft.fields.includes('sleep');
  const last = draft.fields.length === 1;

  return (
    <Sheet
      visible={visible}
      // Première fois : pas de croix ; le retour du téléphone garde ce qui est coché (on ne bloque personne).
      onClose={firstTime ? save : onClose}
      closable={!firstTime}
      title={firstTime ? 'Ton journal, à ta façon' : 'Réglages du journal'}
      footer={<Button label="Valider" icon="check" onPress={save} />}
    >
      {firstTime ? (
        <Txt size={15} color={colors.muted} style={{ lineHeight: 22 }}>
          Garde seulement ce qui te parle : moins de cases, moins de pression. Tu pourras changer ça quand tu veux avec le bouton en haut à gauche du journal.
        </Txt>
      ) : null}

      <Field label="Ce que je note chaque jour" hint="Une note décochée est masquée, pas effacée : la recocher fait revenir tes anciens jours.">
        <View style={{ gap: 8 }}>
          {FIELDS.map((f) => {
            const on = draft.fields.includes(f);
            return (
              <CheckRow
                key={f}
                label={FIELD_LABEL[f]}
                hint={on && last ? `${FIELD_HINT[f]} · Il faut garder au moins une note.` : FIELD_HINT[f]}
                on={on}
                disabled={on && last}
                onPress={() => setDraft((d) => ({ ...d, fields: toggleField(d.fields, f) }))}
              />
            );
          })}
        </View>
      </Field>

      {sleepOn ? (
        <Field label="Sommeil">
          <CheckRow
            label="Heure de coucher et de lever"
            hint="Pour voir tes horaires et la durée de tes nuits."
            on={draft.sleepTimes}
            onPress={() => setDraft((d) => ({ ...d, sleepTimes: !d.sleepTimes }))}
          />
        </Field>
      ) : null}

      {sleepOn && draft.sleepTimes ? (
        <Field label="Pour choisir une heure" hint={draft.picker === 'wheel' ? 'Les heures et les minutes défilent.' : 'Tu touches l’heure sur le cadran, puis les minutes.'}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Roue" selected={draft.picker === 'wheel'} onPress={() => setDraft((d) => ({ ...d, picker: 'wheel' }))} />
            <Chip label="Horloge" selected={draft.picker === 'clock'} onPress={() => setDraft((d) => ({ ...d, picker: 'clock' }))} />
          </View>
        </Field>
      ) : null}
    </Sheet>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 56,
    borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
  },
  rowOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  box: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
