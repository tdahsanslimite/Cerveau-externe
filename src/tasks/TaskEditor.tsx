// Fiche d'une idée : Tâche ou Liste (à cocher), puis 1) la note, 2) le domaine, 3) la priorité (Oui / Non / Ne sais pas).
// Pour une idée existante, on peut la mettre au calendrier, mais seulement si elle est dans The One Thing ou « Urgent et important » :
// on crée l'idée, on juge sa priorité, et si elle le mérite on la programme (évite la surcharge).
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { addDays, durationLabel, labelDayLong, minutesToLabel, relativeLabel, todayKey } from '../calendar/dates';
import type { DayKey } from '../calendar/dates';
import { useCalendar } from '../calendar/CalendarContext';
import { findConflict, nextFreeStart } from '../calendar/model';
import { DomainPicker } from '../calendar/DomainPicker';
import { ItemListEditor, TriChips } from '../calendar/ItemListEditor';
import { TimeWheel } from '../calendar/TimeWheel';
import { colors, fonts, radius, TOUCH } from '../theme';
import { Button, Chip, Field, Icon, Sheet, Txt } from '../ui';
import { canSchedule, continueList, eventFromTask, IDEA_KINDS, isStuck, quadrantInfo, quadrantOf, Task } from './model';
import { useTasks } from './TasksContext';

const DURATIONS = [15, 30, 45, 60, 90, 120];

