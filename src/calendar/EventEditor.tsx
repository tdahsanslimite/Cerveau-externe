// Fiche d'ajout / modification d'un événement.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useDayLoad } from '../load';
import { useSettings } from '../settings/SettingsContext';
import { colors, fonts, radius, TOUCH } from '../theme';
import { Button, Chip, Field, Icon, Sheet, Txt } from '../ui';
import { useCalendar } from './CalendarContext';
import { addDays, DayKey, durationLabel, labelDayLong, labelDayShort, minutesToLabel, relativeLabel } from './dates';
import {
  ALERTS, CalendarEvent, EventKind, findConflict, KINDS, kindsOf, MAX_REMINDERS, newId, nextFreeStart,
  Reminder, REMINDER_UNITS, REPEATS,
} from './model';
import { notificationsSupported } from './notifications';
import { TimeWheel } from './TimeWheel';

const DAY_END = 24 * 60;
const MIN_DURATION = 5;

export interface EditorState {
  event: CalendarEvent;
  isNew: boolean;
  /** Jour de l'occurrence touchée (utile pour supprimer un seul jour d'une série). */
  day: DayKey;
}

export function blankEvent(day: DayKey, start: number | null = 9 * 60, category = 'travail'): CalendarEvent {
  return {
    id: newId(), title: '', date: day, start, durationMin: 60, category, repeat: 'none',
    kinds: ['rdv'], reminders: [{ amount: 30, unit: 'min' }],
  };
}

