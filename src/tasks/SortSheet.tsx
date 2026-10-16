// Tri guidé du sas : un élément à la fois, deux questions simples (important ? urgent ?),
// et « pour quand ? » seulement s'il n'a pas déjà un créneau dans le calendrier.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { labelDayShort, minutesToLabel, relativeLabel, todayKey } from '../calendar/dates';
import { useDayLoad } from '../load';
import { useSettings } from '../settings/SettingsContext';
import { colors, radius } from '../theme';
import { Button, Card, Icon, Sheet, Txt } from '../ui';
import { inSas, quadrantInfo, quadrantOf, sortEvent, sortTask, TaskItem, WhenChoice, whenToDay } from './model';
import { useTasks } from './TasksContext';
import { useTaskItems } from './useTaskItems';

export function SortSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { tasks, save } = useTasks();
  const { events, saveEvent } = useCalendar();
  const items = useTaskItems();
  const { settings } = useSettings();
  const load = useDayLoad();
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [important, setImportant] = useState<boolean | null>(null);
  const [urgent, setUrgent] = useState<boolean | null>(null);

  // À l'ouverture, on fige la liste du sas : le tri avance sans que la liste bouge sous les doigts.
  useEffect(() => {
    if (!visible) return;
    setQueue(inSas(items).map((i) => i.key));
    setPos(0);
    setImportant(null);
    setUrgent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const next = () => {
    setPos((p) => p + 1);
    setImportant(null);
    setUrgent(null);
  };

  const current: TaskItem | undefined = items.find((i) => i.key === queue[pos]);
  const finished = pos >= queue.length || !current;
  const today = todayKey();
  const todayFull = load(today) >= settings.dailyLimit;

  const task = current?.source === 'task' ? tasks.find((t) => t.id === current.id) : undefined;
  const event = current?.source === 'event' ? events.find((e) => e.id === current.id) : undefined;

  /** Réponse à « urgent ? ». Un événement du calendrier a déjà son créneau : on l'enregistre et on passe au suivant. */
  const answerUrgent = (value: boolean) => {
    if (event && important !== null) {
      saveEvent(sortEvent(event, important, value));
      next();
      return;
    }
    setUrgent(value);
  };

  const place = (day: ReturnType<typeof whenToDay>) => {
    if (!task || important === null || urgent === null) return;
    save(sortTask(task, important, urgent, day));
    next();
  };
  const when = (choice: WhenChoice) => place(whenToDay(choice, today));
  const drop = () => {
    if (!task || important === null || urgent === null) return;
    save({ ...sortTask(task, important, urgent, null), status: 'dropped' });
    next();
  };

  const q = important !== null && urgent !== null ? quadrantOf({ important, urgent }) : null;
  const step = important === null ? 1 : urgent === null ? 2 : 3;

  const title = finished ? 'Tri terminé' : `Tri du sas · ${pos + 1} sur ${queue.length}`;

  // Où se trouve déjà l'élément : sert à ne pas redemander un jour qu'on connaît.
  const where = current?.day
    ? [relativeLabel(current.day) ?? labelDayShort(current.day), current.start === null ? null : `${minutesToLabel(current.start)}–${minutesToLabel(current.start + current.durationMin)}`]
        .filter(Boolean).join(' · ')
    : null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        finished ? (
          <Button label="Fermer" kind="dark" onPress={onClose} />
        ) : (
          <>
            {step > 1 ? (
              <Button
                label="Retour"
                kind="ghost"
                icon="arrow-left"
                onPress={() => (step === 3 ? setUrgent(null) : setImportant(null))}
              />
            ) : null}
            <Button label="Passer, je déciderai plus tard" kind="ghost" onPress={next} />
          </>
        )
      }
    >
      {finished ? (
        <Card style={st.done}>
          <Icon name="check-circle" size={28} color={colors.ok} />
          <Txt bold size={18}>{queue.length === 0 ? 'Le sas est vide.' : 'Plus rien à trier pour l’instant.'}</Txt>
          <Txt size={14} color={colors.muted} style={{ textAlign: 'center', lineHeight: 20 }}>
            {queue.length === 0 ? 'Dépose ce qui te passe par la tête, on triera quand tu voudras.' : 'Ce que tu as passé reste dans le sas, sans pression.'}
          </Txt>
        </Card>
      ) : (
        <>
          <Card style={st.taskCard}>
            <Txt bold size={20} style={{ lineHeight: 27 }}>{current.title}</Txt>
            {where ? (
              <View style={st.where}>
                <Icon name="calendar" size={14} color={colors.muted} />
                <Txt size={13} color={colors.muted}>{where}</Txt>
              </View>
            ) : null}
          </Card>

          {step === 1 && (
            <Question text="C’est important ?" hint="Ça compte pour toi, ta santé, ta famille ou ton travail.">
              <Button label="Oui" kind="dark" onPress={() => setImportant(true)} />
              <Button label="Non" kind="ghost" onPress={() => setImportant(false)} />
            </Question>
          )}

          {step === 2 && (
            <Question text="C’est urgent ?" hint="Une échéance proche, ou quelqu’un qui attend.">
              <Button label="Oui" kind="dark" onPress={() => answerUrgent(true)} />
              <Button label="Non" kind="ghost" onPress={() => answerUrgent(false)} />
            </Question>
          )}

          {step === 3 && q && (
            <Question
              text="Pour quand ?"
              hint={`Rangée dans « ${quadrantInfo(q).label} ».${todayFull ? ' Aujourd’hui est déjà à ta limite.' : ''}`}
            >
              {task?.day ? <Button label={`Garder ${where}`} kind="dark" onPress={() => place(task.day)} /> : null}
              <Button label="Aujourd’hui" kind={todayFull || task?.day ? 'ghost' : 'dark'} onPress={() => when('aujourdhui')} />
              <Button label="Demain" kind="ghost" onPress={() => when('demain')} />
              <Button label="Un jour, sans date" kind="ghost" onPress={() => when('un-jour')} />
              {q === 'lacher' ? <Button label="Finalement, je lâche" kind="danger" icon="wind" onPress={drop} /> : null}
            </Question>
          )}
        </>
      )}
    </Sheet>
  );
}

function Question({ text, hint, children }: { text: string; hint: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Txt bold size={22}>{text}</Txt>
        <Txt size={14} color={colors.muted} style={{ lineHeight: 20 }}>{hint}</Txt>
      </View>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

const st = StyleSheet.create({
  taskCard: { padding: 18, backgroundColor: colors.card, gap: 8 },
  where: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  done: { padding: 24, alignItems: 'center', gap: 10, borderRadius: radius.l },
});
