// Écran « Trier mes idées » : on note une idée par son titre, une fenêtre aide à la développer, la classer et la prioriser,
// puis les idées vivent dans 4 listes (urgent et important / urgent / important / abandonner).
// Appui long sur une idée = on la déplace d'une liste à l'autre, ou plus haut / plus bas dans sa liste.
import React, { useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalendar } from '../calendar/CalendarContext';
import { EmptyState } from '../calendar/components';
import { labelDayLong, todayKey } from '../calendar/dates';
import { EditorState, EventEditor } from '../calendar/EventEditor';
import { SettingsSheet } from '../settings/SettingsSheet';
import { colors, fonts, radius } from '../theme';
import { Card, Icon, IconButton, SectionLabel, Txt } from '../ui';
import { useApplyUpdates } from './apply';
import { TaskRow } from './components';
import { byQuadrant, inSas, moveIdea, QuadrantId, QUADRANTS, newTask, Task, TaskItem } from './model';
import { TaskEditor } from './TaskEditor';
import { useTasks } from './TasksContext';
import { useTaskItems } from './useTaskItems';

interface Drag {
  key: string;
  title: string;
  h: number;
  /** Haut de la ligne au moment où on la saisit (dans la zone des listes). */
  startTop: number;
  startPageY: number;
  dy: number;
}

interface Box { y: number; h: number }