export function TaskEditor({ task, onClose, isNew = false }: { task: Task | null; onClose: () => void; isNew?: boolean }) {
  const { save, remove } = useTasks();
  const { domains, events, saveEvent } = useCalendar();
  const [t, setT] = useState<Task | null>(task);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cal, setCal] = useState<{ day: DayKey; start: number; duration: number } | null>(null);
  const [wheel, setWheel] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    setT(task);
    setConfirmDelete(false);
    setCal(null);
    setWheel(false);
    setTried(false);
  }, [task]);

  if (!task || !t) return null;
  const patch = (p: Partial<Task>) => setT({ ...t, ...p });
  const today = todayKey();
  const titleOk = t.title.trim().length > 0;
  const q = quadrantOf({ important: t.important, urgent: t.urgent, oneThing: t.oneThing });
  const isList = t.kind === 'liste';
  const schedulable = canSchedule({ important: t.important, urgent: t.urgent, oneThing: t.oneThing });

  const clean = (next: Task): Task => ({
    ...next,
    title: next.title.trim(),
    note: next.note?.trim() || undefined,
    items: next.kind === 'liste' ? (next.items ?? []).filter((i) => i.text.trim()).map((i) => ({ ...i, text: i.text.trim() })) : next.items,
  });
  const setKind = (kind: 'tache' | 'liste') =>
    patch({ kind, ...(kind === 'liste' && !(t.items ?? []).length ? { items: [{ id: `l${Date.now().toString(36)}`, text: '' }] } : {}) });

  // ---- Créneau choisi (idée existante) ----
  const candidate = cal && schedulable ? { ...eventFromTask({ ...t, day: cal.day }, today, domains.map((d) => d.id)), start: cal.start, durationMin: cal.duration } : null;
  const conflict = candidate ? findConflict(events, candidate) : null;
  const suggestion = candidate && conflict ? nextFreeStart(events, { ...candidate, date: conflict.day }, cal!.start) : null;

  const validate = () => {
    setTried(true);
    if (!titleOk) return;
    // « Ne sais pas » (null) est gardé tel quel : l'idée reste dans Abandonner, à répartir plus tard.
    const imp = t.important;
    const urg = t.urgent;
    const done = clean({ ...t, important: imp, urgent: urg, oneThing: imp === true && urg === true ? t.oneThing : undefined });
    if (cal && candidate) {
      if (conflict) return;
      saveEvent({ ...candidate, title: done.title, important: imp, urgent: urg, note: done.note, items: done.kind === 'liste' ? done.items : undefined });
      remove(t.id); // un seul exemplaire : l'événement du calendrier, qui reste dans les listes
    } else {
      save(done);
    }
    onClose();
  };

  /** Fermer sans valider : une nouvelle idée n'est pas perdue, elle attend d'être classée. */
  const close = () => {
    if (isNew && titleOk) save(clean(t));
    onClose();
  };

  const toggleCal = () => {
    setWheel(false);
    setCal(cal ? null : { day: t.day ?? today, start: 9 * 60, duration: 60 });
  };

  const footer = (
    <>
      {tried && !titleOk ? <Txt size={14} color={colors.danger} style={{ textAlign: 'center' }}>Donne un titre à l’idée.</Txt> : null}
      {tried && conflict ? (
        <Txt size={14} color={colors.danger} style={{ textAlign: 'center' }}>Ce créneau est déjà pris par « {conflict.event.title} ».</Txt>
      ) : null}
      <Button label="Valider" kind="dark" onPress={validate} style={(!titleOk || !!conflict) && { opacity: 0.45 }} />
    </>
  );

  return (
    <Sheet visible onClose={close} title={isNew ? 'Nouvelle idée' : 'Modifier l’idée'} footer={footer}>
      <Field label="Titre">
        <TextInput
          accessibilityLabel="Titre"
          value={t.title}
          onChangeText={(title) => patch({ title })}
          placeholder="Ex. Appeler la banque"
          placeholderTextColor={colors.faint}
          style={st.input}
        />
      </Field>

      <Field label="C’est…">
        <View style={st.wrap}>
          {IDEA_KINDS.map((k) => (
            <Chip key={k.id} label={k.label} selected={(t.kind ?? 'tache') === k.id} onPress={() => setKind(k.id)} />
          ))}
        </View>
      </Field>

      {isStuck(t) ? (
        <View style={st.warn}>
          <Icon name="refresh-cw" size={18} color={colors.warnDark} />
          <Txt size={14} color={colors.warnDark} style={{ flex: 1, lineHeight: 20 }}>
            Elle est revenue {t.slides} fois. Ce n’est pas un défaut de ta part : c’est peut-être trop gros. Découpe-la en une première petite étape, ou abandonne-la.
          </Txt>
        </View>
      ) : null}

      {isList ? (
        <Field label="1 · Ta liste" hint="Une ligne par chose. Tu les coches une à une.">
          <ItemListEditor items={t.items ?? []} onChange={(items) => patch({ items })} placeholder="Ex. lait" />
        </Field>
      ) : (
        <Field label="1 · Développe ton idée" hint="Une note libre. Un retour à la ligne après un tiret continue la liste.">
        <TextInput
          accessibilityLabel="Note"
          value={t.note ?? ''}
          onChangeText={(note) => patch({ note: continueList(t.note ?? '', note) })}
          placeholder={'- première étape\n- ce qu’il faut prévoir'}
          placeholderTextColor={colors.faint}
          multiline
          style={[st.input, { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' }]}
        />
        </Field>

      )}

      <Field label="2 · Domaine" hint="Une simple étiquette, pour les calculs.">
        <DomainPicker value={t.category} onChange={(category) => patch({ category })} allowNone />
      </Field>

      <Field label="3 · Priorité" hint={`Rangée dans « ${quadrantInfo(q).label} ». « Ne sais pas » : elle reste En vrac, à trier.`}>
        <View style={{ gap: 10 }}>
          <View style={{ gap: 6 }}>
            <Txt bold size={14}>Important ?</Txt>
            <TriChips value={t.important} onChange={(important) => patch({ important })} />
          </View>
          <View style={{ gap: 6 }}>
            <Txt bold size={14}>Urgent ?</Txt>
            <TriChips value={t.urgent} onChange={(urgent) => patch({ urgent })} />
          </View>
        </View>
      </Field>

      {!isNew ? (
        <Field
          label="Calendrier"
          hint={schedulable
            ? 'Choisis la date et l’heure : à la validation, l’idée entre au calendrier.'
            : 'On ne programme que ce qui est dans The One Thing ou « Urgent et important ». Juge d’abord la priorité : si elle le mérite, tu pourras la mettre au calendrier.'}
        >
          {schedulable ? <Button label={cal ? 'Pas de calendrier' : 'Mettre au calendrier'} kind="ghost" icon="calendar" onPress={toggleCal} /> : null}
          {cal && schedulable ? (
            <View style={{ gap: 10 }}>
              <View style={st.stepper}>
                <Pressable accessibilityRole="button" accessibilityLabel="Jour précédent" onPress={() => setCal({ ...cal, day: addDays(cal.day, -1) })} style={({ pressed }) => [st.stepBtn, pressed && { opacity: 0.6 }]}>
                  <Icon name="chevron-left" />
                </Pressable>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Txt bold size={16}>{labelDayLong(cal.day)}</Txt>
                  {relativeLabel(cal.day) ? <Txt size={13} color={colors.accent}>{relativeLabel(cal.day)}</Txt> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Jour suivant" onPress={() => setCal({ ...cal, day: addDays(cal.day, 1) })} style={({ pressed }) => [st.stepBtn, pressed && { opacity: 0.6 }]}>
                  <Icon name="chevron-right" />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Heure de début ${minutesToLabel(cal.start)}`}
                onPress={() => setWheel(!wheel)}
                style={({ pressed }) => [st.timeRow, pressed && { opacity: 0.7 }]}
              >
                <Txt size={15} color={colors.muted}>Début</Txt>
                <Txt bold size={18}>{minutesToLabel(cal.start)}</Txt>
              </Pressable>
              {wheel ? <TimeWheel value={cal.start} onChange={(start) => setCal({ ...cal, start })} /> : null}
              <View style={st.wrap}>
                {DURATIONS.map((d) => (
                  <Chip key={d} label={durationLabel(d)} selected={cal.duration === d} onPress={() => setCal({ ...cal, duration: d })} />
                ))}
              </View>
              {conflict && suggestion !== null ? (
                <Button label={`Décaler à ${minutesToLabel(suggestion)}`} kind="ghost" onPress={() => setCal({ ...cal, start: suggestion })} />
              ) : null}
            </View>
          ) : null}
        </Field>
      ) : null}

      {!isNew ? (
        <View style={{ gap: 8, marginTop: 4 }}>
        {!isNew && t.status !== 'dropped' && !confirmDelete ? (
          <Button label="Abandonner cette idée" kind="ghost" icon="wind" onPress={() => { save(clean({ ...t, status: 'dropped' })); onClose(); }} />
        ) : null}
        {!isNew && !confirmDelete ? <Button label="Supprimer" kind="danger" icon="trash-2" onPress={() => setConfirmDelete(true)} /> : null}
        {!isNew && confirmDelete ? (
          <View style={{ gap: 8 }}>
            <Button label="Oui, supprimer" kind="danger" onPress={() => { remove(t.id); onClose(); }} />
            <Button label="Annuler" kind="ghost" onPress={() => setConfirmDelete(false)} />
          </View>
        ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

const st = StyleSheet.create({
  input: {
    minHeight: 48, borderRadius: radius.m, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16, color: colors.ink,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.m, borderWidth: 1, borderColor: colors.line, padding: 6 },
  stepBtn: { minWidth: TOUCH, height: TOUCH, borderRadius: radius.s, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  timeRow: {
    minHeight: 52, borderRadius: radius.m, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warn: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.warnSoft, borderRadius: radius.m, padding: 12 },
});
