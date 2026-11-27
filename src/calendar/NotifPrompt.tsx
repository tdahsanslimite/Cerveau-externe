// « Pour ne pas oublier » (27 nov., demande de Valentin) : juste après la création d'un créneau sans notification,
// une fenêtre demande s'il en faut une. On reprend un modèle enregistré d'un geste, ou on en crée une
// (moments, son, couleur) qu'on peut enregistrer pour la fois suivante. Rien n'est posé en silence.
import React, { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSettings } from '../settings/SettingsContext';
import { colors, fonts, radius } from '../theme';
import { Button, Field, Sheet, Txt } from '../ui';
import { useCalendar } from './CalendarContext';
import type { AlertKind, Reminder } from './model';
import { newId } from './model';
import { addModel, applyModel, colorLabel, DEFAULT_COLOR, modelSummary, needsPrompt, suggestName } from './notifModels';
import type { NotifModel } from './notifModels';
import { AlertChips, ColorChips, ReminderRows } from './ReminderFields';

interface Ctx {
  /** À appeler juste après avoir enregistré un NOUVEAU créneau : la fenêtre s'ouvre s'il n'a aucune notification. */
  askAfterCreate: (eventId: string) => void;
}

const PromptCtx = createContext<Ctx>({ askAfterCreate: () => {} });
export const useNotifPrompt = () => useContext(PromptCtx);

// Laisse la fiche de création se refermer avant d'ouvrir la fenêtre (jamais deux fenêtres l'une sur l'autre).
const OPEN_DELAY = 450;

export function NotifPromptProvider({ children }: { children: ReactNode }) {
  const [eventId, setEventId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const askAfterCreate = useCallback((id: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setEventId(id), OPEN_DELAY);
  }, []);
  const value = useMemo(() => ({ askAfterCreate }), [askAfterCreate]);
  return (
    <PromptCtx.Provider value={value}>
      {children}
      {eventId ? <PromptSheet key={eventId} eventId={eventId} onClose={() => setEventId(null)} /> : null}
    </PromptCtx.Provider>
  );
}

function PromptSheet({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const { events, saveEvent } = useCalendar();
  const { settings, update } = useSettings();
  const event = events.find((e) => e.id === eventId);
  const models = settings.notifModels ?? [];
  const [creating, setCreating] = useState(models.length === 0);
  const [reminders, setReminders] = useState<Reminder[]>([{ amount: 30, unit: 'min' }]);
  const [alert, setAlert] = useState<AlertKind>(settings.defaultAlert);
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [keep, setKeep] = useState(true);
  const [name, setName] = useState('');

  if (!needsPrompt(event) || !event) return null;

  const applyAndClose = (m: Pick<NotifModel, 'reminders' | 'alert' | 'color'>) => {
    saveEvent(applyModel(event, m));
    onClose();
  };
  const validate = () => {
    if (reminders.length === 0) return;
    const m: NotifModel = { id: newId(), name: name.trim() || suggestName({ reminders, alert, color }), reminders, alert, color };
    if (keep) update({ notifModels: addModel(models, m) });
    applyAndClose(m);
  };

  const footer = creating ? (
    <>
      <Button label="Valider la notification" kind="dark" icon="bell" onPress={validate} style={reminders.length === 0 && { opacity: 0.45 }} />
      {models.length ? <Button label="Revenir à mes notifications" kind="ghost" onPress={() => setCreating(false)} /> : null}
      <Button label="Pas de notification" kind="ghost" onPress={onClose} />
    </>
  ) : (
    <>
      <Button label="Créer une nouvelle notification" kind="ghost" icon="plus" onPress={() => setCreating(true)} />
      <Button label="Pas de notification" kind="ghost" onPress={onClose} />
    </>
  );

  return (
    <Sheet visible onClose={onClose} title="Pour ne pas oublier" footer={footer} closable={false}>
      <Txt size={17}>
        Tu viens de créer <Txt bold size={17}>« {event.title} »</Txt>. Pour ne pas l’oublier, tu veux une notification ?
      </Txt>

      {!creating ? (
        <View style={{ gap: 10 }}>
          {models.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={`${m.name} : ${modelSummary(m)}`}
              onPress={() => applyAndClose(m)}
              style={({ pressed }) => [st.model, { borderLeftColor: m.color }, pressed && { opacity: 0.7 }]}
            >
              <View style={[st.dot, { backgroundColor: m.color }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt bold size={16}>{m.name}</Txt>
                <Txt size={13} color={colors.muted}>{modelSummary(m)}</Txt>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          <Field label="Quand ?">
            <ReminderRows reminders={reminders} onChange={setReminders} />
          </Field>
          <Field label="Son">
            <AlertChips value={alert} onChange={setAlert} />
          </Field>
          <Field label={`Couleur : ${colorLabel(color)}`}>
            <ColorChips value={color} onChange={setColor} />
          </Field>
          <View style={st.keep}>
            <Txt size={15} style={{ flex: 1 }}>Enregistrer pour la prochaine fois</Txt>
            <Switch value={keep} onValueChange={setKeep} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#FFFFFF" />
          </View>
          {keep ? (
            <TextInput
              accessibilityLabel="Nom de la notification"
              placeholder={suggestName({ reminders, alert, color })}
              placeholderTextColor={colors.faint}
              value={name}
              onChangeText={setName}
              style={st.input}
              maxLength={40}
            />
          ) : null}
        </>
      )}
    </Sheet>
  );
}

const st = StyleSheet.create({
  model: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.m, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 6, backgroundColor: colors.card,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  keep: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  input: {
    minHeight: 48, borderRadius: radius.m, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16, color: colors.ink,
  },
});
