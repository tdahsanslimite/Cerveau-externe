// Briques d'affichage des routines (liste cochable de l'écran Routines).
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, TOUCH } from '../theme';
import { Card, Icon, IconButton, SectionLabel, Txt } from '../ui';
import { DayKey, todayKey } from '../calendar/dates';
import { useRoutines } from './RoutinesContext';
import { canCheck, dayProgress, isDone, Moment, MOMENTS, Routine, routinesOn } from './model';

function RoutineRow({ routine, checked, disabled, onToggle, onEdit }: {
  routine: Routine; checked: boolean; disabled: boolean; onToggle: () => void; onEdit?: () => void;
}) {
  return (
    <View style={s.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={routine.title}
        accessibilityState={{ checked, disabled }}
        onPress={onToggle}
        disabled={disabled}
        style={({ pressed }) => [s.rowMain, pressed && { backgroundColor: colors.lineSoft }, disabled && { opacity: 0.55 }]}
      >
        <View style={[s.box, checked && s.boxOn]}>{checked ? <Icon name="check" size={18} color="#FFFFFF" /> : null}</View>
        <Txt size={16} bold={!checked} color={checked ? colors.muted : colors.ink} style={{ flex: 1 }}>{routine.title}</Txt>
      </Pressable>
      {onEdit ? <IconButton icon="more-horizontal" label={`Modifier ${routine.title}`} onPress={onEdit} bordered={false} color={colors.faint} /> : null}
    </View>
  );
}

/**
 * Liste cochable des routines d'un jour. Uniquement dans l'onglet Routines :
 * le calendrier n'affiche aucune routine.
 */
export function RoutineChecklist({ day, onEdit }: { day: DayKey; onEdit?: (r: Routine) => void }) {
  const { routines, done, toggle } = useRoutines();
  const due = routinesOn(routines, day);
  if (due.length === 0) {
    return (
      <View style={{ gap: 8 }}>
        <SectionLabel>Routines</SectionLabel>
        <Card style={{ padding: 18 }}>
          <Txt size={14} color={colors.muted}>Aucune routine prévue ce jour-là.</Txt>
        </Card>
      </View>
    );
  }

  const today = todayKey();
  const editable = canCheck(day, today);
  const progress = dayProgress(routines, done, day);
  const groups = MOMENTS.map((m) => ({ moment: m, items: due.filter((r) => r.moment === m.id) })).filter((g) => g.items.length > 0);
  const showHeads = groups.length > 1;

  return (
    <View style={{ gap: 8 }}>
      <SectionLabel right={<Txt size={13} color={colors.muted}>{progress.done} sur {progress.total}</Txt>}>Routines</SectionLabel>
      <Card>
        {groups.map((g) => (
          <View key={g.moment.id}>
            {showHeads ? <MomentHead moment={g.moment.id} /> : null}
            {g.items.map((r) => (
              <RoutineRow
                key={r.id}
                routine={r}
                checked={isDone(done, day, r.id)}
                disabled={!editable}
                onToggle={() => toggle(day, r.id)}
                onEdit={onEdit ? () => onEdit(r) : undefined}
              />
            ))}
          </View>
        ))}
      </Card>
      {!editable ? (
        <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4 }}>Tu pourras cocher ce jour-là quand il sera arrivé.</Txt>
      ) : null}
    </View>
  );
}

function MomentHead({ moment }: { moment: Moment }) {
  const label = MOMENTS.find((m) => m.id === moment)?.label ?? '';
  return (
    <View style={s.momentHead}>
      <Txt size={12} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.lineSoft, minHeight: 60 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingLeft: 16, paddingRight: 8 },
  box: {
    width: 28, height: 28, borderRadius: radius.s - 2, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  momentHead: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2, minHeight: TOUCH / 2 },
});
