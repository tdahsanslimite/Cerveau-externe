import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Icon, Txt } from '../ui';
import { durationLabel, minutesToLabel } from './dates';
import { useCalendar } from './CalendarContext';
import { endOf, isDoneOn, kindsOf, LOAD_LABEL, LoadLevel, Occurrence } from './model';

export const LOAD_COLOR: Record<LoadLevel, string> = {
  vide: colors.ok,
  legere: colors.ok,
  equilibree: colors.amber,
  chargee: colors.warn,
  trop: colors.danger,
};

const LOAD_SEGMENTS: Record<LoadLevel, number> = { vide: 0, legere: 1, equilibree: 2, chargee: 3, trop: 4 };

export function LoadGauge({ level, count, limit }: { level: LoadLevel; count: number; limit: number }) {
  const color = LOAD_COLOR[level];
  const filled = LOAD_SEGMENTS[level];
  const message =
    level === 'trop'
      ? `${count} éléments pour une limite de ${limit}. Qu'est-ce qui peut glisser à un autre jour ?`
      : level === 'chargee'
        ? `Tu es pile à ta limite de ${limit}. Évite d'ajouter autre chose aujourd'hui.`
        : level === 'vide'
          ? 'Rien de prévu. De la place pour respirer.'
          : `${count} sur ta limite de ${limit}. Journée tenable.`;
  return (
    <View style={{ gap: 10 }} accessibilityLabel={`Charge du jour : ${LOAD_LABEL[level]}. ${message}`}>
      <View style={s.rowBetween}>
        <Txt bold>Charge du jour</Txt>
        <Txt bold size={14} color={color}>{LOAD_LABEL[level]}</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[s.segment, { backgroundColor: i <= filled ? color : colors.lineSoft }]} />
        ))}
      </View>
      <Txt size={14} color={level === 'trop' ? colors.warnDark : colors.muted} style={{ lineHeight: 20 }}>{message}</Txt>
    </View>
  );
}

const REPEAT_HINT = { none: '', daily: 'chaque jour', weekdays: 'lun – ven', weekly: 'chaque semaine' } as const;

export function EventRow({ occ, onPress, compact }: { occ: Occurrence; onPress: () => void; compact?: boolean }) {
  const { domain, toggleDone } = useCalendar();
  const e = occ.event;
  const cat = domain(e.category);
  const kinds = kindsOf(e);
  const task = kinds.includes('tache');
  const done = task && isDoneOn(e, occ.day);
  const time = e.start === null ? 'Journée' : minutesToLabel(e.start);
  const timeEnd = e.start === null ? null : minutesToLabel(endOf(e));
  const meta = [
    cat.label,
    task ? 'Tâche' : null,
    REPEAT_HINT[e.repeat] || null,
    e.reminders?.length ? `${e.reminders.length} rappel${e.reminders.length > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');
  const item = kinds.includes('objet') && e.item ? e.item : null;

  return (
    <View style={[s.eventRow, compact && s.eventRowCompact]}>
      {task ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? `Marquer « ${e.title} » comme non faite` : `Marquer « ${e.title} » comme faite`}
          onPress={() => toggleDone(e.id, occ.day)}
          hitSlop={8}
          style={[s.check, compact && s.checkCompact, done && s.checkOn]}
        >
          {done ? <Icon name="check" size={compact ? 14 : 16} color="#FFFFFF" /> : null}
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${time}, ${e.title}, ${meta}. Modifier`}
        onPress={onPress}
        style={({ pressed }) => [s.eventMain, pressed && { opacity: 0.6 }]}
      >
        <View style={{ width: compact ? 46 : 54 }}>
          <Txt bold size={compact ? 13 : 14} color={colors.muted}>{time}</Txt>
          {!compact && timeEnd ? <Txt size={12} color={colors.faint}>{timeEnd}</Txt> : null}
        </View>
        <View style={[s.catBar, { backgroundColor: cat.color }]} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt
            bold
            size={compact ? 14 : 15}
            numberOfLines={compact ? 1 : 2}
            color={done ? colors.faint : colors.ink}
            style={done ? { textDecorationLine: 'line-through' } : undefined}
          >
            {e.title}
          </Txt>
          {!compact ? <Txt size={13} color={colors.muted}>{meta}</Txt> : null}
          {item && !compact ? (
            <View style={s.itemLine}>
              <Icon name="briefcase" size={13} color={colors.warnDark} />
              <Txt size={13} color={colors.warnDark} style={{ flex: 1 }}>{item}</Txt>
            </View>
          ) : null}
        </View>
        {item && compact ? <Icon name="briefcase" size={14} color={colors.warnDark} /> : null}
        {e.repeat !== 'none' && compact ? <Icon name="repeat" size={14} color={colors.faint} /> : null}
        {!compact ? <Icon name="chevron-right" size={18} color={colors.faint} /> : null}
      </Pressable>
    </View>
  );
}

export function FreeSlotRow({ from, to, onPress }: { from: number; to: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Créneau libre de ${minutesToLabel(from)} à ${minutesToLabel(to)}. Ajouter un événement`}
      onPress={onPress}
      style={({ pressed }) => [s.freeSlot, pressed && { backgroundColor: colors.accentSoft }]}
    >
      <Txt size={13} color={colors.accent} style={{ width: 54 }}>{minutesToLabel(from)}</Txt>
      <View style={s.freeDash} />
      <Txt size={13} color={colors.accent} style={{ flex: 1 }}>
        Libre jusqu'à {minutesToLabel(to)} · {durationLabel(to - from)}
      </Txt>
      <Icon name="plus" size={16} color={colors.accent} />
    </Pressable>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ padding: 18 }}>
      <Txt size={14} color={colors.muted}>{text}</Txt>
    </View>
  );
}

export const s = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segment: { flex: 1, height: 10, borderRadius: 5 },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.lineSoft, minHeight: 60,
  },
  eventRowCompact: { paddingVertical: 8, minHeight: 44, gap: 10, paddingHorizontal: 14 },
  eventMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  checkCompact: { width: 24, height: 24, borderRadius: 7 },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  itemLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  catBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  freeSlot: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 44,
    borderBottomWidth: 1, borderBottomColor: colors.lineSoft, backgroundColor: '#FAFCFB',
  },
  freeDash: { width: 4, alignSelf: 'stretch', borderRadius: 2, borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed', marginVertical: 6 },
  badge: { borderRadius: radius.s, paddingHorizontal: 8, paddingVertical: 2 },
});
