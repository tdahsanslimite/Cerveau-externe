// Écran « Trier mes idées » : on note une idée par son titre, une fenêtre aide à la développer et la prioriser.
// Une nouvelle idée tombe dans « Abandonner ? » (le « Ne sais pas » par défaut) : pas de longue liste au-dessus de The One Thing.
// Au-dessus, The One Thing ; dessous, la matrice d'Eisenhower en 4 cases (2 × 2) comme l'originale.
// Appui long sur une idée = on la déplace d'une case à l'autre, ou plus haut / plus bas dans sa case.
import React, { useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalendar } from '../calendar/CalendarContext';
import { EmptyState } from '../calendar/components';
import { labelDayLong, todayKey } from '../calendar/dates';
import { EditorState, EventEditor } from '../calendar/EventEditor';
import { AnnualOneThingLine } from '../goals/GoalLines';
import { SettingsSheet } from '../settings/SettingsSheet';
import { colors, fonts, radius } from '../theme';
import { Card, Icon, IconButton, Txt } from '../ui';
import { useApplyUpdates } from './apply';
import { TaskRow } from './components';
import { byQuadrant, moveIdea, QuadrantId, QUADRANTS, newTask, Task, TaskItem } from './model';
import { TaskEditor } from './TaskEditor';
import { useTasks } from './TasksContext';
import { useTaskItems } from './useTaskItems';

interface Drag {
  key: string;
  title: string;
  h: number;
  /** Haut et côté gauche de la ligne au moment où on la saisit (dans la zone des cases). */
  startTop: number;
  startLeft: number;
  w: number;
  startPageX: number;
  startPageY: number;
  dx: number;
  dy: number;
}

interface Box { x: number; y: number; w: number; h: number }