export function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { tasks, toggleDone } = useTasks();
  const { events, toggleDone: toggleEventDone } = useCalendar();
  const items = useTaskItems(); // tâches du module + événements « Tâche » du calendrier
  const apply = useApplyUpdates();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState<Task | null>(null);
  const [editingEvent, setEditingEvent] = useState<EditorState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const input = useRef<TextInput>(null);

  // Mesures pour le glisser-déposer : sections (dans la zone des listes), cartes (dans leur section), lignes (dans leur carte).
  const dragRef = useRef<Drag | null>(null);
  const captured = useRef(false);
  const sections = useRef<Partial<Record<QuadrantId, Box>>>({});
  const cards = useRef<Partial<Record<QuadrantId, Box>>>({});
  const rows = useRef<Record<string, Box>>({});

  const today = todayKey();
  const sas = inSas(items);

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    setCreating(newTask(title, today));
    setDraft('');
  };

  // Une tâche du module s'ouvre dans sa fiche, un événement « Tâche » dans la fiche du calendrier.
  const open = (item: TaskItem) => {
    if (item.source === 'task') setEditing(tasks.find((t) => t.id === item.id) ?? null);
    else {
      const event = events.find((e) => e.id === item.id);
      if (event) setEditingEvent({ event, isNew: false, day: event.date });
    }
  };
  const toggle = (item: TaskItem, done: boolean) => {
    if (item.source === 'task') toggleDone(item.id, done);
    else if (item.day) toggleEventDone(item.id, item.day); // bascule le jour de l'événement
  };

  // ---------------- Glisser-déposer ----------------

  const rowTop = (q: QuadrantId, key: string): number | null => {
    const s = sections.current[q], c = cards.current[q], r = rows.current[key];
    return s && c && r ? s.y + c.y + r.y : null;
  };

  const startDrag = (item: TaskItem, q: QuadrantId, pageY: number) => {
    const top = rowTop(q, item.key);
    const box = rows.current[item.key];
    if (top === null || !box) return;
    captured.current = false;
    const d: Drag = { key: item.key, title: item.title, h: box.h, startTop: top, startPageY: pageY, dy: 0 };
    dragRef.current = d;
    setDrag(d);
  };

  /** Où tomberait l'idée : la liste sous le doigt, et sa place dans cette liste. */
  const dropTarget = (d: Drag): { q: QuadrantId; index: number; lineY: number } => {
    const fy = d.startTop + d.h / 2 + d.dy;
    let q: QuadrantId = QUADRANTS[0].id;
    let best = Infinity;
    for (const quad of QUADRANTS) {
      const s = sections.current[quad.id];
      if (!s) continue;
      const dist = fy < s.y ? s.y - fy : fy > s.y + s.h ? fy - (s.y + s.h) : 0;
      if (dist < best) { best = dist; q = quad.id; }
    }
    const others = byQuadrant(items, q).filter((i) => i.key !== d.key);
    const placed = others.map((i) => ({ top: rowTop(q, i.key), h: rows.current[i.key]?.h ?? 0 })).filter((r): r is { top: number; h: number } => r.top !== null);
    const index = placed.filter((r) => r.top + r.h / 2 < fy).length;
    const cardTop = (sections.current[q]?.y ?? 0) + (cards.current[q]?.y ?? 0);
    const lineY = index < placed.length ? placed[index].top : placed.length ? placed[placed.length - 1].top + placed[placed.length - 1].h : cardTop;
    return { q, index, lineY };
  };

  const endDrag = (drop: boolean) => {
    const d = dragRef.current;
    dragRef.current = null;
    captured.current = false;
    setDrag(null);
    if (!d || !drop) return;
    const t = dropTarget(d);
    apply(moveIdea(items, d.key, t.q, t.index));
  };

  const onMove = (e: GestureResponderEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const next = { ...d, dy: e.nativeEvent.pageY - d.startPageY };
    dragRef.current = next;
    setDrag(next);
  };

  const target = drag ? dropTarget(drag) : null;

  const measure = (store: { current: Record<string, Box> | Partial<Record<QuadrantId, Box>> }, key: string) => (e: LayoutChangeEvent) => {
    (store.current as Record<string, Box>)[key] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
  };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{labelDayLong(today)}</Txt>
          <Txt bold size={24}>Trier mes idées</Txt>
        </View>
        <IconButton icon="sliders" label="Réglages" onPress={() => setSettingsOpen(true)} />
      </View>

      <View style={st.capture}>
        <TextInput
          ref={input}
          accessibilityLabel="Titre de l’idée"
          value={draft}
          onChangeText={setDraft}
          placeholder="Une idée, par son titre"
          placeholderTextColor={colors.faint}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={submit}
          style={st.captureInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Développer cette idée"
          onPress={submit}
          style={({ pressed }) => [st.captureBtn, !draft.trim() && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
        >
          <Icon name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={st.captureNote}>
        <Txt size={13} color={colors.muted} numberOfLines={1}>Le titre suffit : on développe et on classe ensuite.</Txt>
      </View>

      <ScrollView
        scrollEnabled={!drag}
        contentContainerStyle={[st.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{ gap: 14 }}
          onMoveShouldSetResponderCapture={() => {
            if (!dragRef.current) return false;
            captured.current = true;
            return true;
          }}
          onResponderMove={onMove}
          onResponderRelease={() => endDrag(true)}
          onResponderTerminate={() => endDrag(false)}
        >
          {sas.length > 0 ? (
            <View style={{ gap: 8 }}>
              <SectionLabel>{`À classer · ${sas.length}`}</SectionLabel>
              <Card>
                {sas.map((i) => (
                  <TaskRow key={i.key} task={i} showDay onPress={() => open(i)} onToggle={(done) => toggle(i, done)} />
                ))}
              </Card>
            </View>
          ) : null}

          {QUADRANTS.map((q) => {
            const list = byQuadrant(items, q.id);
            const hot = target?.q === q.id;
            return (
              <View key={q.id} style={{ gap: 8 }} onLayout={measure(sections, q.id)}>
                <View style={st.quadHead}>
                  <Icon name={q.icon} size={18} color={colors.accentDark} />
                  <View style={{ flex: 1 }}>
                    <Txt bold size={16}>{q.label}</Txt>
                    {q.hint ? <Txt size={13} color={colors.muted}>{q.hint}</Txt> : null}
                  </View>
                  <Txt bold size={14} color={colors.muted}>{list.length}</Txt>
                </View>
                <View onLayout={measure(cards, q.id)}>
                  <Card style={hot ? st.cardHot : undefined}>
                    {list.length === 0 ? (
                      <EmptyState text={drag ? 'Dépose ici.' : 'Rien ici.'} />
                    ) : (
                      list.map((i) => (
                        <TaskRow
                          key={i.key}
                          task={i}
                          listed
                          showDay
                          dim={drag?.key === i.key}
                          onLayout={measure(rows, i.key)}
                          onPress={() => open(i)}
                          onToggle={(done) => toggle(i, done)}
                          onLongPress={(pageY) => startDrag(i, q.id, pageY)}
                          onPressOut={() => {
                            // Relâché sans bouger : on annule. Si le doigt a bougé, c'est la zone des listes qui prend la main.
                            if (dragRef.current && !captured.current) endDrag(false);
                          }}
                        />
                      ))
                    )}
                  </Card>
                </View>
              </View>
            );
          })}

          {drag && target ? (
            <>
              <View pointerEvents="none" style={[st.line, { top: target.lineY - 1 }]} />
              <View pointerEvents="none" style={[st.ghost, { top: drag.startTop + drag.dy, height: drag.h }]}>
                <Txt bold size={15} numberOfLines={1} style={{ flex: 1 }}>{drag.title}</Txt>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <TaskEditor task={creating} isNew onClose={() => setCreating(null)} />
      <TaskEditor task={editing} onClose={() => setEditing(null)} />
      <EventEditor state={editingEvent} onClose={() => setEditingEvent(null)} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  capture: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, alignItems: 'center' },
  captureInput: {
    flex: 1, minHeight: 52, borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16, color: colors.ink,
  },
  captureBtn: { width: 52, height: 52, borderRadius: radius.m, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  captureNote: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, minHeight: 30 },
  content: { paddingHorizontal: 16, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  quadHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, minHeight: 44 },
  cardHot: { borderColor: colors.accent, borderWidth: 2 },
  line: { position: 'absolute', left: 8, right: 8, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  ghost: {
    position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16,
    backgroundColor: colors.card, borderRadius: radius.m, borderWidth: 2, borderColor: colors.accent,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
