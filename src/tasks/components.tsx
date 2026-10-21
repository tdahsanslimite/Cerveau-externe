// Briques d'interface propres aux tâches.
import React from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { labelDayShort, minutesToLabel, relativeLabel } from '../calendar/dates';
import { useCalendar } from '../calendar/CalendarContext';
import { colors, radius, TOUCH } from '../theme';
import { Icon, Txt } from '../ui';
import { isStuck, quadrantInfo, quadrantOf, slideLabel, TaskItem } from './model';

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

/** Une ligne de tâche. `task.source === 'event'` : posée dans le calendrier, avec son créneau. */
export function TaskRow({ task, onPress, onToggle, showDay = false, listed = false, onLongPress, onPressOut, onLayout, dim = false }: {
  task: TaskItem; onPress: () => void; onToggle: (done: boolean) => void; showDay?: boolean;
  /** Dans une des listes de priorité : la liste et le domaine sont déjà connus, on ne les répète pas. */
  listed?: boolean;
  /** Appui long (début d'un déplacement), fin d'appui, mesure de la ligne, et ligne grisée pendant qu'on la déplace. */
  onLongPress?: (pageY: number) => void;
  onPressOut?: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  dim?: boolean;
}) {
  const { domain } = useCalendar();
  const done = task.status === 'done';
  const q = quadrantOf(task);
  const slide = slideLabel(task);
  const stuck = isStuck(task);
  const slot = task.start === null ? null : `${minutesToLabel(task.start)}–${minutesToLabel(task.start + task.durationMin)}`;
  const meta = [
    !listed && q ? quadrantInfo(q).label : null,
    showDay && task.day ? (relativeLabel(task.day) ?? labelDayShort(task.day)) : null,
    slot,
    !listed && task.category ? domain(task.category).label : null,
  ].filter(Boolean).join(' · ');
  return (
    <View style={[st.row, dim && { opacity: 0.3 }]} onLayout={onLayout}>
      <Checkbox checked={done} onToggle={() => onToggle(!done)} label={done ? `Décocher ${task.title}` : `Cocher ${task.title}`} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.title}${meta ? `, ${meta}` : ''}${slide ? `, ${slide}` : ''}. Modifier`}
        onPress={onPress}
        onLongPress={onLongPress ? (e) => onLongPress(e.nativeEvent.pageY) : undefined}
        delayLongPress={350}
        onPressOut={onPressOut}
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
        {task.source === 'event' ? <Icon name="calendar" size={16} color={colors.faint} /> : null}
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