/** Les 4 cases, dans l'ordre de lecture de la matrice d'Eisenhower (2 × 2). */
const GRID: QuadrantId[][] = [['faire', 'planifier'], ['alleger', 'lacher']];
const ROW_OF: Partial<Record<QuadrantId, number>> = { faire: 0, planifier: 0, alleger: 1, lacher: 1 };

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
  const sections = useRef<Partial<Record<QuadrantId, Box>>>({}); // dans leur bloc (The One Thing : dans la zone ; cases : dans leur rangée)
  const cards = useRef<Partial<Record<QuadrantId, Box>>>({});
  const rows = useRef<Record<string, Box>>({});
  const gridY = useRef(0); // haut de la grille dans la zone
  const gridRowY = useRef<number[]>([0, 0]); // haut de chaque rangée dans la grille

  const today = todayKey();

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

  /** Position d'une case dans la zone des cases. */
  const secBox = (q: QuadrantId): Box | null => {
    const s = sections.current[q];
    if (!s) return null;
    const r = ROW_OF[q];
    return r === undefined ? s : { ...s, y: s.y + gridY.current + gridRowY.current[r] };
  };

  const rowPos = (q: QuadrantId, key: string): { x: number; top: number } | null => {
    const s = secBox(q), c = cards.current[q], r = rows.current[key];
    return s && c && r ? { x: s.x, top: s.y + c.y + r.y } : null;
  };

  const startDrag = (item: TaskItem, q: QuadrantId, pageX: number, pageY: number) => {
    const pos = rowPos(q, item.key);
    const box = rows.current[item.key];
    const sec = secBox(q);
    if (!pos || !box || !sec) return;
    captured.current = false;
    const d: Drag = { key: item.key, title: item.title, h: box.h, startTop: pos.top, startLeft: sec.x, w: sec.w, startPageX: pageX, startPageY: pageY, dx: 0, dy: 0 };
    dragRef.current = d;
    setDrag(d);
  };

  /** Où tomberait l'idée : la case sous le doigt, et sa place dans cette case. */
  const dropTarget = (d: Drag): { q: QuadrantId; index: number; lineY: number; lineX: number; lineW: number } => {
    const fx = d.startLeft + d.w / 2 + d.dx;
    const fy = d.startTop + d.h / 2 + d.dy;
    let q: QuadrantId = QUADRANTS[0].id;
    let best = Infinity;
    for (const quad of QUADRANTS) {
      const s = secBox(quad.id);
      if (!s) continue;
      const ddx = fx < s.x ? s.x - fx : fx > s.x + s.w ? fx - (s.x + s.w) : 0;
      const ddy = fy < s.y ? s.y - fy : fy > s.y + s.h ? fy - (s.y + s.h) : 0;
      const dist = Math.hypot(ddx, ddy);
      if (dist < best) { best = dist; q = quad.id; }
    }
    const sec = secBox(q);
    const others = byQuadrant(items, q).filter((i) => i.key !== d.key);
    const placed = others
      .map((i) => ({ top: rowPos(q, i.key)?.top ?? null, h: rows.current[i.key]?.h ?? 0 }))
      .filter((r): r is { top: number; h: number } => r.top !== null);
    const index = placed.filter((r) => r.top + r.h / 2 < fy).length;
    const cardTop = (sec?.y ?? 0) + (cards.current[q]?.y ?? 0);
    const lineY = index < placed.length ? placed[index].top : placed.length ? placed[placed.length - 1].top + placed[placed.length - 1].h : cardTop;
    return { q, index, lineY, lineX: (sec?.x ?? 0) + 6, lineW: Math.max(0, (sec?.w ?? 0) - 12) };
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
    const next = { ...d, dx: e.nativeEvent.pageX - d.startPageX, dy: e.nativeEvent.pageY - d.startPageY };
    dragRef.current = next;
    setDrag(next);
  };

  const target = drag ? dropTarget(drag) : null;

  const measure = (store: { current: Record<string, Box> | Partial<Record<QuadrantId, Box>> }, key: string) => (e: LayoutChangeEvent) => {
    const l = e.nativeEvent.layout;
    (store.current as Record<string, Box>)[key] = { x: l.x, y: l.y, w: l.width, h: l.height };
  };

  const renderCell = (id: QuadrantId) => {
    const q = QUADRANTS.find((x) => x.id === id) as (typeof QUADRANTS)[number];
    const list = byQuadrant(items, id);
    const hot = target?.q === id;
    const wide = id === 'one' || id === 'vrac';
    return (
      <View key={id} style={wide ? { gap: 6 } : st.cell} onLayout={measure(sections, id)}>
        <View style={[st.quadHead, !wide && { minHeight: 56 }]}>
          <Icon name={q.icon} size={wide ? 18 : 16} color={colors.accentDark} />
          <View style={{ flex: 1 }}>
            <Txt bold size={wide ? 16 : 14}>{q.label}</Txt>
            {q.hint ? <Txt size={12} color={colors.muted}>{q.hint}</Txt> : null}
          </View>
          <Txt bold size={13} color={colors.muted}>{list.length}</Txt>
        </View>
        {id === 'one' ? <AnnualOneThingLine day={todayKey()} /> : null}
        <View style={wide ? undefined : { flex: 1 }} onLayout={measure(cards, id)}>
          <Card style={[!wide && { flex: 1 }, hot ? st.cardHot : null]}>
            {list.length === 0 ? (
              <EmptyState text={drag ? 'Dépose ici.' : id === 'one' ? 'Glisse ici l’idée qui réussit ta journée.' : id === 'vrac' ? 'Rien à trier : bravo.' : 'Rien ici.'} />
            ) : (
              list.map((i) => (
                <TaskRow
                  key={i.key}
                  task={i}
                  listed
                  compact={!wide}
                  showDay
                  dim={drag?.key === i.key}
                  onLayout={measure(rows, i.key)}
                  onPress={() => open(i)}
                  onToggle={(done) => toggle(i, done)}
                  onLongPress={(pageX, pageY) => startDrag(i, id, pageX, pageY)}
                  onPressOut={() => {
                    // Relâché sans bouger : on annule. Si le doigt a bougé, c'est la zone des cases qui prend la main.
                    if (dragRef.current && !captured.current) endDrag(false);
                  }}
                />
              ))
            )}
          </Card>
        </View>
      </View>
    );
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
        <Txt size={13} color={colors.muted} numberOfLines={1}>Le titre suffit : l’idée arrive « En vrac », tu la tries ensuite.</Txt>
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
          {renderCell('one')}
          <View style={{ gap: 10 }} onLayout={(e) => { gridY.current = e.nativeEvent.layout.y; }}>
            {GRID.map((pair, r) => (
              <View key={r} style={st.gridRow} onLayout={(e) => { gridRowY.current[r] = e.nativeEvent.layout.y; }}>
                {pair.map((id) => renderCell(id))}
              </View>
            ))}
          </View>
          {renderCell('vrac')}

          {drag && target ? (
            <>
              <View pointerEvents="none" style={[st.line, { top: target.lineY - 1, left: target.lineX, width: target.lineW }]} />
              <View pointerEvents="none" style={[st.ghost, { top: drag.startTop + drag.dy, left: drag.startLeft + drag.dx, width: drag.w, height: drag.h }]}>
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
  gridRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  cell: { flex: 1, gap: 6 },
  quadHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 2, minHeight: 36 },
  cardHot: { borderColor: colors.accent, borderWidth: 2 },
  line: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: colors.accent },
  ghost: {
    position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12,
    backgroundColor: colors.card, borderRadius: radius.m, borderWidth: 2, borderColor: colors.accent,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
