// Fiche d'ajout / modification d'un événement.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSettings } from '../settings/SettingsContext';
import { colors, fonts, radius, TOUCH } from '../theme';
import { Button, Chip, Field, Icon, Sheet, Txt } from '../ui';
import { useCalendar } from './CalendarContext';
import { addDays, DayKey, durationLabel, labelDayLong, minutesToLabel, relativeLabel } from './dates';
import { CalendarEvent, CATEGORIES, newId, occurrencesOn, REPEATS } from './model';

const DURATIONS = [15, 30, 60, 90, 120, 180];

export interface EditorState {
  event: CalendarEvent;
  isNew: boolean;
  /** Jour de l'occurrence touchée (utile pour supprimer un seul jour d'une série). */
  day: DayKey;
}

export function blankEvent(day: DayKey, start: number | null = 9 * 60): CalendarEvent {
  return { id: newId(), title: '', date: day, start, durationMin: 60, category: 'travail', repeat: 'none' };
}

export function EventEditor({ state, onClose }: { state: EditorState | null; onClose: () => void }) {
  const { events, saveEvent, deleteEvent, skipOccurrence } = useCalendar();
  const { settings } = useSettings();
  const [e, setE] = useState<CalendarEvent | null>(state?.event ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lastStart, setLastStart] = useState(9 * 60);

  useEffect(() => {
    setE(state?.event ?? null);
    setConfirmDelete(false);
  }, [state]);

  if (!state || !e) return null;
  const patch = (p: Partial<CalendarEvent>) => setE({ ...e, ...p });
  const canSave = e.title.trim().length > 0;
  const recurring = e.repeat !== 'none';

  // Charge du jour visé, sans compter l'événement en cours d'édition.
  const others = occurrencesOn(events.filter((x) => x.id !== e.id), e.date).length;
  const after = others + 1;
  const overLimit = after > settings.dailyLimit;

  const shiftStart = (delta: number) => patch({ start: Math.min(23 * 60 + 45, Math.max(0, (e.start ?? lastStart) + delta)) });

  const save = () => {
    if (!canSave) return;
    saveEvent({ ...e, title: e.title.trim(), note: e.note?.trim() || undefined });
    onClose();
  };

  const footer = (
    <>
      <Button label={state.isNew ? 'Ajouter' : 'Enregistrer'} kind="dark" onPress={save} style={!canSave && { opacity: 0.4 }} />
      {!state.isNew && !confirmDelete && <Button label="Supprimer" kind="danger" icon="trash-2" onPress={() => setConfirmDelete(true)} />}
      {!state.isNew && confirmDelete && (
        <View style={{ gap: 8 }}>
          {recurring ? (
            <>
              <Button label="Supprimer ce jour seulement" kind="danger" onPress={() => { skipOccurrence(e.id, state.day); onClose(); }} />
              <Button label="Supprimer toute la série" kind="danger" onPress={() => { deleteEvent(e.id); onClose(); }} />
            </>
          ) : (
            <Button label="Oui, supprimer" kind="danger" onPress={() => { deleteEvent(e.id); onClose(); }} />
          )}
          <Button label="Annuler" kind="ghost" onPress={() => setConfirmDelete(false)} />
        </View>
      )}
    </>
  );

  return (
    <Sheet visible onClose={onClose} title={state.isNew ? 'Nouvel événement' : 'Modifier'} footer={footer}>
      <Field label="Intitulé">
        <TextInput
          accessibilityLabel="Intitulé"
          value={e.title}
          onChangeText={(title) => patch({ title })}
          placeholder="Ex. Rendez-vous notaire"
          placeholderTextColor={colors.faint}
          autoFocus={state.isNew}
          returnKeyType="done"
          onSubmitEditing={save}
          style={st.input}
        />
      </Field>

      <Field label={recurring ? 'À partir du' : 'Jour'}>
        <View style={st.stepper}>
          <StepBtn icon="chevron-left" label="Jour précédent" onPress={() => patch({ date: addDays(e.date, -1) })} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Txt bold size={16}>{labelDayLong(e.date)}</Txt>
            {relativeLabel(e.date) ? <Txt size={13} color={colors.accent}>{relativeLabel(e.date)}</Txt> : null}
          </View>
          <StepBtn icon="chevron-right" label="Jour suivant" onPress={() => patch({ date: addDays(e.date, 1) })} />
        </View>
        {overLimit ? (
          <View style={st.warn}>
            <Icon name="alert-circle" size={18} color={colors.warnDark} />
            <Txt size={14} color={colors.warnDark} style={{ flex: 1, lineHeight: 20 }}>
              Avec celui-ci, ce jour passe à {after} pour une limite de {settings.dailyLimit}. Un autre jour serait peut-être plus doux ?
            </Txt>
          </View>
        ) : null}
      </Field>

      <Field label="Heure">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Heure précise" selected={e.start !== null} onPress={() => { if (e.start === null) patch({ start: lastStart }); }} />
          <Chip label="Toute la journée" selected={e.start === null} onPress={() => { if (e.start !== null) setLastStart(e.start); patch({ start: null }); }} />
        </View>
        {e.start !== null ? (
          <View style={st.stepper}>
            <StepBtn text="−1 h" label="Une heure plus tôt" onPress={() => shiftStart(-60)} />
            <StepBtn text="−15" label="Quinze minutes plus tôt" onPress={() => shiftStart(-15)} />
            <Txt bold size={22} style={{ flex: 1, textAlign: 'center' }}>{minutesToLabel(e.start)}</Txt>
            <StepBtn text="+15" label="Quinze minutes plus tard" onPress={() => shiftStart(15)} />
            <StepBtn text="+1 h" label="Une heure plus tard" onPress={() => shiftStart(60)} />
          </View>
        ) : null}
      </Field>

      {e.start !== null ? (
        <Field label="Durée" hint={`Fin à ${minutesToLabel(e.start + e.durationMin)}`}>
          <View style={st.wrap}>
            {DURATIONS.map((d) => (
              <Chip key={d} label={durationLabel(d)} selected={e.durationMin === d} onPress={() => patch({ durationMin: d })} />
            ))}
          </View>
        </Field>
      ) : null}

      <Field label="Domaine">
        <View style={st.wrap}>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} dot={c.color} color={colors.ink} selected={e.category === c.id} onPress={() => patch({ category: c.id })} />
          ))}
        </View>
      </Field>

      <Field label="Répétition" hint={recurring && !state.isNew ? 'Les modifications s’appliquent à toute la série.' : undefined}>
        <View style={st.wrap}>
          {REPEATS.map((r) => (
            <Chip key={r.id} label={r.label} selected={e.repeat === r.id} onPress={() => patch({ repeat: r.id })} />
          ))}
        </View>
      </Field>

      <Field label="Note">
        <TextInput
          accessibilityLabel="Note"
          value={e.note ?? ''}
          onChangeText={(note) => patch({ note })}
          placeholder="Adresse, chose à apporter…"
          placeholderTextColor={colors.faint}
          multiline
          style={[st.input, { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }]}
        />
      </Field>
    </Sheet>
  );
}

function StepBtn({ icon, text, label, onPress }: { icon?: React.ComponentProps<typeof Icon>['name']; text?: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [st.stepBtn, pressed && { opacity: 0.6 }]}>
      {icon ? <Icon name={icon} /> : <Txt bold size={14}>{text}</Txt>}
    </Pressable>
  );
}

const st = StyleSheet.create({
  input: {
    minHeight: 48, borderRadius: radius.m, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16, color: colors.ink,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.m, borderWidth: 1, borderColor: colors.line, padding: 6 },
  stepBtn: { minWidth: TOUCH, height: TOUCH, borderRadius: radius.s, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warn: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.warnSoft, borderRadius: radius.m, padding: 12 },
});
