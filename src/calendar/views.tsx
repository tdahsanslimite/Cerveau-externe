// Les trois vues du calendrier : Jour, Semaine, Mois.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useDayLoad } from '../load';
import { RoutineChecklist } from '../routines/components';
import { useSettings } from '../settings/SettingsContext';
import { DayTaskRows, DayTasks } from '../tasks/DayTasks';
import { colors, fonts, radius } from '../theme';
import { Card, Icon, SectionLabel, Txt } from '../ui';
import { useCalendar } from './CalendarContext';
import { EmptyState, EventRow, FreeSlotRow, LOAD_COLOR, LoadGauge } from './components';
import { DAY_SHORT, DayKey, fromKey, labelDayShort, monthGrid, relativeLabel, startOfWeek, todayKey, weekDays } from './dates';
import { freeSlots, loadLevel, Occurrence, occurrencesOn } from './model';

export interface ViewProps {
  day: DayKey;
  onEdit: (occ: Occurrence) => void;
  onAdd: (day: DayKey, start?: number) => void;
  onOpenDay: (day: DayKey) => void;
}

// ---------------- JOUR ----------------

export function DayView({ day, onEdit, onAdd }: ViewProps) {
  const { events } = useCalendar();
  const { settings } = useSettings();
  const load = useDayLoad();
  const occs = occurrencesOn(events, day);
  const count = load(day); // événements + tâches prévues
  const allDay = occs.filter((o) => o.event.start === null);
  const timed = occs.filter((o) => o.event.start !== null);
  const level = loadLevel(count, settings.dailyLimit);

  // Fusion chronologique des rendez-vous et des créneaux libres.
  type Row = { kind: 'event'; occ: Occurrence; at: number } | { kind: 'free'; from: number; to: number; at: number };
  const rows: Row[] = [
    ...timed.map((occ) => ({ kind: 'event' as const, occ, at: occ.event.start as number })),
    ...(settings.showFreeSlots ? freeSlots(timed).map((f) => ({ kind: 'free' as const, ...f, at: f.from })) : []),
  ].sort((a, b) => a.at - b.at || (a.kind === 'free' ? 1 : -1));

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ padding: 16 }}>
        <LoadGauge level={level} count={count} limit={settings.dailyLimit} />
      </Card>

      <DayTasks day={day} />

      {allDay.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel>Toute la journée</SectionLabel>
          <Card>{allDay.map((o) => <EventRow key={o.event.id} occ={o} onPress={() => onEdit(o)} />)}</Card>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <SectionLabel>Agenda</SectionLabel>
        <Card>
          {rows.length === 0 ? (
            <EmptyState text="Rien de prévu. Touche + pour ajouter un rendez-vous." />
          ) : (
            rows.map((r) =>
              r.kind === 'event' ? (
                <EventRow key={r.occ.event.id} occ={r.occ} onPress={() => onEdit(r.occ)} />
              ) : (
                <FreeSlotRow key={`free-${r.from}`} from={r.from} to={r.to} onPress={() => onAdd(day, r.from)} />
              ),
            )
          )}
        </Card>
      </View>

      <RoutineChecklist day={day} quiet />
    </View>
  );
}

// ---------------- SEMAINE ----------------

