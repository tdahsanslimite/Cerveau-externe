// Le blason : 7 encarts (devise, rêves, obstacles, valeurs, « entre moi et… », talents, ressources).
// On touche un encart pour le remplir ou le corriger ; enregistrement automatique.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Card, Icon, Sheet, Txt } from '../ui';
import { useGoals } from './GoalsContext';
import { TextBlock } from './fields';
import { BLASON, BlasonId, blasonCount, linesOf } from './model';

export function BlasonView() {
  const { blason, blasonText } = useGoals();
  const [open, setOpen] = useState<BlasonId | null>(null);
  const count = blasonCount(blason);
  const current = BLASON.find((b) => b.id === open);

  return (
    <>
      <View style={{ gap: 4, paddingHorizontal: 4 }}>
        <Txt size={14} color={colors.muted} style={{ lineHeight: 21 }}>
          Avant de fixer des objectifs, sais qui tu es : tes forces, tes freins, ce qui compte pour toi. Touche un encart pour le remplir.
        </Txt>
        <Txt bold size={13} color={count === BLASON.length ? colors.accent : colors.muted}>
          {`${count} / ${BLASON.length} encarts remplis`}
        </Txt>
      </View>

      {BLASON.map((b) => {
        const lines = linesOf(blason[b.id]);
        const wide = b.id === 'devise';
        return (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityLabel={`${b.label}, ${lines.length ? 'rempli' : 'vide'}`}
            onPress={() => setOpen(b.id)}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Card style={{ padding: 16, gap: 8 }}>
              <View style={st.head}>
                <Txt bold size={17} style={{ flex: 1 }}>{b.label}</Txt>
                <Icon name={lines.length ? 'edit-2' : 'plus'} size={18} color={colors.muted} />
              </View>
              {lines.length === 0 ? (
                <Txt size={14} color={colors.faint}>{b.hint}</Txt>
              ) : wide ? (
                <Txt size={16} style={{ lineHeight: 24 }}>{lines.join(' ')}</Txt>
              ) : (
                <View style={{ gap: 4 }}>
                  {lines.map((l, i) => (
                    <View key={i} style={st.line}>
                      <Txt size={16} color={colors.accent}>•</Txt>
                      <Txt size={16} style={{ flex: 1, lineHeight: 23 }}>{l}</Txt>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </Pressable>
        );
      })}

      <Sheet visible={!!current} onClose={() => setOpen(null)} title={current?.label ?? ''}>
        {current ? (
          <TextBlock
            label={current.label}
            hint={current.hint}
            value={blason[current.id] ?? ''}
            onChange={(t) => blasonText(current.id, t)}
            placeholder={current.placeholder}
            lines={current.id === 'devise' ? 3 : 6}
          />
        ) : null}
        <Txt size={12} color={colors.faint}>Enregistré automatiquement, uniquement sur ce téléphone.</Txt>
      </Sheet>
    </>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  line: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: radius.s },
});
