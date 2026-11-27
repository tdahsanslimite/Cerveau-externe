// Champs d'une notification : moments (jusqu'à 3), son, couleur.
// Partagés par la fiche d'un événement et par la fenêtre « Pour ne pas oublier » (NotifPrompt).
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius, TOUCH } from '../theme';
import { Button, Chip, Icon, Txt } from '../ui';
import { ALERTS, MAX_REMINDERS, REMINDER_UNITS } from './model';
import type { AlertKind, Reminder } from './model';
import { NOTIF_COLORS } from './notifModels';

export function ReminderRows({ reminders, onChange }: { reminders: Reminder[]; onChange: (r: Reminder[]) => void }) {
  const set = (i: number, r: Partial<Reminder>) => onChange(reminders.map((x, j) => (j === i ? { ...x, ...r } : x)));
  return (
    <View style={{ gap: 8 }}>
      {reminders.map((r, i) => (
        <View key={i} style={st.row}>
          <TextInput
            accessibilityLabel={`Rappel ${i + 1}, durée`}
            keyboardType="number-pad"
            value={String(r.amount)}
            onChangeText={(t) => set(i, { amount: Math.max(1, Math.min(999, parseInt(t.replace(/\D/g, ''), 10) || 1)) })}
            style={st.amount}
            maxLength={3}
          />
          <View style={st.units}>
            {REMINDER_UNITS.map((u) => (
              <Pressable
                key={u.id}
                accessibilityRole="button"
                accessibilityState={{ selected: r.unit === u.id }}
                onPress={() => set(i, { unit: u.id })}
                style={[st.unit, r.unit === u.id && st.unitOn]}
              >
                <Txt bold={r.unit === u.id} size={13} color={r.unit === u.id ? colors.ink : colors.muted}>{u.label}</Txt>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Retirer le rappel ${i + 1}`}
            onPress={() => onChange(reminders.filter((_, j) => j !== i))}
            style={st.remove}
          >
            <Icon name="x" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      {reminders.length < MAX_REMINDERS ? (
        <Button
          label={reminders.length ? 'Ajouter un autre moment' : 'Ajouter un moment'}
          kind="ghost"
          icon="bell"
          onPress={() => onChange([...reminders, reminders.length === 0 ? { amount: 30, unit: 'min' } : { amount: 1, unit: 'j' }])}
        />
      ) : null}
    </View>
  );
}

export function AlertChips({ value, onChange, defaultAlert }: { value: AlertKind; onChange: (a: AlertKind) => void; defaultAlert?: AlertKind }) {
  return (
    <View style={st.wrap}>
      {ALERTS.map((a) => (
        <Chip key={a.id} label={a.id === defaultAlert ? `${a.label} (par défaut)` : a.label} selected={value === a.id} onPress={() => onChange(a.id)} />
      ))}
    </View>
  );
}

export function ColorChips({ value, onChange }: { value: string | undefined; onChange: (c: string) => void }) {
  return (
    <View style={st.wrap}>
      {NOTIF_COLORS.map((c) => (
        <Chip key={c.id} label={c.label} dot={c.id} color={c.id} selected={value === c.id} onPress={() => onChange(c.id)} />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: {
    width: 64, minHeight: 48, borderRadius: radius.m, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 6, textAlign: 'center', fontFamily: fonts.regular, fontSize: 16, color: colors.ink,
  },
  units: { flex: 1, flexDirection: 'row', backgroundColor: '#EAE7E0', borderRadius: radius.m, padding: 3, gap: 3 },
  unit: { flex: 1, minHeight: 42, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
  unitOn: { backgroundColor: colors.card },
  remove: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