export function WeekView({ day, onEdit, onOpenDay }: ViewProps) {
  const { events, weekNote, setWeekNote } = useCalendar();
  const { settings } = useSettings();
  const load = useDayLoad();
  const today = todayKey();
  const weekStart = startOfWeek(day);

  return (
    <View style={{ gap: 14 }}>
      {weekDays(day).map((d) => {
        const occs = occurrencesOn(events, d);
        const count = load(d);
        const level = loadLevel(count, settings.dailyLimit);
        const isToday = d === today;
        const rel = relativeLabel(d, today);
        return (
          <Card key={d} style={isToday ? { borderColor: colors.accent, borderWidth: 1.5 } : undefined}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir ${labelDayShort(d)}`}
              onPress={() => onOpenDay(d)}
              style={({ pressed }) => [st.weekHead, isToday && { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Txt bold size={16}>{labelDayShort(d)}</Txt>
                {rel ? <Txt size={13} color={colors.accent}>{rel}</Txt> : null}
              </View>
              <View style={st.loadPill}>
                <View style={[st.loadDot, { backgroundColor: count ? LOAD_COLOR[level] : colors.border }]} />
                <Txt size={13} color={level === 'trop' ? colors.danger : colors.muted}>
                  {count}/{settings.dailyLimit}
                </Txt>
              </View>
              <Icon name="chevron-right" size={18} color={colors.faint} />
            </Pressable>
            {occs.map((o) => <EventRow key={o.event.id} occ={o} compact onPress={() => onEdit(o)} />)}
            <DayTaskRows day={d} />
          </Card>
        );
      })}

      <WeekNotes key={weekStart} initial={weekNote(weekStart)} onChange={(t) => setWeekNote(weekStart, t)} />
    </View>
  );
}

/** Page libre de la semaine, façon feuille lignée de l'agenda papier. */
function WeekNotes({ initial, onChange }: { initial: string; onChange: (t: string) => void }) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    const t = setTimeout(() => text !== initial && onChange(text), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <View style={st.paper}>
      <Txt bold>Page libre de la semaine</Txt>
      <TextInput
        accessibilityLabel="Page libre de la semaine"
        multiline
        value={text}
        onChangeText={setText}
        placeholder="Idées, choses à ne pas oublier, vrac…"
        placeholderTextColor={colors.faint}
        style={st.paperInput}
        textAlignVertical="top"
      />
    </View>
  );
}

// ---------------- MOIS ----------------

export function MonthView({ day, onEdit, onOpenDay, onSelect }: ViewProps & { onSelect: (d: DayKey) => void }) {
  const { events, domain } = useCalendar();
  const { settings } = useSettings();
  const load = useDayLoad();
  const today = todayKey();
  const cells = monthGrid(day);
  const selectedOccs = occurrencesOn(events, day);

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ padding: 10, gap: 6 }}>
        <View style={st.gridRow}>
          {DAY_SHORT.map((d) => (
            <Txt key={d} size={12} color={colors.muted} style={st.gridHead}>{d.charAt(0)}</Txt>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, w) => (
          <View key={w} style={st.gridRow}>
            {cells.slice(w * 7, w * 7 + 7).map((c) => {
              const occs = occurrencesOn(events, c.key);
              const cats = Array.from(new Set(occs.map((o) => o.event.category))).slice(0, 3);
              const selected = c.key === day;
              const isToday = c.key === today;
              const over = load(c.key) > settings.dailyLimit;
              return (
                <Pressable
                  key={c.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${labelDayShort(c.key)}, ${load(c.key)} éléments`}
                  onPress={() => (selected ? onOpenDay(c.key) : onSelect(c.key))}
                  style={[
                    st.cell,
                    !c.inMonth && { opacity: 0.35 },
                    isToday && !selected && { borderColor: colors.accent, borderWidth: 1.5 },
                    selected && { backgroundColor: colors.accent },
                  ]}
                >
                  <Txt bold size={14} color={selected ? '#FFFFFF' : colors.ink}>{fromKey(c.key).getDate()}</Txt>
                  <View style={st.dots}>
                    {cats.map((cat) => (
                      <View key={cat} style={[st.dot, { backgroundColor: selected ? '#FFFFFF' : domain(cat).color }]} />
                    ))}
                  </View>
                  {over ? <View style={[st.overBar, { backgroundColor: selected ? '#FFFFFF' : colors.danger }]} /> : <View style={st.overBar} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>

      <Legend />

      <View style={{ gap: 8 }}>
        <SectionLabel
          right={
            <Pressable accessibilityRole="button" onPress={() => onOpenDay(day)} hitSlop={8} style={st.linkBtn}>
              <Txt bold size={14} color={colors.accent}>Ouvrir la journée</Txt>
            </Pressable>
          }
        >
          {labelDayShort(day)}
        </SectionLabel>
        <Card>
          {selectedOccs.length === 0 ? (
            <EmptyState text="Rien ce jour-là." />
          ) : (
            selectedOccs.map((o) => <EventRow key={o.event.id} occ={o} onPress={() => onEdit(o)} />)
          )}
        </Card>
      </View>
    </View>
  );
}

function Legend() {
  const { domains } = useCalendar();
  return (
    <View style={st.legend}>
      {domains.map((c) => (
        <View key={c.id} style={st.legendItem}>
          <View style={[st.dot, { width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }]} />
          <Txt size={13} color={colors.muted}>{c.label}</Txt>
        </View>
      ))}
      <View style={st.legendItem}>
        <View style={[st.overBar, { width: 16, backgroundColor: colors.danger }]} />
        <Txt size={13} color={colors.muted}>Au-dessus de ta limite</Txt>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  loadPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loadDot: { width: 10, height: 10, borderRadius: 5 },
  paper: { backgroundColor: colors.paper, borderRadius: radius.l, borderWidth: 1, borderColor: '#E8DFC4', padding: 16, gap: 8 },
  paperInput: { minHeight: 168, fontFamily: fonts.regular, fontSize: 15, lineHeight: 28, color: colors.ink, padding: 0 },
  gridRow: { flexDirection: 'row', gap: 4 },
  gridHead: { flex: 1, textAlign: 'center' },
  cell: {
    flex: 1, height: 56, borderRadius: radius.s, backgroundColor: '#F7F5F0', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 6, paddingBottom: 5,
  },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  overBar: { width: '60%', height: 3, borderRadius: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkBtn: { minHeight: 36, justifyContent: 'center' },
});
