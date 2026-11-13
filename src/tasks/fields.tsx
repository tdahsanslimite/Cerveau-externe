// Briques de saisie de « Programmer » : les 3 mots de la priorité, la date limite, le contenu (encart libre ou check-liste).
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { addDays, labelDayLong, relativeLabel } from '../calendar/dates';
import type { DayKey } from '../calendar/dates';
import { ItemListEditor } from '../calendar/ItemListEditor';
import type { ItemLine } from '../calendar/model';
import { colors, fonts, radius, TOUCH } from '../theme';
import { Chip, Icon, Txt } from '../ui';
import { continueList, IDEA_KINDS, IdeaKind, pickPriority, PriorityWord, priorityWordOn } from './model';

const WORDS: { id: PriorityWord; label: string }[] = [
  { id: 'urgent', label: 'Urgent' },
  { id: 'important', label: 'Important' },
  { id: 'nsp', label: 'Ne sais pas' },
];

/** Urgent / Important / Ne sais pas. Urgent + Important = « Urgent et important ». */
export function PriorityWords({ important, urgent, onChange }: {
  important: boolean | null; urgent: boolean | null;
  onChange: (p: { important: boolean | null; urgent: boolean | null }) => void;
}) {
  return (
    <View style={st.wrap}>
      {WORDS.map((w) => (
        <Chip key={w.id} label={w.label} selected={priorityWordOn({ important, urgent }, w.id)} onPress={() => onChange(pickPriority({ important, urgent }, w.id))} />
      ))}
    </View>
  );
}

/** « À faire avant le… » : facultatif. */
export function DeadlineField({ value, today, onChange }: { value: DayKey | undefined; today: DayKey; onChange: (d: DayKey | undefined) => void }) {
  if (!value) {
    return (
      <Pressable accessibilityRole="button" onPress={() => onChange(addDays(today, 7))} style={({ pressed }) => [st.addLine, pressed && { opacity: 0.6 }]}>
        <Icon name="flag" size={16} color={colors.accent} />
        <Txt bold size={14} color={colors.accent}>À faire avant le…</Txt>
      </Pressable>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={st.stepper}>
        <StepBtn icon="chevron-left" label="Un jour plus tôt" onPress={() => onChange(value <= today ? today : addDays(value, -1))} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt size={13} color={colors.muted}>À faire avant le</Txt>
          <Txt bold size={16}>{labelDayLong(value)}</Txt>
          {relativeLabel(value) ? <Txt size={13} color={colors.accent}>{relativeLabel(value)}</Txt> : null}
        </View>
        <StepBtn icon="chevron-right" label="Un jour plus tard" onPress={() => onChange(addDays(value, 1))} />
      </View>
      <View style={st.wrap}>
        <Chip label="+1 semaine" onPress={() => onChange(addDays(value, 7))} />
        <Chip label="Pas de date limite" onPress={() => onChange(undefined)} />
      </View>
    </View>
  );
}

/** Le contenu : encart libre ou check-liste, au choix (on peut changer d'avis, rien n'est effacé). */
export function ContentField({ kind, note, items, onKind, onNote, onItems }: {
  kind: IdeaKind; note: string; items: ItemLine[];
  onKind: (k: IdeaKind) => void; onNote: (n: string) => void; onItems: (i: ItemLine[]) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={st.wrap}>
        {IDEA_KINDS.map((k) => (
          <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => onKind(k.id)} />
        ))}
      </View>
      {kind === 'liste' ? (
        <ItemListEditor items={items} onChange={onItems} placeholder="Ex. lait" />
      ) : (
        <TextInput
          accessibilityLabel="Note"
          value={note}
          onChangeText={(n) => onNote(continueList(note, n))}
          placeholder={'Écris ce que tu veux…\n- un tiret fait une liste'}
          placeholderTextColor={colors.faint}
          multiline
          style={[st.input, { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' }]}
        />
      )}
    </View>
  );
}

function StepBtn({ icon, label, onPress }: { icon: 'chevron-left' | 'chevron-right'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [st.stepBtn, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} />
    </Pressable>
  );
}

export const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    minHeight: 48, borderRadius: radius.m, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16, color: colors.ink,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.m, borderWidth: 1, borderColor: colors.line, padding: 6 },
  stepBtn: { minWidth: TOUCH, height: TOUCH, borderRadius: radius.s, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  addLine: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: TOUCH, paddingHorizontal: 4 },
});