export function EventEditor({ state, onClose, onSaved }: {
  state: EditorState | null; onClose: () => void;
  /** Appelé après l'enregistrement (avant `onClose`) : sert à finir le passage d'une tâche au calendrier. */
  onSaved?: () => void;
}) {
  const { events, domains, saveEvent, deleteEvent, skipOccurrence } = useCalendar();
  const { settings } = useSettings();
  const load = useDayLoad();
  const [e, setE] = useState<CalendarEvent | null>(state?.event ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [wheel, setWheel] = useState<'start' | 'end' | null>(null);
  const [lastStart, setLastStart] = useState(9 * 60);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    setE(state?.event ? { ...state.event, kinds: kindsOf(state.event), reminders: state.event.reminders ?? [] } : null);
    setConfirmDelete(false);
    setWheel(null);
    setTried(false);
  }, [state]);

  if (!state || !e) return null;
  const patch = (p: Partial<CalendarEvent>) => setE({ ...e, ...p });
  const kinds = kindsOf(e);
  const reminders = e.reminders ?? [];
  const recurring = e.repeat !== 'none';
  const hasItem = kinds.includes('objet');
  /** Une tâche ponctuelle peut être triée dans le sas et la matrice d'Eisenhower du module Tâches. */
  const inMatrix = kinds.includes('tache') && !recurring;

  // ---- Heures : début et fin ----
  const start = e.start ?? lastStart;
  const end = start + e.durationMin;
  const setStart = (s: number) => {
    const ns = Math.max(0, Math.min(DAY_END - MIN_DURATION, s));
    patch({ start: ns, durationMin: Math.min(e.durationMin, DAY_END - ns) }); // la fin suit, durée conservée
  };
  const setEnd = (en: number) => {
    const ne = Math.max(start + MIN_DURATION, Math.min(DAY_END, en));
    patch({ durationMin: ne - start });
  };

  // ---- Vérifications ----
  const titleOk = e.title.trim().length > 0;
  const itemOk = !hasItem || (e.item ?? '').trim().length > 0;
  const conflict = findConflict(events, e);
  const suggestion = conflict ? nextFreeStart(events, { ...e, date: conflict.day }, start) : null;
  const canSave = titleOk && itemOk && !conflict;

  // Charge du jour visé (événements + tâches), sans compter l'événement en cours d'édition.
  const others = load(e.date, { eventId: e.id });
  const overLimit = others + 1 > settings.dailyLimit;

  const toggleKind = (k: EventKind) => {
    const next = kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k];
    patch({ kinds: next.length ? next : ['rdv'], itemEveReminder: k === 'objet' && !kinds.includes('objet') ? true : e.itemEveReminder });
  };

  const setReminder = (i: number, r: Partial<Reminder>) =>
    patch({ reminders: reminders.map((x, j) => (j === i ? { ...x, ...r } : x)) });

  const save = () => {
    setTried(true);
    if (!canSave) return;
    saveEvent({
      ...e,
      title: e.title.trim(),
      item: e.item?.trim() || undefined,
      note: e.note?.trim() || undefined,
      // La priorité ne sert qu'aux tâches ponctuelles (sas et matrice) : on ne garde pas une valeur oubliée.
      important: inMatrix ? e.important ?? null : undefined,
      urgent: inMatrix ? e.urgent ?? null : undefined,
    });
    onSaved?.();
    onClose();
  };

  const footer = (
    <>
      {tried && !canSave ? (
        <Txt size={14} color={colors.danger} style={{ textAlign: 'center' }}>
          {!titleOk ? 'Donne un intitulé à l’événement.' : !itemOk ? 'Indique l’objet à prendre.' : 'Ce créneau est déjà pris.'}
        </Txt>
      ) : null}
      <Button label={state.isNew ? 'Ajouter' : 'Enregistrer'} kind="dark" onPress={save} style={!canSave && { opacity: 0.45 }} />
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
          placeholder="Ex. IRM du genou"
          placeholderTextColor={colors.faint}
          autoFocus={state.isNew}
          returnKeyType="done"
          style={[st.input, tried && !titleOk && st.inputError]}
        />
      </Field>

      <Field label="C'est…" hint="Tu peux en choisir plusieurs.">
        <View style={st.wrap}>
          {KINDS.map((k) => (
            <Chip key={k.id} label={k.label} selected={kinds.includes(k.id)} onPress={() => toggleKind(k.id)} />
          ))}
        </View>
      </Field>

      {inMatrix ? (
        <>
          <Field label="Important ?" hint="Pour la matrice des Tâches. Laisse vide pour la trier plus tard : elle ira dans le sas.">
            <View style={st.wrap}>
              <Chip label="Oui" selected={e.important === true} onPress={() => patch({ important: e.important === true ? null : true })} />
              <Chip label="Non" selected={e.important === false} onPress={() => patch({ important: e.important === false ? null : false })} />
            </View>
          </Field>
          <Field label="Urgent ?">
            <View style={st.wrap}>
              <Chip label="Oui" selected={e.urgent === true} onPress={() => patch({ urgent: e.urgent === true ? null : true })} />
              <Chip label="Non" selected={e.urgent === false} onPress={() => patch({ urgent: e.urgent === false ? null : false })} />
            </View>
          </Field>
        </>
      ) : null}

      {hasItem ? (
        <Field label="Objet à prendre">
          <TextInput
            accessibilityLabel="Objet à prendre"
            value={e.item ?? ''}
            onChangeText={(item) => patch({ item })}
            placeholder="Ex. devis signé, carte vitale"
            placeholderTextColor={colors.faint}
            style={[st.input, tried && !itemOk && st.inputError]}
          />
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: !!e.itemEveReminder }} onPress={() => patch({ itemEveReminder: !e.itemEveReminder })} style={st.checkRow}>
            <View style={[st.box, e.itemEveReminder && st.boxOn]}>{e.itemEveReminder ? <Icon name="check" size={16} color="#FFFFFF" /> : null}</View>
            <Txt size={14} style={{ flex: 1 }}>Me le rappeler la veille à 20 h pour le préparer</Txt>
          </Pressable>
        </Field>
      ) : null}

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
          <Notice tone="warn" text={`Avec celui-ci, ce jour passe à ${others + 1} pour une limite de ${settings.dailyLimit}. Un autre jour serait peut-être plus doux ?`} />
        ) : null}
      </Field>

      <Field label="Horaire">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Heure précise" selected={e.start !== null} onPress={() => { if (e.start === null) patch({ start: lastStart }); }} />
          <Chip label="Toute la journée" selected={e.start === null} onPress={() => { if (e.start !== null) setLastStart(e.start); setWheel(null); patch({ start: null }); }} />
        </View>
        {e.start !== null ? (
          <View style={{ gap: 8 }}>
            <TimeRow label="Début" value={start} open={wheel === 'start'} onToggle={() => setWheel(wheel === 'start' ? null : 'start')} />
            {wheel === 'start' ? <TimeWheel value={start} onChange={setStart} /> : null}
            <TimeRow label="Fin" value={end} open={wheel === 'end'} onToggle={() => setWheel(wheel === 'end' ? null : 'end')} />
            {wheel === 'end' ? <TimeWheel value={Math.min(end, DAY_END - 5)} onChange={setEnd} /> : null}
            <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4 }}>Durée : {durationLabel(e.durationMin)}</Txt>
          </View>
        ) : null}
        {conflict ? (
          <View style={{ gap: 8 }}>
            <Notice
              tone="danger"
              text={`Déjà pris ${conflict.day === e.date ? 'ce jour-là' : `le ${labelDayShort(conflict.day)}`} : « ${conflict.event.title} » de ${minutesToLabel(conflict.event.start ?? 0)} à ${minutesToLabel((conflict.event.start ?? 0) + conflict.event.durationMin)}.`}
            />
            {suggestion !== null && conflict.day === e.date ? (
              <Button label={`Décaler à ${minutesToLabel(suggestion)}`} kind="ghost" icon="corner-down-right" onPress={() => patch({ start: suggestion })} />
            ) : null}
          </View>
        ) : null}
      </Field>

      <Field
        label="Rappels"
        hint={notificationsSupported ? undefined : 'Les rappels sonnent uniquement dans l’appli installée sur le téléphone.'}
      >
        {reminders.map((r, i) => (
          <View key={i} style={st.reminderRow}>
            <TextInput
              accessibilityLabel={`Rappel ${i + 1}, durée`}
              keyboardType="number-pad"
              value={String(r.amount)}
              onChangeText={(t) => setReminder(i, { amount: Math.max(1, Math.min(999, parseInt(t.replace(/\D/g, ''), 10) || 1)) })}
              style={[st.input, st.amount]}
              maxLength={3}
            />
            <View style={st.units}>
              {REMINDER_UNITS.map((u) => (
                <Pressable
                  key={u.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: r.unit === u.id }}
                  onPress={() => setReminder(i, { unit: u.id })}
                  style={[st.unit, r.unit === u.id && st.unitOn]}
                >
                  <Txt bold={r.unit === u.id} size={13} color={r.unit === u.id ? colors.ink : colors.muted}>{u.label}</Txt>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Retirer le rappel ${i + 1}`}
              onPress={() => patch({ reminders: reminders.filter((_, j) => j !== i) })}
              style={st.remove}
            >
              <Icon name="x" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ))}
        {reminders.length < MAX_REMINDERS ? (
          <Button
            label={reminders.length ? 'Ajouter un autre rappel' : 'Ajouter un rappel'}
            kind="ghost"
            icon="bell"
            onPress={() => patch({ reminders: [...reminders, reminders.length === 0 ? { amount: 30, unit: 'min' } : { amount: 1, unit: 'j' }] })}
          />
        ) : null}
        {reminders.length > 0 || e.itemEveReminder ? (
          <View style={{ gap: 8, marginTop: 4 }}>
            <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4 }}>Type d'alerte</Txt>
            <View style={st.wrap}>
              {ALERTS.map((a) => (
                <Chip
                  key={a.id}
                  label={a.id === settings.defaultAlert ? `${a.label} (par défaut)` : a.label}
                  selected={(e.alert ?? settings.defaultAlert) === a.id}
                  onPress={() => patch({ alert: a.id === settings.defaultAlert ? undefined : a.id })}
                />
              ))}
            </View>
          </View>
        ) : null}
      </Field>

      <Field label="Domaine">
        <View style={st.wrap}>
          {domains.map((c) => (
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
          placeholder="Adresse, code d'entrée, infos utiles…"
          placeholderTextColor={colors.faint}
          multiline
          style={[st.input, { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }]}
        />
      </Field>
    </Sheet>
  );
}

function TimeRow({ label, value, open, onToggle }: { label: string; value: number; open: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${minutesToLabel(value)}. Choisir sur la roue`}
      onPress={onToggle}
      style={[st.timeRow, open && st.timeBtnOn]}
    >
      <Txt size={15} color={colors.muted} style={{ width: 52 }}>{label}</Txt>
      <Txt bold size={22} style={{ flex: 1 }}>{minutesToLabel(value)}</Txt>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
    </Pressable>
  );
}

function Notice({ tone, text }: { tone: 'warn' | 'danger'; text: string }) {
  const c = tone === 'danger' ? { bg: '#FBE9E5', fg: colors.danger } : { bg: colors.warnSoft, fg: colors.warnDark };
  return (
    <View style={[st.notice, { backgroundColor: c.bg }]}>
      <Icon name="alert-circle" size={18} color={c.fg} />
      <Txt size={14} color={c.fg} style={{ flex: 1, lineHeight: 20 }}>{text}</Txt>
    </View>
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
  inputError: { borderColor: colors.danger, borderWidth: 1.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.m, borderWidth: 1, borderColor: colors.line, padding: 6 },
  stepBtn: { minWidth: TOUCH, height: TOUCH, borderRadius: radius.s, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16,
    borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
  },
  timeBtnOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: radius.m, padding: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: TOUCH },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { width: 64, textAlign: 'center', paddingHorizontal: 6 },
  units: { flex: 1, flexDirection: 'row', backgroundColor: '#EAE7E0', borderRadius: radius.m, padding: 3, gap: 3 },
  unit: { flex: 1, minHeight: 42, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
  unitOn: { backgroundColor: colors.card },
  remove: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
});
