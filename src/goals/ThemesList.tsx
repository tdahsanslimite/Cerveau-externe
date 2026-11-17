// « Mes thèmes » : le One Thing de l'année et une carte par thème choisi. Toucher un thème = entrer dedans (ThemeView).
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Card, Icon, IconButton, Txt } from '../ui';
import { useGoals } from './GoalsContext';
import { annualOneThing, effectiveLeading, THEME_FIELDS, themeInfo, ThemeId, themeProgress } from './model';

export function ThemesList({ year, onYear, onOpen }: { year: number; onYear: (y: number) => void; onOpen: (t: ThemeId) => void }) {
  const { years, chosen } = useGoals();
  const goals = years[String(year)];
  const one = annualOneThing(years, `${year}-06-15`, chosen);
  const leadingId = effectiveLeading(goals, chosen);
  const several = chosen.length > 1;

  return (
    <>
      <View style={st.yearRow}>
        <IconButton icon="chevron-left" label="Année précédente" onPress={() => onYear(year - 1)} />
        <Txt bold size={22} style={{ flex: 1, textAlign: 'center' }}>{year}</Txt>
        <IconButton icon="chevron-right" label="Année suivante" onPress={() => onYear(year + 1)} />
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
            {leadingId && !several
              ? `Écris le One Thing de « ${themeInfo(leadingId).label} » : il t’aidera à choisir l’action du jour.`
              : leadingId
              ? `Le thème « ${themeInfo(leadingId).label} » est en tête, mais son One Thing n’est pas encore écrit.`
              : 'Entre dans un thème et mets-le « en tête » : son One Thing t’aidera à choisir l’action du jour.'}
          </Txt>
        )}
      </Card>

      <View style={{ gap: 10 }}>
        {chosen.map(themeInfo).map((t) => {
          const card = goals?.themes[t.id];
          const done = themeProgress(card);
          const leading = leadingId === t.id;
          const goal = card?.goal?.trim();
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`${t.label}, ${done} champs sur ${THEME_FIELDS.length}${leading && several ? ', en tête' : ''}`}
              onPress={() => onOpen(t.id)}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Card style={[{ padding: 16, gap: 8 }, leading && several ? { borderColor: colors.accent, borderWidth: 2 } : null]}>
                <View style={st.head}>
                  <View style={st.iconWrap}><Icon name={t.icon} size={20} color={colors.accentDark} /></View>
                  <View style={{ flex: 1 }}>
                    <Txt bold size={17}>{t.label}</Txt>
                    <Txt size={13} color={colors.muted}>{t.tagline}</Txt>
                  </View>
                  {leading && several ? (
                    <View style={st.badge}><Txt bold size={12} color="#FFFFFF">En tête</Txt></View>
                  ) : null}
                  <Icon name="chevron-right" size={20} color={colors.muted} />
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
    </>
  );
}

const st = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leadCard: { padding: 16, gap: 8, backgroundColor: colors.accentSoft },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  badge: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
});
