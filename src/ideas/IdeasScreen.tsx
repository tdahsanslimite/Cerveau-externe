// Onglet Idées : on vide sa tête (saisie rapide, tout tombe « En vrac »), puis on trie plus tard dans des listes.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, TOUCH } from '../theme';
import { Button, Card, Chip, Icon, IconButton, SectionLabel, Txt } from '../ui';
import { useIdeas } from './IdeasContext';
import { IdeaItem, listTitle, openCount, reminderLabel, VRAC_ID, visibleItems } from './model';
import { ItemSheet, ListSheet, ListSheetState, ReminderSheet } from './sheets';

export function IdeasScreen() {
  const insets = useSafeAreaInsets();
  const { lists, items, reminder, capture, update, clearChecked } = useIdeas();
  /** Liste affichée ; null = toutes les idées. */
  const [filter, setFilter] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editItem, setEditItem] = useState<IdeaItem | null>(null);
  const [listSheet, setListSheet] = useState<ListSheetState | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);

  // Si la liste affichée a été supprimée, on revient à « Toutes ».
  const current = filter && lists.some((l) => l.id === filter) ? filter : null;
  const shown = visibleItems(items, current);
  const doneCount = shown.filter((i) => i.done).length;

  const add = () => {
    if (!draft.trim()) return;
    capture(draft, current ?? VRAC_ID);
    setDraft('');
    // Le clavier reste ouvert : on enchaîne les idées sans rien décider (voir les props du champ).
  };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Vide ta tête</Txt>
          <Txt bold size={24}>Idées</Txt>
        </View>
        <IconButton icon="bell" label={`Rappel pour trier : ${reminderLabel(reminder)}`} onPress={() => setReminderOpen(true)} color={reminder.mode === 'off' ? colors.muted : colors.accent} />
      </View>

      <View style={st.captureRow}>
        <TextInput
          accessibilityLabel="Noter une idée"
          value={draft}
          onChangeText={setDraft}
          placeholder={current ? `Ajouter à « ${listTitle(lists, current)} »` : 'Une idée, une pensée…'}
          placeholderTextColor={colors.faint}
          returnKeyType="done"
          submitBehavior="submit" // Android / iOS : on reste dans le champ après validation
          blurOnSubmit={false} // web : même chose (react-native-web ignore submitBehavior)
          onSubmitEditing={add}
          style={st.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter l'idée"
          onPress={add}
          style={({ pressed }) => [st.addBtn, !draft.trim() && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
        >
          <Icon name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips} keyboardShouldPersistTaps="handled">
          <Chip label={`Tout · ${openCount(items, null)}`} selected={current === null} onPress={() => setFilter(null)} />
          {lists.map((l) => {
            const n = openCount(items, l.id);
            return <Chip key={l.id} label={n > 0 ? `${l.title} · ${n}` : l.title} selected={current === l.id} onPress={() => setFilter(l.id)} />;
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajouter une liste"
            onPress={() => setListSheet({ listId: null })}
            style={({ pressed }) => [st.newList, pressed && { backgroundColor: colors.accentSoft }]}
          >
            <Icon name="plus" size={18} color={colors.accent} />
            <Txt bold size={14} color={colors.accent}>Liste</Txt>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: 32 }]} keyboardShouldPersistTaps="handled">
        <SectionLabel
          right={
            current ? (
              <IconButton icon="edit-2" label={`Modifier la liste ${listTitle(lists, current)}`} onPress={() => setListSheet({ listId: current })} bordered={false} color={colors.muted} />
            ) : undefined
          }
        >
          {current ? listTitle(lists, current) : 'Toutes les idées'}
        </SectionLabel>

        {shown.length === 0 ? (
          <Card style={{ padding: 18, gap: 8 }}>
            <Txt bold size={17}>{items.length === 0 ? 'Rien en tête ? Tant mieux.' : 'Cette liste est vide.'}</Txt>
            <Txt size={14} color={colors.muted} style={{ lineHeight: 21 }}>
              {items.length === 0
                ? 'Dès qu\'une pensée arrive, note-la ici sans réfléchir. Tu la rangeras plus tard : le but, c\'est de libérer ta tête.'
                : 'Note une idée ci-dessus, ou range-en une depuis « En vrac ».'}
            </Txt>
          </Card>
        ) : (
          <Card>
            {shown.map((i, idx) => (
              <View key={i.id} style={[st.row, idx === shown.length - 1 && { borderBottomWidth: 0 }]}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: i.done }}
                  accessibilityLabel={`Cocher ${i.title}`}
                  onPress={() => update(i.id, { done: !i.done })}
                  hitSlop={4}
                  style={st.checkZone}
                >
                  <View style={[st.box, i.done && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                    {i.done ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Modifier ${i.title}`}
                  onPress={() => setEditItem(i)}
                  style={({ pressed }) => [{ flex: 1, minHeight: 56, justifyContent: 'center', gap: 2 }, pressed && { opacity: 0.6 }]}
                >
                  <Txt size={16} color={i.done ? colors.faint : colors.ink} style={i.done && { textDecorationLine: 'line-through' }}>{i.title}</Txt>
                  {current === null && i.listId !== VRAC_ID ? <Txt size={13} color={colors.muted}>{listTitle(lists, i.listId)}</Txt> : null}
                </Pressable>
              </View>
            ))}
          </Card>
        )}

        {doneCount > 0 ? (
          <Button label={`Retirer les cochées (${doneCount})`} kind="ghost" icon="trash-2" onPress={() => clearChecked(current)} />
        ) : null}
      </ScrollView>

      <ItemSheet item={editItem} onClose={() => setEditItem(null)} />
      <ListSheet state={listSheet} onClose={() => setListSheet(null)} onCreated={(id) => setFilter(id)} />
      <ReminderSheet visible={reminderOpen} onClose={() => setReminderOpen(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  captureRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  input: {
    flex: 1, minHeight: 52, borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16, color: colors.ink,
  },
  addBtn: { width: 52, height: 52, borderRadius: radius.m, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  newList: {
    minHeight: TOUCH, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  content: { paddingHorizontal: 16, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.lineSoft, paddingRight: 14 },
  checkZone: { width: 52, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
});
