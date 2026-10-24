// La fiche d'un jour : 3 notes de 1 à 10, chacune avec son commentaire. Enregistrement automatique.
// Partagée par l'onglet Journal (le jour du jour) et par le Recap (revoir / corriger un jour passé).
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Card, Txt } from '../ui';
import type { DayKey } from '../calendar/dates';
import { useJournal } from './JournalContext';
import { baseline, FIELD_LABEL, FIELDS, formatScore, isScore, noteOf, relativeTo, SCORE_MAX } from './model';
import type { ScoreField } from './model';

/** Texte propre à chaque note : question posée, repères 1 et 10, aide du commentaire. */
const COPY: Record<ScoreField, { hint: string; low: string; high: string; placeholder: string }> = {
  mood: {
    hint: "Est-ce que j'ai passé une bonne journée ?",
    low: 'mauvaise journée',
    high: 'très bonne journée',
    placeholder: "Ce que j'ai fait… ou pas fait.",
  },
  mind: {
    hint: 'Est-ce que je me sens bien dans ma tête ?',
    low: 'pas bien du tout',
    high: 'très bien',
    placeholder: 'Ce que je pense, ce que je ressens.',
  },
  body: {
    hint: 'Est-ce que je me sens en forme ?',
    low: 'pas en forme',
    high: 'en pleine forme',
    placeholder: 'Fatigue, douleurs, sommeil, énergie…',
  },
};

/** Couleur d'une note : basse = orange, milieu = ambre, haute = vert-bleu (le chiffre reste toujours écrit). */
export function tone(n: number): string {
  if (n <= 4) return colors.warn;
  if (n <= 7) return colors.amber;
  return colors.accent;
}

const SCORE_ROWS = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];

export function DayEditor({ day }: { day: DayKey }) {
  const { entries, score, note } = useJournal();
  const entry = entries[day] ?? {};
  return (
    <>
      {FIELDS.map((f) => (
        <ScoreBlock
          key={f}
          field={f}
          value={entry[f]}
          base={baseline(entries, day, f)}
          note={noteOf(entry, f)}
          onPick={(n) => score(day, f, n)}
          onNote={(t) => note(day, f, t)}
        />
      ))}
      <Txt size={12} color={colors.faint}>Enregistré automatiquement, uniquement sur ce téléphone.</Txt>
    </>
  );
}

function ScoreBlock({ field, value, base, note, onPick, onNote }: {
  field: ScoreField; value: number | undefined; base: number | null; note: string;
  onPick: (n: number) => void; onNote: (text: string) => void;
}) {
  const copy = COPY[field];
  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Txt bold size={18}>{FIELD_LABEL[field]}</Txt>
        <Txt size={13} color={colors.muted}>{copy.hint}</Txt>
      </View>
      <View style={{ gap: 8 }}>
        {SCORE_ROWS.map((row, i) => (
          <View key={i} style={st.scoreLine}>
            {row.map((n) => {
              const on = value === n;
              return (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`${FIELD_LABEL[field]} : ${n} sur ${SCORE_MAX}`}
                  accessibilityState={{ selected: on }}
                  onPress={() => onPick(n)}
                  style={({ pressed }) => [
                    st.scoreBtn,
                    on && { backgroundColor: tone(n), borderColor: tone(n) },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Txt bold size={18} color={on ? '#FFFFFF' : colors.ink}>{n}</Txt>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View style={st.scoreEnds}>
        <Txt size={12} color={colors.muted}>{`1 = ${copy.low}`}</Txt>
        <Txt size={12} color={colors.muted}>{`10 = ${copy.high}`}</Txt>
      </View>
      <Relative value={value} base={base} />
      <TextInput
        accessibilityLabel={`Commentaire : ${FIELD_LABEL[field]}`}
        value={note}
        onChangeText={onNote}
        multiline
        placeholder={copy.placeholder}
        placeholderTextColor={colors.faint}
        textAlignVertical="top"
        style={st.noteInput}
      />
    </Card>
  );
}

/** Une phrase qui remet la note du jour en perspective par rapport aux jours d'avant. */
function Relative({ value, base }: { value: number | undefined; base: number | null }) {
  if (!isScore(value)) return null;
  if (base === null) {
    return <Txt size={13} color={colors.faint}>Dès 3 jours notés, je compare à ta moyenne.</Txt>;
  }
  const rel = relativeTo(value, base);
  const avg = formatScore(base);
  const text =
    rel === 'above' ? `Mieux que d'habitude (moyenne ${avg} sur 30 jours). Note ce qui t'a aidé.`
    : rel === 'below' ? `Plus dur que d'habitude (moyenne ${avg} sur 30 jours). Un jour ne fait pas la tendance : note ce qui a pesé.`
    : `Dans ta moyenne (${avg} sur 30 jours).`;
  return <Txt size={13} color={colors.muted} style={{ lineHeight: 19 }}>{text}</Txt>;
}

const st = StyleSheet.create({
  scoreLine: { flexDirection: 'row', gap: 8 },
  scoreBtn: {
    flex: 1, minHeight: 52, borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  noteInput: {
    minHeight: 96, borderRadius: radius.m, borderWidth: 1, borderColor: colors.paperLine, backgroundColor: colors.paper,
    padding: 12, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.ink,
  },
});
