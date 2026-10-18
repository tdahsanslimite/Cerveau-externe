// Fiches de l'onglet Idées : modifier une idée, créer / modifier une liste, régler le rappel de tri.
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { TimeWheel } from '../calendar/TimeWheel';
import { notificationsSupported, ensureNotifications, openAppSettings } from '../calendar/notifications';
import { colors, fonts, radius } from '../theme';
import { Button, Chip, Field, Sheet, Txt } from '../ui';
import { useIdeas } from './IdeasContext';
import { IdeaItem, IdeasReminder, LIST_SUGGESTIONS, reminderLabel, ReminderMode, VRAC_ID, WEEKDAYS_LONG } from './model';

/** Idée : changer le texte, la ranger dans une liste, ou la supprimer. */
export function ItemSheet({ item, onClose }: { item: IdeaItem | null; onClose: () => void }) {
  const { lists, update, remove } = useIdeas();
  const [title, setTitle] = useState(item?.title ?? '');
  const [listId, setListId] = useState(item?.listId ?? VRAC_ID);

  useEffect(() => {
    setTitle(item?.title ?? '');
    setListId(item?.listId ?? VRAC_ID);
  }, [item]);

  if (!item) return null;
  const canSave = title.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    update(item.id, { title, listId });
    onClose();
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title="Cette idée"
      footer={
        <>
          <Button label="Enregistrer" kind="dark" onPress={save} style={!canSave && { opacity: 0.4 }} />
          <Button label="Supprimer" kind="danger" icon="trash-2" onPress={() => { remove(item.id); onClose(); }} />
        </>
      }
    >
      <Field label="Texte">
        <TextInput
          accessibilityLabel="Texte de l'idée"
          value={title}
          onChangeText={setTitle}
          multiline
          placeholderTextColor={colors.faint}
          style={[st.input, { minHeight: 72, paddingTop: 12, textAlignVertical: 'top' }]}
        />
      </Field>
      <Field label="Dans la liste" hint="Trier, c'est simplement la ranger au bon endroit.">
        <View style={st.wrap}>
          {lists.map((l) => (
            <Chip key={l.id} label={l.title} selected={listId === l.id} onPress={() => setListId(l.id)} />
          ))}
        </View>
      </Field>
    </Sheet>
  );
}

export interface ListSheetState {
  /** Liste à modifier, ou null pour en créer une nouvelle. */
  listId: string | null;
}

/** Liste : créer (avec des idées de noms), renommer, supprimer. */
export function ListSheet({ state, onClose, onCreated }: {
  state: ListSheetState | null; onClose: () => void; onCreated: (id: string) => void;
}) {
  const { lists, createList, rename, deleteList, items } = useIdeas();
  const editing = state?.listId ? lists.find((l) => l.id === state.listId) ?? null : null;
  const [title, setTitle] = useState(editing?.title ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTitle(editing?.title ?? '');
    setConfirmDelete(false);
  }, [state, editing?.title]);

  if (!state) return null;
  const isNew = !editing;
  const clean = title.trim();
  const taken = lists.some((l) => l.id !== editing?.id && l.title.toLowerCase() === clean.toLowerCase());
  const canSave = clean.length > 0 && !taken;
  const inList = editing ? items.filter((i) => i.listId === editing.id).length : 0;
  const suggestions = LIST_SUGGESTIONS.filter((s) => !lists.some((l) => l.title.toLowerCase() === s.toLowerCase()));

  const save = () => {
    if (!canSave) return;
    if (editing) rename(editing.id, clean);
    else {
      const id = createList(clean);
      if (id) onCreated(id);
    }
    onClose();
  };

  const footer = (
    <>
      <Button label={isNew ? 'Créer la liste' : 'Enregistrer'} kind="dark" onPress={save} style={!canSave && { opacity: 0.4 }} />
      {editing && editing.id !== VRAC_ID && !confirmDelete && (
        <Button label="Supprimer cette liste" kind="danger" icon="trash-2" onPress={() => setConfirmDelete(true)} />
      )}
      {editing && confirmDelete && (
        <View style={{ gap: 8 }}>
          <Txt size={14} color={colors.muted} style={{ lineHeight: 20 }}>
            {inList > 0
              ? `Les ${inList} éléments de cette liste retournent dans « En vrac » : rien n'est perdu.`
              : 'Cette liste est vide.'}
          </Txt>
          <Button label="Oui, la supprimer" kind="danger" onPress={() => { deleteList(editing.id); onClose(); }} />
          <Button label="Annuler" kind="ghost" onPress={() => setConfirmDelete(false)} />
        </View>
      )}
    </>
  );

  return (
    <Sheet visible onClose={onClose} title={isNew ? 'Nouvelle liste' : 'Modifier la liste'} footer={footer}>
      <Field label="Nom de la liste" hint={taken ? 'Tu as déjà une liste avec ce nom.' : undefined}>
        <TextInput
          accessibilityLabel="Nom de la liste"
          value={title}
          onChangeText={setTitle}
          placeholder="Ex. Vidéos, Courses…"
          placeholderTextColor={colors.faint}
          autoFocus={isNew}
          returnKeyType="done"
          onSubmitEditing={save}
          style={st.input}
        />
      </Field>
      {isNew && suggestions.length > 0 ? (
        <Field label="Idées de listes">
          <View style={st.wrap}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} selected={clean.toLowerCase() === s.toLowerCase()} onPress={() => setTitle(s)} />
            ))}
          </View>
        </Field>
      ) : null}
    </Sheet>
  );
}

