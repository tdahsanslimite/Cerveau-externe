// Briques de saisie partagées : liste à cocher (objets, courses, étapes) et choix Oui / Non / Ne sais pas.
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Chip, Icon, Txt } from '../ui';
import { ItemLine, newId } from './model';

export function ItemListEditor({ items, onChange, error = false, placeholder = 'Ex. devis signé' }: {
  items: ItemLine[]; onChange: (items: ItemLine[]) => void; error?: boolean; placeholder?: string;
}) {
  return (
    <View style={st.itemList}>
      {items.map((it, idx) => (
        <View key={it.id} style={st.itemRow}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!it.done }}
            accessibilityLabel={it.done ? `Décocher ${it.text}` : `Cocher ${it.text}`}
            onPress={() => onChange(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))}
            hitSlop={8}
            style={[st.box, it.done && st.boxOn]}
          >
            {it.done ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
          </Pressable>
          <TextInput
            accessibilityLabel={`Ligne ${idx + 1}`}
            value={it.text}
            onChangeText={(text) => onChange(items.map((x) => (x.id === it.id ? { ...x, text } : x)))}
            placeholder={placeholder}
            placeholderTextColor={colors.faint}
            autoFocus={!it.text && idx === items.length - 1 && idx > 0}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => { if (it.text.trim()) onChange([...items, { id: newId(), text: '' }]); }}
            style={[st.itemInput, it.done && { textDecorationLine: 'line-through', color: colors.muted }]}
          />
          <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${it.text || 'cette ligne'}`} onPress={() => onChange(items.filter((x) => x.id !== it.id))} hitSlop={8} style={st.itemRemove}>
            <Icon name="x" size={16} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter une ligne"
        onPress={() => onChange([...items, { id: newId(), text: '' }])}
        style={[st.itemAdd, error && { borderColor: colors.danger }]}
      >
        <Icon name="plus" size={16} color={colors.accent} />
        <Txt bold size={14} color={colors.accent}>Ajouter</Txt>
      </Pressable>
    </View>
  );
}

/** Oui / Non / Ne sais pas (null). Une idée « Ne sais pas » atterrit dans Abandonner, à répartir plus tard. */
export function TriChips({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <View style={st.wrap}>
      <Chip label="Oui" selected={value === true} onPress={() => onChange(true)} />
      <Chip label="Non" selected={value === false} onPress={() => onChange(false)} />
      <Chip label="Ne sais pas" selected={value === null} onPress={() => onChange(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  itemList: { backgroundColor: colors.card, borderRadius: radius.m, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  itemInput: { flex: 1, minHeight: 44, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  itemRemove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  itemAdd: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 10, marginVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: 'transparent' },
});
