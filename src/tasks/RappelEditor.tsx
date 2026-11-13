// Fiche d'un rappel de date butoir, ouverte depuis le calendrier : titre, jour du rappel, date butoir, traité ou non.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { todayKey } from '../calendar/dates';
import type { CalendarEvent } from '../calendar/model';
import { colors, TOUCH } from '../theme';
import { Button, Field, Icon, Sheet, Txt } from '../ui';
import { DayField, DeadlineField, st as fst } from './fields';

export function RappelEditor({ rappel, onClose }: { rappel: CalendarEvent | null; onClose: () => void }) {
  const { saveEvent, deleteEvent } = useCalendar();
  const [r, setR] = useState<CalendarEvent | null>(rappel);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setR(rappel); setConfirm(false); }, [rappel]);
  if (!rappel || !r) return null;
  const patch = (p: Partial<CalendarEvent>) => setR({ ...r, ...p });
  const today = todayKey();
  const ok = r.title.trim().length > 0;
  const min = r.date < today ? r.date : today;

  const footer = (
    <>
      <Button label="Enregistrer" kind="dark" onPress={() => { if (!ok) return; saveEvent({ ...r, title: r.title.trim() }); onClose(); }} style={!ok && { opacity: 0.45 }} />
      {!confirm ? <Button label="Supprimer" kind="danger" icon="trash-2" onPress={() => setConfirm(true)} /> : (
        <View style={{ gap: 8 }}>
          <Button label="Oui, supprimer" kind="danger" onPress={() => { deleteEvent(r.id); onClose(); }} />
          <Button label="Annuler" kind="ghost" onPress={() => setConfirm(false)} />
        </View>
      )}
    </>
  );

  return (
    <Sheet visible onClose={onClose} title="Rappel" footer={footer}>
      <Field label="Titre">
        <TextInput accessibilityLabel="Titre" value={r.title} onChangeText={(title) => patch({ title })} style={fst.input} />
      </Field>
      <Field label="Me le rappeler le">
        <DayField value={r.date} min={min} onChange={(date) => patch({ date, butoir: r.butoir && r.butoir < date ? date : r.butoir })} />
      </Field>
      <Field label="Date butoir" hint="Facultatif.">
        <DeadlineField value={r.butoir} today={today} min={r.date} prefix="À faire avant le" removeLabel="Pas de date butoir" onChange={(butoir) => patch({ butoir })} />
      </Field>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: !!r.handled }} onPress={() => patch({ handled: !r.handled })} style={st.row}>
        <View style={[st.box, r.handled && st.boxOn]}>{r.handled ? <Icon name="check" size={16} color="#FFFFFF" /> : null}</View>
        <Txt size={15} style={{ flex: 1 }}>Tâche programmée (le pop-up ne revient plus)</Txt>
      </Pressable>
    </Sheet>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: TOUCH },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
