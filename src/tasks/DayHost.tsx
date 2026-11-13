// Pop-up « ta journée » (13 nov., Valentin) : à CHAQUE ouverture de l'appli (lancement ou retour dedans), on voit le jour J
// avant toute autre chose, et on coche au fur et à mesure (ça allège le ménage du lendemain). L'ouverture est gérée par AppTabs. Les rappels de date butoir y viennent en plus : la première fois on les voit simplement,
// dès le lendemain (et chaque jour tant que ce n'est pas fait) ils proposent de programmer la tâche.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox } from './components';
import { useCalendar } from '../calendar/CalendarContext';
import { labelDayLong, labelDayShort, minutesToLabel, todayKey } from '../calendar/dates';
import { EditorState, EventEditor } from '../calendar/EventEditor';
import { CalendarEvent, endOf, isCheckable, isDoneOn, isRappel, kindsOf, natureLabel, natureOf, occurrencesOn, pendingRappels, rappelActionable } from '../calendar/model';
import { colors, radius } from '../theme';
import { Button, Icon, Sheet, Txt } from '../ui';
import { byQuadrant } from './model';
import { ProgramSheet, ProgramStart } from './ProgramSheet';
import { useTaskItems } from './useTaskItems';

const kindLabel = (e: CalendarEvent) => {
  const k = kindsOf(e);
  return e.phone ? e.phone.calendarTitle : k.includes('rdv') ? natureLabel(natureOf(e)) : k.includes('objet') ? 'Liste' : 'Tâche';
};

export function DayHost({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { events, loaded, saveEvent, domain, toggleDone } = useCalendar();
  const items = useTaskItems();
  const [today, setToday] = useState(todayKey());
  const [programming, setProgramming] = useState<{ start: ProgramStart; rappel: CalendarEvent } | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);

  // Passage de minuit appli ouverte : le pop-up revient le lendemain.
  useEffect(() => {
    const timer = setInterval(() => setToday(todayKey()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const open = loaded && visible;
  const day = useMemo(() => occurrencesOn(events.filter((e) => !isRappel(e)), today), [events, today]);
  const rappels = useMemo(() => pendingRappels(events, today), [events, today]);
  const one = byQuadrant(items, 'one')[0];

  // Un rappel montré pour la première fois aujourd'hui : il proposera de programmer la tâche dès demain.
  useEffect(() => {
    if (!open) return;
    for (const r of rappels) if (!r.firstSeen) saveEvent({ ...r, firstSeen: today });
  }, [open, rappels, today, saveEvent]);

  const close = onClose;
  const program = (r: CalendarEvent) =>
    setProgramming({
      rappel: r,
      start: {
        title: r.title, type: 'tache', note: r.note, category: r.category,
        items: r.items?.length ? r.items.map((i) => ({ ...i, done: false })) : undefined,
      },
    });

  const allDay = day.filter((o) => o.event.start === null);
  const timed = day.filter((o) => o.event.start !== null);

  return (
    <>
      {open && !programming && !editor ? (
        <Sheet visible onClose={close} title="Ta journée" footer={<Button label="C’est parti" kind="dark" icon="arrow-right" onPress={close} />}>
          <Txt bold size={18} color={colors.accentDark}>{labelDayLong(today)}</Txt>

          {one ? (
            <View style={[st.box, { backgroundColor: colors.sandSoft, borderColor: colors.sand }]}>
              <Icon name="target" size={20} color={colors.accentDark} />
              <View style={{ flex: 1 }}>
                <Txt size={13} color={colors.muted}>The One Thing</Txt>
                <Txt bold size={16}>{one.title}</Txt>
              </View>
            </View>
          ) : null}

          {allDay.map((o) => (
            <View key={o.event.id} style={[st.band, { borderLeftColor: domain(o.event.category).color }]}>
              <Txt size={13} color={colors.muted}>Toute la journée</Txt>
              <Txt bold size={15}>{o.event.title}</Txt>
            </View>
          ))}

          {timed.length ? (
            <View style={st.list}>
              {timed.map((o) => {
                const can = isCheckable(o.event);
                const done = can && isDoneOn(o.event, today);
                return (
                  <View key={`${o.event.id}-${o.day}`} style={st.row}>
                    {can ? (
                      <Checkbox compact checked={done} onToggle={() => toggleDone(o.event.id, today)} label={done ? `Décocher ${o.event.title}` : `Cocher ${o.event.title}`} />
                    ) : <View style={{ width: 8 }} />}
                    <View style={{ width: 52 }}>
                      <Txt bold size={15} color={done ? colors.faint : colors.ink}>{minutesToLabel(o.event.start as number)}</Txt>
                      <Txt size={12} color={colors.faint}>{minutesToLabel(endOf(o.event))}</Txt>
                    </View>
                    <View style={[st.bar, { backgroundColor: domain(o.event.category).color }]} />
                    <View style={{ flex: 1 }}>
                      <Txt bold size={15} color={done ? colors.faint : colors.ink} style={done ? { textDecorationLine: 'line-through' } : undefined}>{o.event.title}</Txt>
                      <Txt size={13} color={colors.muted}>{kindLabel(o.event)}</Txt>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : !allDay.length ? (
            <Txt size={15} color={colors.muted}>Rien de prévu au calendrier aujourd’hui.</Txt>
          ) : null}

          {rappels.length ? (
            <View style={{ gap: 8 }}>
              <Txt bold size={14} color={colors.warnDark}>Rappels</Txt>
              {rappels.map((r) => {
                const act = rappelActionable(r, today);
                return (
                  <View key={r.id} style={[st.box, { borderColor: act ? colors.warn : colors.line }]}>
                    <Icon name="bell" size={20} color={colors.warnDark} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View>
                        <Txt bold size={16}>{r.title}</Txt>
                        {r.butoir ? <Txt size={14} color={colors.warnDark}>À faire avant le {labelDayShort(r.butoir)}</Txt> : null}
                      </View>
                      {act ? (
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          <Pressable accessibilityRole="button" onPress={() => program(r)} style={({ pressed }) => [st.cta, pressed && { opacity: 0.7 }]}>
                            <Icon name="edit-3" size={16} color="#FFFFFF" />
                            <Txt bold size={14} color="#FFFFFF">Programmer la tâche</Txt>
                          </Pressable>
                          <Pressable accessibilityRole="button" onPress={() => saveEvent({ ...r, handled: true })} style={({ pressed }) => [st.ghost, pressed && { opacity: 0.7 }]}>
                            <Txt bold size={14} color={colors.accent}>Déjà fait</Txt>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Sheet>
      ) : null}

      <ProgramSheet
        start={programming?.start ?? null}
        onClose={() => setProgramming(null)}
        onSaved={() => { if (programming) saveEvent({ ...programming.rappel, handled: true }); }}
        onEvent={(event) => { setProgramming(null); setEditor({ event, isNew: true, day: event.date }); }}
      />
      <EventEditor state={editor} onClose={() => setEditor(null)} />
    </>
  );
}

const st = StyleSheet.create({
  box: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: radius.l, borderWidth: 1.5, backgroundColor: colors.card },
  band: { paddingVertical: 8, paddingHorizontal: 12, borderLeftWidth: 4, borderRadius: radius.s, backgroundColor: colors.card },
  list: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingRight: 14, paddingLeft: 4, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.accent },
  ghost: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center' },
});
