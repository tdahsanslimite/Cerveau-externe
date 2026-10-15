// Écran principal du module Routines : le jour choisi, ses routines à cocher, le bilan à la demande.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Button, Card, Icon, IconButton, SectionLabel, Txt } from '../ui';
import { addDays, DAY_SHORT, DayKey, fromKey, isoWeek, labelDayLong, labelWeekRange, relativeLabel, startOfWeek, todayKey, weekDays } from '../calendar/dates';
import { BilanSheet } from './BilanSheet';
import { RoutineChecklist } from './components';
import { blankRoutine, RoutineEditor, RoutineEditorState } from './RoutineEditor';
import { useRoutines } from './RoutinesContext';
import { daysLabel, isActive, isDue, Routine } from './model';

export function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const { routines } = useRoutines();
  const [day, setDay] = useState<DayKey>(todayKey());
  const [editor, setEditor] = useState<RoutineEditorState | null>(null);
  const [bilanOpen, setBilanOpen] = useState(false);

  const today = todayKey();
  const isCurrentWeek = startOfWeek(day) === startOfWeek(today);
  const onEdit = (routine: Routine) => setEditor({ routine, isNew: false });
  const onAdd = () => setEditor({ routine: blankRoutine(day), isNew: true });

  // Routines qui existent ce jour-là mais ne sont pas au programme (ex. « Sport » un mardi) :
  // on les garde accessibles pour pouvoir les modifier ou les retirer.
  const resting = routines.filter((r) => isActive(r, day) && !isDue(r, day));

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {relativeLabel(day, today) ?? `Semaine ${isoWeek(day)}`}
          </Txt>
          <Txt bold size={24} numberOfLines={1}>{labelDayLong(day)}</Txt>
        </View>
        {day !== today ? (
          <Pressable accessibilityRole="button" onPress={() => setDay(today)} style={st.todayBtn}>
            <Txt bold size={14} color={colors.accent}>Aujourd'hui</Txt>
          </Pressable>
        ) : null}
      </View>

      <View style={st.navRow}>
        <IconButton icon="chevron-left" label="Semaine précédente" onPress={() => setDay((d) => addDays(d, -7))} />
        <Txt bold size={15} color={isCurrentWeek ? colors.ink : colors.muted} style={{ flex: 1, textAlign: 'center' }}>
          {labelWeekRange(day)}
        </Txt>
        <IconButton icon="chevron-right" label="Semaine suivante" onPress={() => setDay((d) => addDays(d, 7))} />
      </View>

      <View style={st.strip} accessibilityRole="tablist">
        {weekDays(day).map((d, i) => {
          const selected = d === day;
          const isToday = d === today;
          return (
            <Pressable
              key={d}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={labelDayLong(d)}
              onPress={() => setDay(d)}
              style={[st.stripDay, isToday && !selected && { borderColor: colors.accent, borderWidth: 1.5 }, selected && { backgroundColor: colors.accent }]}
            >
              <Txt size={12} color={selected ? '#FFFFFF' : colors.muted}>{DAY_SHORT[i].charAt(0)}</Txt>
              <Txt bold size={16} color={selected ? '#FFFFFF' : colors.ink}>{fromKey(d).getDate()}</Txt>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: 110 }]} keyboardShouldPersistTaps="handled">
        {routines.length === 0 ? (
          <Card style={{ padding: 18, gap: 12 }}>
            <Txt bold size={17}>Une routine, c'est une petite action qui revient.</Txt>
            <Txt size={14} color={colors.muted} style={{ lineHeight: 21 }}>
              Ex. boire un verre d'eau, 10 minutes de sport, préparer le sac. Tu choisis les jours : elle revient toute seule, mois après mois.
            </Txt>
            <Button label="Ajouter ma première routine" icon="plus" kind="dark" onPress={onAdd} />
          </Card>
        ) : (
          <>
            <RoutineChecklist day={day} onEdit={onEdit} />

            {resting.length > 0 ? (
              <View style={{ gap: 8 }}>
                <SectionLabel>Pas au programme ce jour</SectionLabel>
                <Card>
                  {resting.map((r) => (
                    <Pressable
                      key={r.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Modifier ${r.title}`}
                      onPress={() => onEdit(r)}
                      style={({ pressed }) => [st.restRow, pressed && { backgroundColor: colors.lineSoft }]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt size={15} color={colors.muted}>{r.title}</Txt>
                        <Txt size={13} color={colors.faint}>{daysLabel(r.days)}</Txt>
                      </View>
                      <Icon name="chevron-right" size={18} color={colors.faint} />
                    </Pressable>
                  ))}
                </Card>
              </View>
            ) : null}

            <Button label="Voir mon bilan" icon="bar-chart-2" kind="ghost" onPress={() => setBilanOpen(true)} />
          </>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter une routine"
        onPress={onAdd}
        style={({ pressed }) => [st.fab, pressed && { opacity: 0.85 }]}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
        <Txt bold size={15} color="#FFFFFF">Routine</Txt>
      </Pressable>

      <RoutineEditor state={editor} onClose={() => setEditor(null)} />
      <BilanSheet visible={bilanOpen} onClose={() => setBilanOpen(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  todayBtn: { minHeight: 44, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.accentSoft, justifyContent: 'center' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  strip: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 14 },
  stripDay: {
    flex: 1, minHeight: 60, borderRadius: radius.m, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  content: { paddingHorizontal: 16, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  fab: {
    position: 'absolute', right: 18, bottom: 24, height: 56, paddingHorizontal: 20, borderRadius: 28, backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: colors.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
