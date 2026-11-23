// Pop-up « ta journée » (13 nov., Valentin) : à CHAQUE ouverture de l'appli (lancement ou retour dedans), on voit le jour J
// avant toute autre chose, et on coche au fur et à mesure (ça allège le ménage du lendemain). L'ouverture est gérée par AppTabs. Les rappels de date butoir y viennent en plus : la première fois on les voit simplement,
// dès le lendemain (et chaque jour tant que ce n'est pas fait) ils proposent de programmer la tâche.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { labelDayLong, labelDayShort, minutesToLabel, todayKey } from '../calendar/dates';
import { EditorState, EventEditor } from '../calendar/EventEditor';
import { CalendarEvent, isCheckable, isDoneOn, isRappel, occurrencesOn, pendingRappels, rappelActionable } from '../calendar/model';
import { colors, radius } from '../theme';
import { Button, Icon, Sheet, Txt } from '../ui';
import { byQuadrant } from './model';
import { ProgramSheet, ProgramStart } from './ProgramSheet';
import { useTaskItems } from './useTaskItems';
import { useGoals } from '../goals/GoalsContext';
import { leadingWeekGoal, linesOf, themeInfo } from '../goals/model';

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
  const { years, themePeriods, chosen } = useGoals();
  const week = leadingWeekGoal(years, themePeriods, chosen, today);

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
          <View style={{ gap: 8 }}>
          <Txt bold size={16} color={colors.accentDark}>{labelDayLong(today)}</Txt>

          {/* 23 nov. (Valentin) : la fiche Semaine du thème en tête (celui du One Thing de l'année). */}
          {week ? (
            <View style={st.week}>
              <View style={st.weekHead}>
                <Icon name={themeInfo(week.theme).icon} size={14} color={colors.accentDark} />
                <Txt bold size={12} color={colors.accentDark} style={st.caps}>{`Ma semaine · ${themeInfo(week.theme).label}`}</Txt>
              </View>
              {week.goal ? (
                <>
                  {week.goal.who ? <Txt bold size={15} numberOfLines={2} style={{ lineHeight: 20 }}>{week.goal.who}</Txt> : null}
                  {week.goal.todo ? <WeekLine label="À faire" text={week.goal.todo} /> : null}
                  {week.goal.avoid ? <WeekLine label="À éviter" text={week.goal.avoid} /> : null}
                </>
              ) : (
                <Txt size={13} color={colors.muted}>Pas encore d’objectif cette semaine (module Objectifs).</Txt>
              )}
            </View>
          ) : null}

          {one ? (
            <View style={[st.slim, { backgroundColor: colors.sandSoft, borderColor: colors.sand }]}>
              <Icon name="target" size={16} color={colors.accentDark} />
              <Txt size={12} color={colors.muted}>The One Thing</Txt>
              <Txt bold size={14} numberOfLines={1} style={{ flex: 1 }}>{one.title}</Txt>
            </View>
          ) : null}

          {allDay.map((o) => (
            <View key={o.event.id} style={[st.band, { borderLeftColor: domain(o.event.category).color }]}>
              <Txt size={12} color={colors.muted}>Journée</Txt>
              <Txt bold size={14} numberOfLines={1} style={{ flex: 1 }}>{o.event.title}</Txt>
            </View>
          ))}

          {timed.length ? (
            <View style={st.list}>
              {timed.map((o, i) => {
                const can = isCheckable(o.event);
                const done = can && isDoneOn(o.event, today);
                return (
                  <View key={`${o.event.id}-${o.day}`} style={[st.row, i === timed.length - 1 && { borderBottomWidth: 0 }]}>
                    {can ? (
                      <SmallCheck checked={done} onToggle={() => toggleDone(o.event.id, today)} label={done ? `Décocher ${o.event.title}` : `Cocher ${o.event.title}`} />
                    ) : <View style={{ width: 22 }} />}
                    <Txt bold size={13} color={done ? colors.faint : colors.ink} style={{ width: 42 }}>{minutesToLabel(o.event.start as number)}</Txt>
                    <View style={[st.bar, { backgroundColor: domain(o.event.category).color }]} />
                    <Txt bold size={14} numberOfLines={1} color={done ? colors.faint : colors.ink} style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through' } : null]}>{o.event.title}</Txt>
                  </View>
                );
              })}
            </View>
          ) : !allDay.length ? (
            <Txt size={14} color={colors.muted}>Rien de prévu au calendrier aujourd’hui.</Txt>
          ) : null}

          {rappels.length ? (
            <View style={{ gap: 6 }}>
              <Txt bold size={12} color={colors.warnDark} style={st.caps}>Rappels</Txt>
              {rappels.map((r) => {
                const act = rappelActionable(r, today);
                return (
                  <View key={r.id} style={[st.slim, { borderColor: act ? colors.warn : colors.line }]}>
                    <Icon name="bell" size={16} color={colors.warnDark} />
                    <View style={{ flex: 1 }}>
                      <Txt bold size={14} numberOfLines={1}>{r.title}</Txt>
                      {r.butoir ? <Txt size={12} color={colors.warnDark}>{`Avant le ${labelDayShort(r.butoir)}`}</Txt> : null}
                    </View>
                    {act ? (
                      <>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Programmer ${r.title}`} onPress={() => program(r)} style={({ pressed }) => [st.cta, pressed && { opacity: 0.7 }]}>
                          <Txt bold size={13} color="#FFFFFF">Programmer</Txt>
                        </Pressable>
                        <Pressable accessibilityRole="button" accessibilityLabel={`${r.title} : déjà fait`} onPress={() => saveEvent({ ...r, handled: true })} style={({ pressed }) => [st.ghost, pressed && { opacity: 0.7 }]}>
                          <Txt bold size={13} color={colors.accent}>Fait</Txt>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
          </View>
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

/** Case à cocher fine (22 px), zone de toucher élargie : la journée tient sur un écran. */
function SmallCheck({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onToggle}
      hitSlop={{ top: 9, bottom: 9, left: 12, right: 8 }}
      style={({ pressed }) => [st.check, checked && st.checkOn, pressed && { opacity: 0.6 }]}
    >
      {checked ? <Icon name="check" size={15} color="#FFFFFF" /> : null}
    </Pressable>
  );
}

/** « À faire » / « À éviter » de la semaine sur une ou deux lignes (les tirets du texte deviennent des « · »). */
function WeekLine({ label, text }: { label: string; text: string }) {
  return (
    <Txt size={13} numberOfLines={2} style={{ lineHeight: 18 }}>
      <Txt bold size={13} color={colors.muted}>{`${label} : `}</Txt>
      {linesOf(text).map((l) => l.replace(/^[-•*]\s*/, '')).join(' · ')}
    </Txt>
  );
}

const st = StyleSheet.create({
  caps: { textTransform: 'uppercase', letterSpacing: 0.5 },
  week: { gap: 4, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.l, backgroundColor: colors.accentSoft },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slim: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.m, borderWidth: 1.5, backgroundColor: colors.card },
  band: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderLeftWidth: 4, borderRadius: radius.s, backgroundColor: colors.card },
  list: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, paddingRight: 10, paddingLeft: 10, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  bar: { width: 3, height: 22, borderRadius: 2 },
  cta: { minHeight: 34, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.accent, justifyContent: 'center' },
  ghost: { minHeight: 34, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center' },
});
