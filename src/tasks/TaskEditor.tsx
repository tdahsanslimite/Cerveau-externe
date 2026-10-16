// Fiche d'une tâche : intitulé, priorité (important / urgent), jour, domaine, note,
// et « Mettre au calendrier » pour lui réserver un créneau sans tout ressaisir.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { addDays, labelDayLong, relativeLabel, todayKey } from '../calendar/dates';
import type { DayKey } from '../calendar/dates';
import { useCalendar } from '../calendar/CalendarContext';
import { EditorState, EventEditor } from '../calendar/EventEditor';
import { useDayLoad } from '../load';
import { useSettings } from '../settings/SettingsContext';
import { colors, fonts, radius, TOUCH } from '../theme';
import { Button, Chip, Field, Icon, Sheet, Txt } from '../ui';
import { eventFromTask, isStuck, quadrantInfo, quadrantOf, Task } from './model';
import { useOneThing } from './priority';
import { useTasks } from './TasksContext';

export function TaskEditor({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { save, remove } = useTasks();
  const { domains } = useCalendar();
  const { settings } = useSettings();
  const load = useDayLoad();
  const [t, setT] = useState<Task | null>(task);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scheduling, setScheduling] = useState<EditorState | null>(null);
  const { ask, sheet: oneThingSheet } = useOneThing();

  useEffect(() => {
    setT(task);
    setConfirmDelete(false);
    setScheduling(null);
  }, [task]);

  if (!task || !t) return null;
  const patch = (p: Partial<Task>) => setT({ ...t, ...p });
  const canSave = t.title.trim().length > 0;
  const q = quadrantOf(t);
  const today = todayKey();

  const after = t.day ? load(t.day, { taskId: t.id }) + 1 : 0;
  const overLimit = t.day !== null && after > settings.dailyLimit;

  /** Ouvre la fiche d'événement déjà remplie avec cette tâche (intitulé, jour, domaine, note, priorité). */
  const schedule = () =>
    setScheduling({ event: eventFromTask(t, today, domains.map((d) => d.id)), isNew: true, day: t.day ?? today });

  const commit = (next: Task) => {
    if (!next.title.trim()) return;
    save({ ...next, title: next.title.trim(), note: next.note?.trim() || undefined });
    onClose();
  };

  /** Une seule chose importante ET urgente : s'il y en a déjà une, on demande laquelle reste. */
  const onSave = () => {
    if (!canSave) return;
    if (t.status === 'todo' && t.important === true && t.urgent === true) {
      ask({ key: `task:${t.id}`, title: t.title.trim() }, (p) => commit({ ...t, ...p }));
    } else commit(t);
  };

  const footer = (
    <>
      <Button label="Enregistrer" kind="dark" onPress={onSave} style={!canSave && { opacity: 0.4 }} />
      {t.status !== 'dropped' && !confirmDelete ? (
        <Button label="Lâcher cette tâche" kind="ghost" icon="wind" onPress={() => commit({ ...t, status: 'dropped' })} />
      ) : null}
      {!confirmDelete ? (
        <Button label="Supprimer" kind="danger" icon="trash-2" onPress={() => setConfirmDelete(true)} />
      ) : (
        <View style={{ gap: 8 }}>
          <Button label="Oui, supprimer" kind="danger" onPress={() => { remove(t.id); onClose(); }} />
          <Button label="Annuler" kind="ghost" onPress={() => setConfirmDelete(false)} />
        </View>
      )}
    </>
  );

  return (
    <>
    <Sheet visible={!scheduling} onClose={onClose} title="Modifier la tâche" footer={footer}>
      <Field label="Intitulé">
        <TextInput
          accessibilityLabel="Intitulé"
          value={t.title}
          onChangeText={(title) => patch({ title })}
          placeholder="Ex. Appeler la banque"
          placeholderTextColor={colors.faint}
          style={st.input}
        />
      </Field>

      {isStuck(t) ? (
        <View style={st.warn}>
          <Icon name="refresh-cw" size={18} color={colors.warnDark} />
          <Txt size={14} color={colors.warnDark} style={{ flex: 1, lineHeight: 20 }}>
            Elle a glissé {t.slides} fois. Ce n’est pas un défaut de ta part : c’est peut-être trop gros. Tu peux la découper en une première petite étape, lui donner un jour et une heure précis dans le calendrier, ou la lâcher.
          </Txt>
        </View>
      ) : null}

      <Field label="Important ?">
        <View style={st.wrap}>
          <Chip label="Oui" selected={t.important === true} onPress={() => patch({ important: t.important === true ? null : true })} />
          <Chip label="Non" selected={t.important === false} onPress={() => patch({ important: t.important === false ? null : false })} />
        </View>
      </Field>

      <Field
        label="Urgent ?"
        hint={q ? `Rangée dans « ${quadrantInfo(q).label} ».` : 'Tant que ce n’est pas tranché, la tâche reste dans le sas (si elle n’a pas de jour).'}
      >
        <View style={st.wrap}>
          <Chip label="Oui" selected={t.urgent === true} onPress={() => patch({ urgent: t.urgent === true ? null : true })} />
          <Chip label="Non" selected={t.urgent === false} onPress={() => patch({ urgent: t.urgent === false ? null : false })} />
        </View>
      </Field>

      <Field label="Quand ?">
        <View style={st.wrap}>
          <Chip label="Aujourd’hui" selected={t.day === today} onPress={() => patch({ day: today })} />
          <Chip label="Demain" selected={t.day === addDays(today, 1)} onPress={() => patch({ day: addDays(today, 1) })} />
          <Chip label="Un jour" selected={t.day === null} onPress={() => patch({ day: null })} />
        </View>
        {t.day ? (
          <DayStepper day={t.day} onChange={(day) => patch({ day })} />
        ) : null}
        {overLimit ? (
          <View style={st.warn}>
            <Icon name="alert-circle" size={18} color={colors.warnDark} />
            <Txt size={14} color={colors.warnDark} style={{ flex: 1, lineHeight: 20 }}>
              Avec celle-ci, ce jour passe à {after} pour une limite de {settings.dailyLimit}. Un autre jour serait peut-être plus doux ?
            </Txt>
          </View>
        ) : null}
      </Field>

      <Field label="Calendrier" hint="Choisis une heure : la tâche passe dans ton calendrier avec son intitulé, son jour, son domaine et sa priorité. Elle reste dans la matrice.">
        <Button label="Mettre au calendrier" kind="ghost" icon="calendar" onPress={schedule} />
      </Field>

      <Field label="Domaine">
        <View style={st.wrap}>
          <Chip label="Aucun" selected={!t.category} color={colors.ink} onPress={() => patch({ category: undefined })} />
          {domains.map((c) => (
            <Chip key={c.id} label={c.label} dot={c.color} color={colors.ink} selected={t.category === c.id} onPress={() => patch({ category: c.id })} />
          ))}
        </View>
      </Field>

      <Field label="Note">
        <TextInput
          accessibilityLabel="Note"
          value={t.note ?? ''}
          onChangeText={(note) => patch({ note })}
          placeholder="Numéro, détail, première étape…"
          placeholderTextColor={colors.faint}
          multiline
          style={[st.input, { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }]}
        />
      </Field>
    </Sheet>
    {/* La tâche est retirée du module une fois l'événement enregistré : un seul exemplaire, dans le calendrier. */}
    <EventEditor state={scheduling} ignoreKey={`task:${t.id}`} onClose={() => setScheduling(null)} onSaved={() => { remove(t.id); onClose(); }} />
    {oneThingSheet}
    </>
  );
}

function DayStepper({ day, onChange }: { day: DayKey; onChange: (d: DayKey) => void }) {
  return (
    <View style={st.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel="Jour précédent" onPress={() => onChange(addDays(day, -1))} style={({ pressed }) => [st.stepBtn, pressed && { opacity: 0.6 }]}>
        <Icon name="chevron-left" />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Txt bold size={16}>{labelDayLong(day)}</Txt>
        {relativeLabel(day) ? <Txt size={13} color={colors.accent}>{relativeLabel(day)}</Txt> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Jour suivant" onPress={() => onChange(addDays(day, 1))} style={({ pressed }) => [st.stepBtn, pressed && { opacity: 0.6 }]}>
        <Icon name="chevron-right" />
      </Pressable>
    </View>
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
