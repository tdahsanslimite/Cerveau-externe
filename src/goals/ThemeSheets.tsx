// Fenêtres de l'onglet Objectifs :
// - FirstThemeSheet : à la première visite, on choisit UN seul thème (17 nov., Valentin) ;
// - ThemesSheet : réglages (bouton en haut à gauche) pour ajouter ou retirer des thèmes ;
// - WeekSheet : à chaque entrée dans l'onglet, les objectifs de la semaine en cours, avant de se lancer dans autre chose.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { isoWeek, labelWeekRange, todayKey } from '../calendar/dates';
import { colors, radius } from '../theme';
import { Button, Icon, Sheet, Txt } from '../ui';
import { AnnualOneThingLine } from './GoalLines';
import { useGoals } from './GoalsContext';
import { linesOf, themeInfo, ThemeId, THEMES, weekGoals } from './model';

function ThemeRow({ id, selected, onPress, locked }: { id: ThemeId; selected: boolean; onPress: () => void; locked?: boolean }) {
  const t = themeInfo(id);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: locked }}
      accessibilityLabel={`${t.label}, ${t.tagline}`}
      onPress={onPress}
      style={({ pressed }) => [st.row, selected && st.rowOn, pressed && { opacity: 0.7 }]}
    >
      <View style={st.iconWrap}><Icon name={t.icon} size={20} color={colors.accentDark} /></View>
      <View style={{ flex: 1 }}>
        <Txt bold size={17}>{t.label}</Txt>
        <Txt size={13} color={colors.muted}>{t.tagline}</Txt>
      </View>
      <Icon name={selected ? 'check-circle' : 'circle'} size={24} color={selected ? colors.accent : colors.faint} />
    </Pressable>
  );
}

/** Premier choix : un seul thème. On ne peut pas fermer sans choisir. */
export function FirstThemeSheet({ visible }: { visible: boolean }) {
  const { chooseFirst } = useGoals();
  const [pick, setPick] = useState<ThemeId | null>(null);
  return (
    <Sheet
      visible={visible}
      closable={false}
      onClose={() => {}}
      title="Par quoi commencer ?"
      footer={<Button label="C’est mon thème" icon="check" onPress={() => pick && chooseFirst(pick)} kind={pick ? 'primary' : 'ghost'} />}
    >
      <Txt size={15} color={colors.muted} style={{ lineHeight: 22 }}>
        Choisis un seul thème pour commencer. Tu pourras en ajouter d’autres plus tard avec le bouton réglages.
      </Txt>
      <View style={{ gap: 10 }}>
        {THEMES.map((t) => <ThemeRow key={t.id} id={t.id} selected={pick === t.id} onPress={() => setPick(t.id)} />)}
      </View>
    </Sheet>
  );
}

/** Réglages : ajouter ou retirer des thèmes. Le dernier ne se retire pas. Retirer ne supprime rien. */
export function ThemesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { chosen, toggleTheme } = useGoals();
  return (
    <Sheet visible={visible} onClose={onClose} title="Mes thèmes" footer={<Button label="Terminé" onPress={onClose} />}>
      <Txt size={14} color={colors.muted} style={{ lineHeight: 21 }}>
        Coche les thèmes sur lesquels tu veux avancer. Un thème retiré garde ses fiches : elles reviennent si tu le recoches.
      </Txt>
      <View style={{ gap: 10 }}>
        {THEMES.map((t) => {
          const on = chosen.includes(t.id);
          const locked = on && chosen.length === 1;
          return <ThemeRow key={t.id} id={t.id} selected={on} locked={locked} onPress={() => toggleTheme(t.id)} />;
        })}
      </View>
      {chosen.length === 1 ? (
        <Txt size={12} color={colors.faint}>Il faut garder au moins un thème.</Txt>
      ) : null}
    </Sheet>
  );
}

/** Les objectifs de la semaine en cours, thème par thème. `onEdit` ouvre la fiche Semaine du thème. */
export function WeekSheet({ visible, onClose, onEdit }: { visible: boolean; onClose: () => void; onEdit: (theme: ThemeId) => void }) {
  const { themePeriods, chosen } = useGoals();
  const today = todayKey();
  const goals = weekGoals(themePeriods, chosen, today);
  const missing = chosen.filter((t) => !goals.some((g) => g.theme === t));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Ta semaine ${isoWeek(today)}`}
      footer={
        goals.length > 0
          ? <Button label="C’est parti" icon="arrow-right" onPress={onClose} />
          : <Button label="Fixer mes objectifs de la semaine" icon="edit-2" onPress={() => onEdit(chosen[0])} />
      }
    >
      <Txt size={14} color={colors.muted}>{labelWeekRange(today)}</Txt>
      <AnnualOneThingLine day={today} />

      {goals.length === 0 ? (
        <Txt size={15} color={colors.muted} style={{ lineHeight: 22 }}>
          Tu n’as pas encore fixé tes objectifs pour cette semaine.
        </Txt>
      ) : (
        goals.map((g) => (
          <View key={g.theme} style={st.goal}>
            <View style={st.goalHead}>
              <Icon name={themeInfo(g.theme).icon} size={18} color={colors.accentDark} />
              <Txt bold size={13} color={colors.accentDark} style={{ flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {themeInfo(g.theme).label}
              </Txt>
              <Pressable accessibilityRole="button" accessibilityLabel={`Modifier ${themeInfo(g.theme).label}`} onPress={() => onEdit(g.theme)} hitSlop={10}>
                <Icon name="edit-2" size={16} color={colors.muted} />
              </Pressable>
            </View>
            {g.who ? <Txt bold size={17} style={{ lineHeight: 24 }}>{g.who}</Txt> : null}
            {g.todo ? <Bullets label="À faire" text={g.todo} /> : null}
            {g.avoid ? <Bullets label="À éviter" text={g.avoid} /> : null}
          </View>
        ))
      )}

      {goals.length > 0 && missing.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => onEdit(missing[0])} style={st.missing}>
          <Txt size={14} color={colors.accent} bold>
            {`Rien encore pour ${missing.map((t) => themeInfo(t).label).join(', ')} cette semaine`}
          </Txt>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

function Bullets({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Txt size={12} color={colors.muted}>{label}</Txt>
      {linesOf(text).map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          <Txt size={15} color={colors.accent}>•</Txt>
          <Txt size={15} style={{ flex: 1, lineHeight: 22 }}>{l}</Txt>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 12,
    borderRadius: radius.m, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
  rowOn: { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.accentSoft },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  goal: { gap: 8, padding: 14, borderRadius: radius.m, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  missing: { minHeight: 44, justifyContent: 'center' },
});
