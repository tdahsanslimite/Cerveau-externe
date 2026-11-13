// Pop-up des rappels de date butoir (13 nov., Valentin) : à partir du jour du rappel, il s'ouvre une fois par jour
// (dès que l'appli est ouverte) tant que la tâche n'est pas programmée. Un seul à la fois, sans compteur :
// le suivant apparaît quand on a fermé celui-ci. « Programmer la tâche » ouvre Programmer avec le titre et le contenu repris.
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { labelDayLong, todayKey } from '../calendar/dates';
import { EditorState, EventEditor } from '../calendar/EventEditor';
import { CalendarEvent, rappelToShow } from '../calendar/model';
import { colors, radius } from '../theme';
import { Button, Icon, Sheet, Txt } from '../ui';
import { ProgramSheet, ProgramStart } from './ProgramSheet';

export function RappelHost() {
  const { events, loaded, saveEvent } = useCalendar();
  const [today, setToday] = useState(todayKey());
  const [programming, setProgramming] = useState<{ start: ProgramStart; rappel: CalendarEvent } | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);

  // Passage de minuit appli ouverte : le pop-up revient le lendemain.
  useEffect(() => {
    const timer = setInterval(() => setToday(todayKey()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const r = loaded && !programming && !editor ? rappelToShow(events, today) : null;

  const dismiss = (x: CalendarEvent) => saveEvent({ ...x, shownDay: today });
  const program = (x: CalendarEvent) =>
    setProgramming({
      rappel: x,
      start: {
        title: x.title, type: 'tache', note: x.note, category: x.category,
        items: x.items?.length ? x.items.map((i) => ({ ...i, done: false })) : undefined,
      },
    });

  return (
    <>
      {r ? (
        <Sheet
          visible
          onClose={() => dismiss(r)}
          title="Rappel"
          footer={
            <>
              <Button label="Programmer la tâche" kind="dark" icon="edit-3" onPress={() => program(r)} />
              <Button label="C’est déjà fait" kind="ghost" icon="check" onPress={() => saveEvent({ ...r, handled: true, shownDay: today })} />
            </>
          }
        >
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            <View style={{ width: 52, height: 52, borderRadius: radius.l, backgroundColor: colors.sandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bell" size={26} color={colors.accentDark} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt bold size={22}>{r.title}</Txt>
              {r.butoir ? <Txt bold size={16} color={colors.warnDark}>À faire avant le {labelDayLong(r.butoir).toLowerCase()}</Txt> : null}
              {r.note ? <Txt size={15} color={colors.muted}>{r.note}</Txt> : null}
              {r.items?.length ? <Txt size={15} color={colors.muted}>{r.items.map((i) => i.text).join(' · ')}</Txt> : null}
            </View>
          </View>
          <Txt size={15} style={{ lineHeight: 22 }}>
            Programme-la maintenant : choisis sa priorité, et si elle est urgente et importante, mets-la au calendrier.
          </Txt>
        </Sheet>
      ) : null}

      <ProgramSheet
        start={programming?.start ?? null}
        onClose={() => setProgramming(null)}
        onSaved={() => { if (programming) saveEvent({ ...programming.rappel, handled: true, shownDay: today }); }}
        onEvent={(event) => { setProgramming(null); setEditor({ event, isNew: true, day: event.date }); }}
      />
      <EventEditor state={editor} onClose={() => setEditor(null)} />
    </>
  );
}