const MODES: { id: ReminderMode; label: string }[] = [
  { id: 'off', label: 'Aucun' },
  { id: 'daily', label: 'Chaque jour' },
  { id: 'weekly', label: 'Chaque semaine' },
];

/** Rappel de tri : aucun, chaque jour ou chaque semaine, à l'heure choisie. */
export function ReminderSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { reminder, setReminder } = useIdeas();
  const [denied, setDenied] = useState(false);

  const change = (patch: Partial<IdeasReminder>) => {
    const next = { ...reminder, ...patch };
    setReminder(next);
    setDenied(false);
    // On demande l'autorisation tout de suite : mieux vaut le savoir maintenant que le jour du rappel.
    if (next.mode !== 'off' && notificationsSupported) void ensureNotifications().then((ok) => setDenied(!ok));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Rappel pour trier">
      <Txt size={14} color={colors.muted} style={{ lineHeight: 21 }}>
        Une notification te rappelle de venir vider ou trier ta liste, quand tu as décidé que c'était le bon moment.
      </Txt>

      <Field label="Fréquence">
        <View style={st.wrap}>
          {MODES.map((m) => (
            <Chip key={m.id} label={m.label} selected={reminder.mode === m.id} onPress={() => change({ mode: m.id })} />
          ))}
        </View>
      </Field>

      {reminder.mode === 'weekly' ? (
        <Field label="Jour">
          <View style={st.wrap}>
            {WEEKDAYS_LONG.map((d, i) => (
              <Chip key={d} label={d.charAt(0).toUpperCase() + d.slice(1)} selected={reminder.weekday === i} onPress={() => change({ weekday: i })} />
            ))}
          </View>
        </Field>
      ) : null}

      {reminder.mode !== 'off' ? (
        <Field label="Heure">
          <TimeWheel value={reminder.minutes} onChange={(minutes) => change({ minutes })} />
        </Field>
      ) : null}

      <Txt bold size={15} color={colors.accentDark}>{reminderLabel(reminder)}</Txt>

      {!notificationsSupported && reminder.mode !== 'off' ? (
        <Txt size={14} color={colors.muted}>Le rappel sonne uniquement dans l'appli installée sur le téléphone.</Txt>
      ) : null}
      {denied ? (
        <View style={{ gap: 8 }}>
          <Txt size={14} color={colors.danger} style={{ lineHeight: 20 }}>
            Les notifications sont refusées : le rappel ne sonnera pas tant que tu ne les autorises pas.
          </Txt>
          <Button label="Autoriser dans les réglages Android" kind="dark" onPress={openAppSettings} />
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
