// Écran du module Tâches : saisie rapide, Aujourd'hui, le sas, la matrice d'Eisenhower.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, LoadGauge } from '../calendar/components';
import { labelDayLong, todayKey } from '../calendar/dates';
import { loadLevel } from '../calendar/model';
import { useDayLoad } from '../load';
import { useSettings } from '../settings/SettingsContext';
import { SettingsSheet } from '../settings/SettingsSheet';
import { colors, fonts, radius } from '../theme';
import { Button, Card, Icon, IconButton, SectionLabel, Txt } from '../ui';
import { TaskRow } from './components';
import { byQuadrant, inSas, QUADRANTS, Task, tasksOn } from './model';
import { SortSheet } from './SortSheet';
import { TaskEditor } from './TaskEditor';
import { useTasks } from './TasksContext';

type Segment = 'aujourdhui' | 'sas' | 'matrice';

export function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { tasks, capture, toggleDone } = useTasks();
  const { settings } = useSettings();
  const load = useDayLoad();
  const [segment, setSegment] = useState<Segment>('aujourdhui');
  const [draft, setDraft] = useState('');
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [sorting, setSorting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const input = useRef<TextInput>(null);

  const today = todayKey();
  const sas = inSas(tasks);
  const todays = tasksOn(tasks, today);
  const count = load(today);
  const level = loadLevel(count, settings.dailyLimit);

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(null), 2500);
    return () => clearTimeout(t);
  }, [justAdded]);

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    capture(title);
    setJustAdded(title);
    setDraft('');
    input.current?.focus(); // on peut enchaîner : vider sa tête, une idée par ligne
  };

  const SEGMENTS: { id: Segment; label: string }[] = [
    { id: 'aujourdhui', label: 'Aujourd’hui' },
    { id: 'sas', label: sas.length ? `Sas · ${sas.length}` : 'Sas' },
    { id: 'matrice', label: 'Matrice' },
  ];

  const row = (t: Task, showDay = false) => (
    <TaskRow key={t.id} task={t} showDay={showDay} onPress={() => setEditing(t)} onToggle={(done) => toggleDone(t.id, done)} />
  );

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{labelDayLong(today)}</Txt>
          <Txt bold size={24}>Tâches</Txt>
        </View>
        <IconButton icon="sliders" label="Réglages" onPress={() => setSettingsOpen(true)} />
      </View>

      <View style={st.capture}>
        <TextInput
          ref={input}
          accessibilityLabel="Déposer une tâche dans le sas"
          value={draft}
          onChangeText={setDraft}
          placeholder="Qu’est-ce qui te passe par la tête ?"
          placeholderTextColor={colors.faint}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={submit}
          style={st.captureInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Déposer dans le sas"
          onPress={submit}
          style={({ pressed }) => [st.captureBtn, !draft.trim() && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
        >
          <Icon name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={st.captureNote}>
        <Txt size={13} color={justAdded ? colors.accent : colors.muted} numberOfLines={1}>
          {justAdded ? `« ${justAdded} » est dans le sas.` : 'Tout ce que tu écris ici va dans le sas. Rien à décider maintenant.'}
        </Txt>
      </View>

      <View style={st.segmentedWrap}>
        <View style={st.segmented} accessibilityRole="tablist">
          {SEGMENTS.map((s) => {
            const on = segment === s.id;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setSegment(s.id)}
                style={[st.segment, on && st.segmentOn]}
              >
                <Txt bold={on} size={14} color={on ? colors.ink : colors.muted}>{s.label}</Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {segment === 'aujourdhui' && (
          <>
            <Card style={{ padding: 16 }}>
              <LoadGauge level={level} count={count} limit={settings.dailyLimit} />
            </Card>
            <View style={{ gap: 8 }}>
              <SectionLabel>Prévu aujourd’hui</SectionLabel>
              <Card>
                {todays.length === 0 ? (
                  <EmptyState text={sas.length ? 'Rien de prévu pour aujourd’hui. Ouvre le sas pour choisir ce qui compte.' : 'Rien de prévu pour aujourd’hui.'} />
                ) : (
                  todays.map((t) => row(t))
                )}
              </Card>
            </View>
          </>
        )}

        {segment === 'sas' && (
          <>
            <Txt size={14} color={colors.muted} style={{ lineHeight: 20, paddingHorizontal: 4 }}>
              Le sas, c’est la salle d’attente de ta tête. Ces tâches ne comptent dans aucune journée tant que tu ne les as pas triées.
            </Txt>
            {sas.length > 0 ? <Button label={`Trier le sas (${sas.length})`} icon="shuffle" kind="dark" onPress={() => setSorting(true)} /> : null}
            <Card>
              {sas.length === 0 ? <EmptyState text="Le sas est vide. Respire." /> : sas.map((t) => row(t))}
            </Card>
          </>
        )}

        {segment === 'matrice' &&
          QUADRANTS.map((q) => {
            const list = byQuadrant(tasks, q.id);
            return (
              <View key={q.id} style={{ gap: 8 }}>
                <View style={st.quadHead}>
                  <Icon name={q.icon} size={18} color={colors.accentDark} />
                  <View style={{ flex: 1 }}>
                    <Txt bold size={16}>{q.label}</Txt>
                    <Txt size={13} color={colors.muted}>{q.hint}</Txt>
                  </View>
                  <Txt bold size={14} color={colors.muted}>{list.length}</Txt>
                </View>
                <Card>{list.length === 0 ? <EmptyState text="Rien ici." /> : list.map((t) => row(t, true))}</Card>
              </View>
            );
          })}
      </ScrollView>

      <TaskEditor task={editing} onClose={() => setEditing(null)} />
      <SortSheet visible={sorting} onClose={() => setSorting(false)} />
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
  segmentedWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  segmented: { flexDirection: 'row', backgroundColor: '#EAE7E0', borderRadius: radius.m, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  content: { paddingHorizontal: 16, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  quadHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, minHeight: 44 },
});
