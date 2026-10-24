// Les objectifs de l'année : 5 thèmes, une fiche chacun (objectif, One Thing, identité, à faire, à éviter, bilan).
// Un seul thème peut être « en tête » : son One Thing oriente l'action du jour.
// Mindset et Santé affichent en plus les moyennes de leur note du Journal (aucune saisie en plus).
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Button, Card, Icon, IconButton, Sheet, Txt } from '../ui';
import { useJournal } from '../journal/JournalContext';
import { formatScore } from '../journal/model';
import { tone } from '../journal/DayEditor';
import { todayKey } from '../calendar/dates';
import { useGoals } from './GoalsContext';
import { TextBlock } from './fields';
import { annualOneThing, THEME_FIELDS, themeIndicator, themeInfo, ThemeId, themeProgress, THEMES } from './model';

export function YearView() {
  const { years, themeText, lead } = useGoals();
  const { entries } = useJournal();
  const today = todayKey();
  const [year, setYear] = useState(today.slice(0, 4));
  const [open, setOpen] = useState<ThemeId | null>(null);

  const goals = years[year];
  const one = annualOneThing(years, `${year}-06-15`);
  const leadingId = goals?.leading;
  const info = open ? themeInfo(open) : null;
  const indicator = open ? themeIndicator(entries, open, today) : null;
  const shift = (n: number) => setYear(String(Number(year) + n));

  return (
    <>
      <View style={st.yearRow}>
        <IconButton icon="chevron-left" label="Année précédente" onPress={() => shift(-1)} />
        <Txt bold size={22} style={{ flex: 1, textAlign: 'center' }}>{year}</Txt>
        <IconButton icon="chevron-right" label="Année suivante" onPress={() => shift(1)} />
      </View>

      <Card style={[st.leadCard, one ? { borderColor: colors.accent } : null]}>
        <View style={st.head}>
          <Icon name="star" size={18} color={colors.accentDark} />
          <Txt bold size={13} color={colors.accentDark} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            The One Thing de l’année
          </Txt>
        </View>
        {one ? (
          <>
            <Txt bold size={18} style={{ lineHeight: 26 }}>{one.text}</Txt>
            <Txt size={13} color={colors.muted}>{`Thème en tête : ${themeInfo(one.theme).label}. Il oriente ton action du jour.`}</Txt>
          </>
        ) : (
          <Txt size={14} color={colors.muted} style={{ lineHeight: 21 }}>
            {leadingId
              ? `Le thème « ${themeInfo(leadingId).label} » est en tête, mais son One Thing n’est pas encore écrit.`
              : 'Choisis un thème « en tête » et écris son One Thing : il t’aidera à choisir l’action du jour.'}
          </Txt>
        )}
      </Card>

      <View style={{ gap: 10 }}>
        {THEMES.map((t) => {
          const card = goals?.themes[t.id];
          const done = themeProgress(card);
          const leading = leadingId === t.id;
          const goal = card?.goal?.trim();
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`${t.label}, ${done} champs sur ${THEME_FIELDS.length}${leading ? ', en tête' : ''}`}
              onPress={() => setOpen(t.id)}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Card style={[{ padding: 16, gap: 8 }, leading ? { borderColor: colors.accent, borderWidth: 2 } : null]}>
                <View style={st.head}>
                  <View style={st.iconWrap}><Icon name={t.icon} size={20} color={colors.accentDark} /></View>
                  <View style={{ flex: 1 }}>
                    <Txt bold size={17}>{t.label}</Txt>
                    <Txt size={13} color={colors.muted}>{t.tagline}</Txt>
                  </View>
                  {leading ? (
                    <View style={st.badge}><Txt bold size={12} color="#FFFFFF">En tête</Txt></View>
                  ) : null}
                  <Txt bold size={13} color={colors.muted}>{`${done}/${THEME_FIELDS.length}`}</Txt>
                </View>
                {goal ? (
                  <Txt size={15} numberOfLines={2} style={{ lineHeight: 22 }}>{goal}</Txt>
                ) : (
                  <Txt size={14} color={colors.faint}>Pas encore d’objectif pour ce thème.</Txt>
                )}
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Sheet
        visible={!!info}
        onClose={() => setOpen(null)}
        title={info ? `${info.label} · ${year}` : ''}
      >
        {info ? (
          <>
            <Txt size={14} color={colors.muted}>{info.tagline}</Txt>

            {indicator ? (
              <Card style={{ padding: 14, gap: 8 }}>
                <Txt bold size={14}>{`Indicateur : ${indicator.label}`}</Txt>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Avg label="7 derniers jours" value={indicator.avg7} />
                  <Avg label="30 derniers jours" value={indicator.avg30} />
                </View>
                <Txt size={12} color={colors.faint}>Moyenne de ta note du Journal, sur 10. Rien à saisir ici.</Txt>
              </Card>
            ) : null}

            <Button
              label={leadingId === info.id ? 'Retirer de la tête' : 'Mettre ce thème en tête'}
              icon="star"
              kind={leadingId === info.id ? 'ghost' : 'primary'}
              onPress={() => lead(year, info.id)}
            />
            <Txt size={12} color={colors.faint} style={{ marginTop: -10 }}>
              Un seul thème en tête à la fois : c’est son One Thing qui s’affiche au-dessus de « Trier mes idées ».
            </Txt>

            {THEME_FIELDS.map((f) => (
              <TextBlock
                key={f.id}
                label={f.label}
                hint={f.hint}
                value={goals?.themes[info.id]?.[f.id] ?? ''}
                onChange={(t) => themeText(year, info.id, f.id, t)}
                placeholder={f.placeholder}
                lines={f.lines}
              />
            ))}
            <Txt size={12} color={colors.faint}>Enregistré automatiquement, uniquement sur ce téléphone.</Txt>
          </>
        ) : null}
      </Sheet>
    </>
  );
}

function Avg({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={st.avg}>
      <Txt size={12} color={colors.muted}>{label}</Txt>
      <Txt bold size={26} color={value === null ? colors.faint : tone(Math.round(value))}>
        {value === null ? '–' : formatScore(value)}
      </Txt>
    </View>
  );
}

const st = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leadCard: { padding: 16, gap: 8, backgroundColor: colors.accentSoft },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  badge: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  avg: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.m, padding: 10, gap: 2 },
});
