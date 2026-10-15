// Briques d'interface propres aux tâches.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { labelDayShort, relativeLabel } from '../calendar/dates';
import { categoryOf } from '../calendar/model';
import { colors, radius, TOUCH } from '../theme';
import { Icon, Txt } from '../ui';
import { isStuck, quadrantInfo, quadrantOf, slideLabel, Task } from './model';

export function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onToggle}
      hitSlop={4}
      style={({ pressed }) => [st.checkZone, pressed && { opacity: 0.6 }]}
    >
      <View style={[st.box, checked && st.boxOn]}>{checked ? <Icon name="check" size={18} color="#FFFFFF" /> : null}</View>
    </Pressable>
  );
}

export function TaskRow({ task, onPress, onToggle, showDay = false }: {
  task: Task; onPress: () => void; onToggle: (done: boolean) => void; showDay?: boolean;
}) {
  const done = task.status === 'done';
  const q = quadrantOf(task);
  const slide = slideLabel(task);
  const stuck = isStuck(task);
  const meta = [
    q ? quadrantInfo(q).label : null,
    showDay && task.day ? (relativeLabel(task.day) ?? labelDayShort(task.day)) : null,
    task.category ? categoryOf(task.category).label : null,
  ].filter(Boolean).join(' · ');
  return (
    <View style={st.row}>
      <Checkbox checked={done} onToggle={() => onToggle(!done)} label={done ? `Décocher ${task.title}` : `Cocher ${task.title}`} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.title}${meta ? `, ${meta}` : ''}${slide ? `, ${slide}` : ''}. Modifier`}
        onPress={onPress}
        style={({ pressed }) => [st.body, pressed && { backgroundColor: colors.lineSoft }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Txt bold size={15} numberOfLines={2} color={done ? colors.faint : colors.ink} style={done ? { textDecorationLine: 'line-through' } : undefined}>
            {task.title}
          </Txt>
          {meta || slide ? (
            <Txt size={13} color={colors.muted}>
              {meta}
              {meta && slide ? ' · ' : ''}
              {slide ? <Txt size={13} color={stuck ? colors.warnDark : colors.muted} bold={stuck}>{slide}</Txt> : null}
            </Txt>
          ) : null}
        </View>
        <Icon name="chevron-right" size={18} color={colors.faint} />
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.lineSoft, minHeight: 60 },
  checkZone: { width: TOUCH + 12, minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingRight: 14, minHeight: 60, borderRadius: radius.s },
});
