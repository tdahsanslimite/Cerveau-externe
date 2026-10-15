// Fiche d'ajout / modification d'une routine.
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Button, Chip, Field, Sheet, Txt } from '../ui';
import { addDays, DAY_SHORT, DayKey, todayKey } from '../calendar/dates';
import { useRoutines } from './RoutinesContext';
import { ALL_WEEK, MOMENTS, newRoutineId, Routine } from './model';

export interface RoutineEditorState {
  routine: Routine;
  isNew: boolean;
}

/** Nouvelle routine : elle existe dès le jour affiché (sans jamais commencer dans le futur). */
export function blankRoutine(day: DayKey): Routine {
  const today = todayKey();
  return { id: newRoutineId(), title: '', moment: 'matin', days: ALL_WEEK, start: day <= today ? day : today };
}

export function RoutineEditor({ state, onClose }: { state: RoutineEditorState | null; onClose: () => void }) {
  const { saveRoutine, retireRoutine } = useRoutines();
  const [r, setR] = useState<Routine | null>(state?.routine ?? null);
  const [confirmRetire, setConfirmRetire] = useState(false);

  useEffect(() => {
    setR(state?.routine ?? null);
    setConfirmRetire(false);
  }, [state]);

  if (!state || !r) return null;
  const patch = (p: Partial<Routine>) => setR({ ...r, ...p });
  const canSave = r.title.trim().length > 0 && r.days.length > 0;
  const everyDay = r.days.length === 7;

  const toggleDay = (i: number) =>
    patch({ days: r.days.includes(i) ? r.days.filter((d) => d !== i) : [...r.days, i].sort((a, b) => a - b) });

  const save = () => {
    if (!canSave) return;
    saveRoutine({ ...r, title: r.title.trim() });
    onClose();
  };

  const footer = (
    <>
      <Button label={state.isNew ? 'Ajouter' : 'Enregistrer'} kind="dark" onPress={save} style={!canSave && { opacity: 0.4 }} />
      {!state.isNew && !confirmRetire && <Button label="Retirer cette routine" kind="danger" icon="trash-2" onPress={() => setConfirmRetire(true)} />}
      {!state.isNew && confirmRetire && (
        <View style={{ gap: 8 }}>
          <Txt size={14} color={colors.muted} style={{ lineHeight: 20 }}>
            Elle disparaît de tes listes à partir d'aujourd'hui. Ce que tu as déjà coché reste dans ton bilan.
          </Txt>
          <Button label="Oui, la retirer" kind="danger" onPress={() => { retireRoutine(r.id, addDays(todayKey(), -1)); onClose(); }} />
          <Button label="Annuler" kind="ghost" onPress={() => setConfirmRetire(false)} />
        </View>
      )}
    </>
  );

  return (
    <Sheet visible onClose={onClose} title={state.isNew ? 'Nouvelle routine' : 'Modifier la routine'} footer={footer}>
      <Field label="Intitulé">
        <TextInput
          accessibilityLabel="Intitulé"
          value={r.title}
          onChangeText={(title) => patch({ title })}
          placeholder="Ex. Boire un verre d'eau"
          placeholderTextColor={colors.faint}
          autoFocus={state.isNew}
          returnKeyType="done"
          onSubmitEditing={save}
          style={st.input}
        />
      </Field>

      <Field label="Moment de la journée">
        <View style={st.wrap}>
          {MOMENTS.map((m) => (
            <Chip key={m.id} label={m.label} selected={r.moment === m.id} onPress={() => patch({ moment: m.id })} />
          ))}
        </View>
      </Field>

      <Field label="Jours" hint={r.days.length === 0 ? 'Choisis au moins un jour.' : 'Elle revient chaque semaine, tous les mois, sans rien recopier.'}>
        <View style={st.wrap}>
          <Chip label="Tous les jours" selected={everyDay} onPress={() => patch({ days: ALL_WEEK })} />
          {DAY_SHORT.map((label, i) => (
            <Chip key={label} label={label} selected={!everyDay && r.days.includes(i)} onPress={() => (everyDay ? patch({ days: [i] }) : toggleDay(i))} />
          ))}
        </View>
      </Field>
    </Sheet>
  );
}

const st = StyleSheet.create({
  input: {
    minHeight: 48, borderRadius: radius.m, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16, color: colors.ink,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
