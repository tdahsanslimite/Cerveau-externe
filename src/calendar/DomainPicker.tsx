// Choix du domaine : les domaines de premier niveau, puis (facultatif) une précision si le domaine a des sous-domaines.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Chip, Txt } from '../ui';
import { useCalendar } from './CalendarContext';
import { rootOf, subDomains, topDomains } from './model';

export function DomainPicker({ value, onChange, allowNone = false }: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  /** Propose « Aucun » (les idées n'ont pas toujours de domaine). */
  allowNone?: boolean;
}) {
  const { domains } = useCalendar();
  const root = value ? rootOf(domains, value) : undefined;
  const subs = root ? subDomains(domains, root) : [];
  const rootColor = domains.find((d) => d.id === root)?.color;

  return (
    <View style={{ gap: 12 }}>
      <View style={st.wrap}>
        {allowNone ? <Chip label="Aucun" selected={!value} color={colors.ink} onPress={() => onChange(undefined)} /> : null}
        {topDomains(domains).map((c) => (
          <Chip key={c.id} label={c.label} dot={c.color} color={colors.ink} selected={root === c.id} onPress={() => onChange(c.id)} />
        ))}
      </View>
      {subs.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Txt size={13} color={colors.muted}>Précision (facultatif)</Txt>
          <View style={st.wrap}>
            {subs.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                dot={rootColor}
                color={colors.ink}
                selected={value === s.id}
                onPress={() => onChange(value === s.id ? root : s.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
