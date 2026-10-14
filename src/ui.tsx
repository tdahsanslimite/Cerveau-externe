// Briques d'interface partagées par tous les modules.
import React, { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, TOUCH } from './theme';

type TxtProps = TextProps & { bold?: boolean; size?: number; color?: string; style?: StyleProp<TextStyle> };

export function Txt({ bold, size = 15, color = colors.ink, style, ...rest }: TxtProps) {
  return <Text {...rest} style={[{ fontFamily: bold ? fonts.bold : fonts.regular, fontSize: size, color }, style]} />;
}

export type IconName = React.ComponentProps<typeof Feather>['name'];

export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

export function IconButton({ icon, label, onPress, color = colors.ink, bordered = true }: {
  icon: IconName; label: string; onPress: () => void; color?: string; bordered?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, bordered && styles.iconBtnBorder, pressed && styles.pressed]}
    >
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, color, dot }: {
  label: string; selected?: boolean; onPress: () => void; color?: string; dot?: string;
}) {
  const on = color ?? colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? { backgroundColor: on, borderColor: on } : null,
        pressed && styles.pressed,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: dot }, selected && { borderWidth: 1.5, borderColor: '#FFFFFF' }]} /> : null}
      <Txt bold={selected} size={14} color={selected ? '#FFFFFF' : colors.ink}>{label}</Txt>
    </Pressable>
  );
}

export function Button({ label, onPress, kind = 'primary', icon, style }: {
  label: string; onPress: () => void; kind?: 'primary' | 'dark' | 'ghost' | 'danger'; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: colors.accent, fg: '#FFFFFF', border: colors.accent },
    dark: { bg: colors.ink, fg: '#FFFFFF', border: colors.ink },
    ghost: { bg: colors.card, fg: colors.ink, border: colors.border },
    danger: { bg: colors.card, fg: colors.danger, border: '#E5B8AE' },
  }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={palette.fg} /> : null}
      <Txt bold size={15} color={palette.fg}>{label}</Txt>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionLabel}>
      <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</Txt>
      {right}
    </View>
  );
}

/** Feuille qui monte du bas de l'écran. */
export function Sheet({ visible, onClose, title, children, footer }: {
  visible: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHead}>
            <Txt bold size={22} style={{ flex: 1 }}>{title}</Txt>
            <IconButton icon="x" label="Fermer" onPress={onClose} bordered={false} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, paddingBottom: 8 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingTop: 12, gap: 10 }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Txt bold size={14}>{label}</Txt>
      {children}
      {hint ? <Txt size={13} color={colors.muted}>{hint}</Txt> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  iconBtn: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  iconBtnBorder: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chip: {
    minHeight: TOUCH, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  button: { minHeight: 52, borderRadius: radius.m, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  sectionLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, minHeight: 36 },
  backdrop: { flex: 1, backgroundColor: colors.backdrop },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 12, maxHeight: '92%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
});
