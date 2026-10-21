// Écran principal du module Calendrier : en-tête, navigation, vue active, bouton +.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarView, useSettings } from '../settings/SettingsContext';
import { SettingsSheet } from '../settings/SettingsSheet';
import { HoursBilan } from './HoursBilan';
import { colors, radius } from '../theme';
import { Icon, IconButton, Txt } from '../ui';
import { addDays, addMonths, DayKey, fromKey, isoWeek, labelDayLong, labelMonth, labelWeekRange, relativeLabel, startOfWeek, todayKey } from './dates';
import { useCalendar } from './CalendarContext';
import { blankEvent, EditorState, EventEditor } from './EventEditor';
import { Occurrence } from './model';
import { DayView, MonthView, WeekView } from './views';
import { labelQuarter, QuarterView, quarterOf, WeekStrip, YearView } from './longViews';

// Libellés courts : 5 vues doivent tenir sur la largeur d'un téléphone. Le nom complet est lu par l'accessibilité.
const TABS: { id: CalendarView; label: string; full: string }[] = [
  { id: 'jour', label: 'Jour', full: 'Jour' },
  { id: 'semaine', label: 'Sem.', full: 'Semaine' },
  { id: 'mois', label: 'Mois', full: 'Mois' },
  { id: 'trimestre', label: 'Trim.', full: 'Trimestre' },
  { id: 'annee', label: 'Année', full: 'Année' },
];

export function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { domains } = useCalendar();
  const [view, setView] = useState<CalendarView>(settings.startView);
  const [day, setDay] = useState<DayKey>(todayKey());
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bilanOpen, setBilanOpen] = useState(false);

  const today = todayKey();
  const step = (dir: 1 | -1) =>
    setDay((d) => {
      switch (view) {
        case 'jour': return addDays(d, dir);
        case 'semaine': return addDays(d, 7 * dir);
        case 'mois': return addMonths(d, dir);
        case 'trimestre': return addMonths(d, 3 * dir);
        case 'annee': return addMonths(d, 12 * dir);
      }
    });

  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  const isCurrent =
    view === 'jour' ? day === today
      : view === 'semaine' ? startOfWeek(day) === startOfWeek(today)
        : view === 'mois' ? day.slice(0, 7) === today.slice(0, 7)
          : view === 'trimestre' ? sameYear && quarterOf(day) === quarterOf(today)
            : sameYear;

  const [kicker, title] =
    view === 'jour'
      ? [relativeLabel(day, today) ?? String(fromKey(day).getFullYear()), labelDayLong(day)]
      : view === 'semaine'
        ? [`Semaine ${isoWeek(day)}`, labelWeekRange(day)]
        : view === 'mois'
          ? ['Vue mensuelle', labelMonth(day)]
          : view === 'trimestre'
            ? [`Trimestre ${quarterOf(day)}`, labelQuarter(day)]
            : ['Vue annuelle', String(fromKey(day).getFullYear())];

  const onEdit = (occ: Occurrence) => setEditor({ event: occ.event, isNew: false, day: occ.day });
  const onAdd = (d: DayKey, start?: number) =>
    setEditor({ event: blankEvent(d, start ?? 9 * 60, domains[0]?.id), isNew: true, day: d });
  const onOpenDay = (d: DayKey) => {
    setDay(d);
    setView('jour');
  };
  const viewProps = { day, onEdit, onAdd, onOpenDay };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{kicker}</Txt>
          <Txt bold size={24} numberOfLines={1}>{title}</Txt>
        </View>
        {!isCurrent ? (
          <Pressable accessibilityRole="button" onPress={() => setDay(today)} style={st.todayBtn}>
            <Txt bold size={14} color={colors.accent}>Aujourd'hui</Txt>
          </Pressable>
        ) : null}
        <IconButton icon="bar-chart-2" label="Bilan des heures" onPress={() => setBilanOpen(true)} />
        <IconButton icon="sliders" label="Réglages" onPress={() => setSettingsOpen(true)} />
      </View>

      <View style={st.navRow}>
        <IconButton icon="chevron-left" label="Période précédente" onPress={() => step(-1)} />
        <View style={st.segmented} accessibilityRole="tablist">
          {TABS.map((t) => {
            const on = view === t.id;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="tab"
                accessibilityLabel={t.full}
                accessibilityState={{ selected: on }}
                onPress={() => setView(t.id)}
                style={[st.segment, on && st.segmentOn]}
              >
                <Txt bold={on} size={13} color={on ? colors.ink : colors.muted} numberOfLines={1}>{t.label}</Txt>
              </Pressable>
            );
          })}
        </View>
        <IconButton icon="chevron-right" label="Période suivante" onPress={() => step(1)} />
      </View>

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: 110 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {view === 'jour' && (
          <>
            <DayView {...viewProps} />
            <WeekStrip day={day} onSelect={setDay} />
          </>
        )}
        {view === 'semaine' && <WeekView {...viewProps} />}
        {view === 'mois' && <MonthView {...viewProps} onSelect={setDay} />}
        {view === 'trimestre' && <QuarterView day={day} onOpenDay={onOpenDay} />}
        {view === 'annee' && <YearView day={day} onOpenMonth={(m) => { setDay(m.slice(0, 7) === today.slice(0, 7) ? today : m); setView('mois'); }} />}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter un événement"
        onPress={() => onAdd(day)}
        style={({ pressed }) => [st.fab, { bottom: 24 + insets.bottom }, pressed && { opacity: 0.85 }]}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
        <Txt bold size={15} color="#FFFFFF">Ajouter</Txt>
      </Pressable>

      <EventEditor state={editor} onClose={() => setEditor(null)} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HoursBilan visible={bilanOpen} onClose={() => setBilanOpen(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  todayBtn: { minHeight: 44, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.accentSoft, justifyContent: 'center' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  segmented: { flex: 1, flexDirection: 'row', backgroundColor: '#EAE7E0', borderRadius: radius.m, padding: 3, gap: 2 },
  segment: { flex: 1, minHeight: 40, paddingHorizontal: 2, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  content: { paddingHorizontal: 16, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  fab: {
    position: 'absolute', right: 18, height: 56, paddingHorizontal: 20, borderRadius: 28, backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: colors.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
