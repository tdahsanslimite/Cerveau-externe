// Brique commune aux écrans Objectifs : un champ de texte libre avec son titre, enregistré à chaque frappe.
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Txt } from '../ui';

export function TextBlock({ label, hint, value, onChange, placeholder, lines = 3 }: {
  label: string; hint?: string; value: string; onChange: (text: string) => void; placeholder: string; lines?: number;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Txt bold size={15}>{label}</Txt>
      {hint ? <Txt size={13} color={colors.muted}>{hint}</Txt> : null}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        textAlignVertical="top"
        style={[st.input, { minHeight: lines * 24 + 24 }]}
      />
    </View>
  );
}

const st = StyleSheet.create({
  input: {
    borderRadius: radius.m, borderWidth: 1, borderColor: colors.paperLine, backgroundColor: colors.paper,
    padding: 12, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.ink,
  },
});
